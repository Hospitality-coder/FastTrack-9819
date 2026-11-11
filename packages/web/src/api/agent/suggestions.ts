import { generateObject } from "ai";
import dedent from "dedent";
import { z } from "zod";
import { gateway } from "./gateway";
import type { SuggestionItem } from "../database/schema";

const schema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().describe("Dish name, max 5 words"),
        description: z.string().describe("One sentence, what's in it and how to make it fast"),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        sugar: z.number(),
        tags: z.array(z.string()).max(3).describe("e.g. 'high-protein', 'low-sugar', '10 min'"),
        whyForYou: z.string().describe("One short motivating sentence tying it to the user's numbers today"),
      }),
    )
    .length(4),
});

export type SuggestionContext = {
  goal: "lose" | "maintain" | "gain";
  targets: { calories: number; protein: number; carbs: number; sugar: number };
  consumed: { calories: number; protein: number; carbs: number; sugar: number };
  fasting: { active: boolean; hoursLeft: number | null; protocol: string | null };
  localHour: number;
  recentFoods: string[];
  seed: number;
};

const SYSTEM = dedent`
  You are the nutrition coach inside "FastTrack", an intermittent-fasting app with a neon-green ninja
  vibe. Suggest 4 healthy, realistic meals or snacks for the rest of today. Keep the tone short,
  energetic and motivating (light ninja flavour is welcome, never cheesy or preachy).
  Rules:
  - Fit the REMAINING macro budget (targets minus consumed). If the user is over budget, suggest very
    light options and say so kindly.
  - If a fast is active, phrase suggestions as "when your window opens".
  - Match the time of day (morning → breakfast-style, evening → dinner/snack).
  - Avoid repeating recentFoods. Use whole foods, high protein, low added sugar. Metric units.
  - Vary cuisines. Keep each description to one sentence.
`;

export async function generateSuggestions(ctx: SuggestionContext): Promise<SuggestionItem[]> {
  const remaining = {
    calories: ctx.targets.calories - ctx.consumed.calories,
    protein: ctx.targets.protein - ctx.consumed.protein,
    carbs: ctx.targets.carbs - ctx.consumed.carbs,
    sugar: ctx.targets.sugar - ctx.consumed.sugar,
  };

  const { object } = await generateObject({
    model: gateway("anthropic/claude-haiku-4.5"),
    schema,
    system: SYSTEM,
    prompt: dedent`
      Goal: ${ctx.goal} weight.
      Local hour: ${ctx.localHour}:00.
      Targets today: ${JSON.stringify(ctx.targets)}
      Consumed so far: ${JSON.stringify(ctx.consumed)}
      Remaining budget: ${JSON.stringify(remaining)}
      Fasting: ${ctx.fasting.active ? `active (${ctx.fasting.protocol}), ${ctx.fasting.hoursLeft?.toFixed(1)}h left` : "not fasting"}
      Recently eaten (avoid): ${ctx.recentFoods.length ? ctx.recentFoods.join(", ") : "nothing logged"}
      Variation seed: ${ctx.seed}
    `,
  });

  return object.items;
}
