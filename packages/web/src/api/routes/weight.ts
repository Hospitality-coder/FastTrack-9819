import { z } from "zod";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped, ensureProfile } from "../middleware/device";
import { DATE_RE, addDays } from "../lib/dates";

export const weight = {
  create: deviceScoped
    .input(
      z.object({
        date: z.string().regex(DATE_RE),
        weightKg: z.number().min(20).max(400),
        note: z.string().max(120).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      // One entry per day: replace if it exists.
      const [existing] = await db
        .select()
        .from(schema.weightEntries)
        .where(and(eq(schema.weightEntries.deviceId, context.deviceId), eq(schema.weightEntries.date, input.date)));
      if (existing) {
        const [row] = await db
          .update(schema.weightEntries)
          .set({ weightKg: input.weightKg, note: input.note ?? existing.note, loggedAt: new Date() })
          .where(eq(schema.weightEntries.id, existing.id))
          .returning();
        return row!;
      }
      const [row] = await db
        .insert(schema.weightEntries)
        .values({ ...input, deviceId: context.deviceId })
        .returning();
      return row!;
    }),

  delete: deviceScoped.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db
      .delete(schema.weightEntries)
      .where(and(eq(schema.weightEntries.id, input.id), eq(schema.weightEntries.deviceId, context.deviceId)));
    return { ok: true };
  }),

  list: deviceScoped
    .input(z.object({ today: z.string().regex(DATE_RE), days: z.number().int().min(7).max(365).default(90) }))
    .handler(({ context, input }) =>
      db
        .select()
        .from(schema.weightEntries)
        .where(
          and(
            eq(schema.weightEntries.deviceId, context.deviceId),
            gte(schema.weightEntries.date, addDays(input.today, -input.days)),
          ),
        )
        .orderBy(asc(schema.weightEntries.date)),
    ),

  summary: deviceScoped.input(z.object({ today: z.string().regex(DATE_RE) })).handler(async ({ context, input }) => {
    const [prof, rows] = await Promise.all([
      ensureProfile(context.deviceId),
      db
        .select()
        .from(schema.weightEntries)
        .where(eq(schema.weightEntries.deviceId, context.deviceId))
        .orderBy(desc(schema.weightEntries.date))
        .limit(400),
    ]);
    const latest = rows[0] ?? null;
    const first = rows[rows.length - 1] ?? null;
    const weekAgo = addDays(input.today, -7);
    const monthAgo = addDays(input.today, -30);
    const ref = (cutoff: string) => rows.find((r) => r.date <= cutoff) ?? null;
    const w = ref(weekAgo);
    const m = ref(monthAgo);
    const r1 = (n: number) => Math.round(n * 10) / 10;
    return {
      latest,
      goalWeightKg: prof.goalWeightKg,
      goal: prof.goal,
      weekDelta: latest && w ? r1(latest.weightKg - w.weightKg) : null,
      monthDelta: latest && m ? r1(latest.weightKg - m.weightKg) : null,
      totalDelta: latest && first && first.id !== latest.id ? r1(latest.weightKg - first.weightKg) : null,
      toGoal: latest && prof.goalWeightKg ? r1(latest.weightKg - prof.goalWeightKg) : null,
      bmi: latest && prof.heightCm ? r1(latest.weightKg / Math.pow(prof.heightCm / 100, 2)) : null,
      entries: rows.length,
    };
  }),
};
