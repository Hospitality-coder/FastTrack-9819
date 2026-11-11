import { z } from "zod";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped, ensureProfile } from "../middleware/device";
import { DATE_RE, addDays, dateRange } from "../lib/dates";
import { analyzeFoodImage } from "../agent/food-vision";

const mealEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);

const entryInput = z.object({
  date: z.string().regex(DATE_RE),
  meal: mealEnum,
  name: z.string().min(1).max(120),
  photoUrl: z.string().url().nullable().optional(),
  portion: z.string().max(60).nullable().optional(),
  calories: z.number().min(0).max(20000),
  protein: z.number().min(0).max(2000),
  carbs: z.number().min(0).max(2000),
  sugar: z.number().min(0).max(2000),
  fat: z.number().min(0).max(2000),
  fiber: z.number().min(0).max(500),
  source: z.enum(["scan", "manual"]).default("manual"),
  aiRaw: z.unknown().optional(),
});

export async function totalsForDate(deviceId: string, date: string) {
  const [row] = await db
    .select({
      calories: sql<number>`coalesce(sum(${schema.foodEntries.calories}), 0)`,
      protein: sql<number>`coalesce(sum(${schema.foodEntries.protein}), 0)`,
      carbs: sql<number>`coalesce(sum(${schema.foodEntries.carbs}), 0)`,
      sugar: sql<number>`coalesce(sum(${schema.foodEntries.sugar}), 0)`,
      fat: sql<number>`coalesce(sum(${schema.foodEntries.fat}), 0)`,
      fiber: sql<number>`coalesce(sum(${schema.foodEntries.fiber}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(schema.foodEntries)
    .where(and(eq(schema.foodEntries.deviceId, deviceId), eq(schema.foodEntries.date, date)));
  return {
    calories: Math.round(row?.calories ?? 0),
    protein: Math.round(row?.protein ?? 0),
    carbs: Math.round(row?.carbs ?? 0),
    sugar: Math.round(row?.sugar ?? 0),
    fat: Math.round(row?.fat ?? 0),
    fiber: Math.round(row?.fiber ?? 0),
    count: row?.count ?? 0,
  };
}

export const food = {
  /** Run the vision model on an uploaded photo. Nothing is saved — the client reviews and then calls create. */
  analyze: deviceScoped
    .input(z.object({ imageUrl: z.string().url(), hint: z.string().max(200).optional() }))
    .handler(async ({ input }) => {
      try {
        return await analyzeFoodImage(input.imageUrl, input.hint);
      } catch (err) {
        console.error("food.analyze failed", err);
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Couldn't analyse that photo. Try a clearer shot or enter it manually.",
        });
      }
    }),

  create: deviceScoped.input(entryInput).handler(async ({ context, input }) => {
    const [row] = await db
      .insert(schema.foodEntries)
      .values({ ...input, deviceId: context.deviceId })
      .returning();
    return row!;
  }),

  update: deviceScoped
    .input(entryInput.partial().extend({ id: z.number() }))
    .handler(async ({ context, input }) => {
      const { id, ...patch } = input;
      const [row] = await db
        .update(schema.foodEntries)
        .set(patch)
        .where(and(eq(schema.foodEntries.id, id), eq(schema.foodEntries.deviceId, context.deviceId)))
        .returning();
      if (!row) throw new ORPCError("NOT_FOUND");
      return row;
    }),

  delete: deviceScoped.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db
      .delete(schema.foodEntries)
      .where(and(eq(schema.foodEntries.id, input.id), eq(schema.foodEntries.deviceId, context.deviceId)));
    return { ok: true };
  }),

  byDate: deviceScoped.input(z.object({ date: z.string().regex(DATE_RE) })).handler(async ({ context, input }) => {
    const [entries, totals, prof] = await Promise.all([
      db
        .select()
        .from(schema.foodEntries)
        .where(and(eq(schema.foodEntries.deviceId, context.deviceId), eq(schema.foodEntries.date, input.date)))
        .orderBy(desc(schema.foodEntries.loggedAt)),
      totalsForDate(context.deviceId, input.date),
      ensureProfile(context.deviceId),
    ]);
    return {
      entries,
      totals,
      targets: {
        calories: prof.calorieTarget,
        protein: prof.proteinTarget,
        carbs: prof.carbTarget,
        sugar: prof.sugarTarget,
      },
    };
  }),

  /** Per-day totals for the last N days ending at `today`. */
  weekSummary: deviceScoped
    .input(z.object({ today: z.string().regex(DATE_RE), days: z.number().int().min(1).max(31).default(7) }))
    .handler(async ({ context, input }) => {
      const from = addDays(input.today, -(input.days - 1));
      const rows = await db
        .select({
          date: schema.foodEntries.date,
          calories: sql<number>`coalesce(sum(${schema.foodEntries.calories}), 0)`,
          protein: sql<number>`coalesce(sum(${schema.foodEntries.protein}), 0)`,
          carbs: sql<number>`coalesce(sum(${schema.foodEntries.carbs}), 0)`,
          sugar: sql<number>`coalesce(sum(${schema.foodEntries.sugar}), 0)`,
        })
        .from(schema.foodEntries)
        .where(
          and(
            eq(schema.foodEntries.deviceId, context.deviceId),
            gte(schema.foodEntries.date, from),
            lte(schema.foodEntries.date, input.today),
          ),
        )
        .groupBy(schema.foodEntries.date);
      const map = new Map(rows.map((r) => [r.date, r]));
      return dateRange(from, input.today).map((d) => {
        const r = map.get(d);
        return {
          date: d,
          calories: Math.round(r?.calories ?? 0),
          protein: Math.round(r?.protein ?? 0),
          carbs: Math.round(r?.carbs ?? 0),
          sugar: Math.round(r?.sugar ?? 0),
        };
      });
    }),
};
