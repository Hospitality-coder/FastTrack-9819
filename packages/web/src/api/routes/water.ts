import { z } from "zod";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped, ensureProfile } from "../middleware/device";
import { DATE_RE, addDays, dateRange } from "../lib/dates";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function getReminders(deviceId: string) {
  const [row] = await db.select().from(schema.waterReminders).where(eq(schema.waterReminders.deviceId, deviceId));
  if (row) return row;
  const [created] = await db.insert(schema.waterReminders).values({ deviceId }).returning();
  return created!;
}

export const water = {
  add: deviceScoped
    .input(z.object({ date: z.string().regex(DATE_RE), amountMl: z.number().int().min(-5000).max(5000) }))
    .handler(async ({ context, input }) => {
      const [row] = await db
        .insert(schema.waterEntries)
        .values({ deviceId: context.deviceId, date: input.date, amountMl: input.amountMl })
        .returning();
      return row!;
    }),

  delete: deviceScoped.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db
      .delete(schema.waterEntries)
      .where(and(eq(schema.waterEntries.id, input.id), eq(schema.waterEntries.deviceId, context.deviceId)));
    return { ok: true };
  }),

  today: deviceScoped.input(z.object({ date: z.string().regex(DATE_RE) })).handler(async ({ context, input }) => {
    const [entries, prof] = await Promise.all([
      db
        .select()
        .from(schema.waterEntries)
        .where(and(eq(schema.waterEntries.deviceId, context.deviceId), eq(schema.waterEntries.date, input.date)))
        .orderBy(desc(schema.waterEntries.loggedAt)),
      ensureProfile(context.deviceId),
    ]);
    const total = entries.reduce((a, e) => a + e.amountMl, 0);
    return { entries, totalMl: total, targetMl: prof.waterTargetMl };
  }),

  history: deviceScoped
    .input(z.object({ today: z.string().regex(DATE_RE), days: z.number().int().min(1).max(31).default(7) }))
    .handler(async ({ context, input }) => {
      const from = addDays(input.today, -(input.days - 1));
      const rows = await db
        .select({ date: schema.waterEntries.date, total: sql<number>`coalesce(sum(${schema.waterEntries.amountMl}), 0)` })
        .from(schema.waterEntries)
        .where(
          and(
            eq(schema.waterEntries.deviceId, context.deviceId),
            gte(schema.waterEntries.date, from),
            lte(schema.waterEntries.date, input.today),
          ),
        )
        .groupBy(schema.waterEntries.date);
      const map = new Map(rows.map((r) => [r.date, r.total]));
      return dateRange(from, input.today).map((d) => ({ date: d, totalMl: map.get(d) ?? 0 }));
    }),

  getReminders: deviceScoped.handler(({ context }) => getReminders(context.deviceId)),

  setReminders: deviceScoped
    .input(
      z.object({
        enabled: z.boolean().optional(),
        mode: z.enum(["interval", "custom"]).optional(),
        intervalMin: z.number().int().min(15).max(480).optional(),
        activeFrom: z.string().regex(TIME_RE).optional(),
        activeTo: z.string().regex(TIME_RE).optional(),
        customTimes: z.array(z.string().regex(TIME_RE)).max(24).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      await getReminders(context.deviceId);
      const [row] = await db
        .update(schema.waterReminders)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(schema.waterReminders.deviceId, context.deviceId))
        .returning();
      return row!;
    }),
};
