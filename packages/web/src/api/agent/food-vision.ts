import { generateObject } from "ai";
import dedent from "dedent";
import { z } from "zod";
import { gateway } from "./gateway";

const itemSchema = z.object({
  name: z.string().describe("Short food name, e.g. 'Grilled chicken breast'"),
  portion: z.string().describe("Estimated portion in metric, e.g. '150 g' or '250 ml'"),
  calories: z.number().describe("kcal"),
  protein: z.number().describe("grams"),
  carbs: z.number().describe("grams, total carbohydrate"),
  sugar: z.number().describe("grams, included in carbs"),
  fat: z.number().describe("grams"),
  fiber: z.number().describe("grams"),
});

export const foodAnalysisSchema = z.object({
  isFood: z.boolean().describe("false if the image clearly does not contain food or drink"),
  mealName: z.string().describe("A short name for the whole plate, e.g. 'Chicken rice bowl'"),
  items: z.array(itemSchema).min(0).max(12),
  totals: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    sugar: z.number(),
    fat: z.number(),
    fiber: z.number(),
  }),
  portionSizeLabel: z.enum(["small", "medium", "large", "extra-large"]),
  confidence: z.number().min(0).max(1).describe("0-1 confidence in the estimate"),
  notes: z.string().describe("One sentence: assumptions made or what to check"),
  healthScore: z.number().min(1).max(10).describe("1-10 overall healthiness for a typical adult"),
});

export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>;

const SYSTEM = dedent`
  You are a registered-dietitian-grade food recognition engine inside a fasting & nutrition tracker.
  Given a photo of a meal, identify every distinct food/drink item, estimate the portion in METRIC
  units (grams / millilitres) using visual cues (plate size ~27 cm, cutlery, hands, packaging), and
  estimate nutrition per item using standard food-composition data (USDA / McCance style).
  Rules:
  - Be realistic, not conservative: restaurant portions are large; home plates are medium.
  - Sugar is a subset of carbs. Fiber is a subset of carbs. Never let sugar > carbs.
  - totals must equal the sum of items (round to whole numbers).
  - If the image is not food, set isFood=false, items=[], totals all 0, confidence 0.
  - Keep names short and in plain English. Keep notes to one sentence.
`;

export async function analyzeFoodImage(imageUrl: string, hint?: string): Promise<FoodAnalysis> {
  // The gateway rejects URL parts — fetch the bytes and send them inline.
  const res = await fetch(imageUrl, { headers: { "User-Agent": "FastTrack/1.0 (food-scan)" } });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const mediaType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const bytes = new Uint8Array(await res.arrayBuffer());

  const { object } = await generateObject({
    model: gateway("google/gemini-3-flash"),
    schema: foodAnalysisSchema,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image: bytes, mediaType },
          {
            type: "text",
            text: hint
              ? `Analyse this meal. User note: "${hint}".`
              : "Analyse this meal and return the structured nutrition estimate.",
          },
        ],
      },
    ],
  });

  // Normalise: enforce invariants the model can drift on.
  const items = object.items.map((i) => ({
    ...i,
    sugar: Math.min(i.sugar, i.carbs),
    fiber: Math.min(i.fiber, i.carbs),
  }));
  const sum = (k: keyof (typeof items)[number]) =>
    Math.round(items.reduce((a, i) => a + (Number(i[k]) || 0), 0));
  const totals =
    items.length > 0
      ? {
          calories: sum("calories"),
          protein: sum("protein"),
          carbs: sum("carbs"),
          sugar: sum("sugar"),
          fat: sum("fat"),
          fiber: sum("fiber"),
        }
      : object.totals;

  return { ...object, items, totals };
}
