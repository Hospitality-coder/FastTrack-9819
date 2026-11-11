import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped, ensureProfile } from "../middleware/device";
import { DATE_RE, addDays } from "../lib/dates";
import { totalsForDate } from "./food";
import { generateSuggestions } from "../agent/suggestions";

const input = z.object({
  date: z.string().regex(DATE_RE),
  localHour: z.number().int().min(0).max(23),
});

async function buildAndStore(deviceId: string, date: string, localHour: number) {
  const [prof, consumed, activeFast, recent] = await Promise.all([
    ensureProfile(deviceId),
    totalsForDate(deviceId, date),
    db
      .select()
      .from(schema.fasts)
      .where(and(eq(schema.fasts.deviceId, deviceId), eq(schema.fasts.status, "active")))
      .limit(1),
    db
      .select({ name: schema.foodEntries.name })
      .from(schema.foodEntries)
      .where(and(eq(schema.foodEntries.deviceId, deviceId), gte(schema.foodEntries.date, addDays(date, -2))))
      .orderBy(desc(schema.foodEntries.loggedAt))
      .limit(12),
  ]);

  const fast = activeFast[0];
  let items;
  try {
    items = await generateSuggestions({
      goal: prof.goal,
      targets: {
        calories: prof.calorieTarget,
        protein: prof.proteinTarget,
        carbs: prof.carbTarget,
        sugar: prof.sugarTarget,
      },
      consumed,
      fasting: {
        active: !!fast,
        hoursLeft: fast ? Math.max(0, (fast.plannedEndAt.getTime() - Date.now()) / 3_600_000) : null,
        protocol: fast?.protocol ?? null,
      },
      localHour,
      recentFoods: [...new Set(recent.map((r) => r.name))],
      seed: Math.floor(Math.random() * 10_000),
    });
  } catch (err) {
    console.error("suggestions.generate failed", err);
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Fuel is recharging — try again in a moment." });
  }

  const [row] = await db.insert(schema.suggestions).values({ deviceId, date, items }).returning();
  return row!;
}

export const suggestions = {
  /** Today's cached suggestions, generated on first call. */
  today: deviceScoped.input(input).handler(async ({ context, input }) => {
    const [cached] = await db
      .select()
      .from(schema.suggestions)
      .where(and(eq(schema.suggestions.deviceId, context.deviceId), eq(schema.suggestions.date, input.date)))
      .orderBy(desc(schema.suggestions.generatedAt))
      .limit(1);
    if (cached) return cached;
    return buildAndStore(context.deviceId, input.date, input.localHour);
  }),

  regenerate: deviceScoped.input(input).handler(({ context, input }) =>
    buildAndStore(context.deviceId, input.date, input.localHour),
  ),
};
