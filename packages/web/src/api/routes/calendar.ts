import { z } from "zod";
import { and, asc, eq, gte, lte, or, isNull } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped } from "../middleware/device";
import { DATE_RE, dateRange } from "../lib/dates";

/** Convert a UTC timestamp to the device's local `YYYY-MM-DD`. `tzOffsetMin` matches `Date#getTimezoneOffset()`. */
function localDate(ms: number, tzOffsetMin: number) {
  return new Date(ms - tzOffsetMin * 60_000).toISOString().slice(0, 10);
}

export type CalendarFast = {
  id: number;
  protocol: string;
  status: "active" | "completed" | "broken";
  startAt: number;
  endedAt: number | null;
  plannedHours: number;
  hours: number;
  /** True when this day is the day the fast started. */
  starts: boolean;
};

export type CalendarDay = {
  date: string;
  fasts: CalendarFast[];
  exercises: (typeof schema.exerciseEvents.$inferSelect)[];
  food: { count: number; calories: number };
  waterMl: number;
  weightKg: number | null;
  photos: number;
};

export const calendar = {
  /**
   * Per-day summary of everything in a date range: fasts (spanning each day
   * they touch), scheduled exercise, meals, water, weight and progress photos.
   */
  range: deviceScoped
    .input(
      z.object({
        from: z.string().regex(DATE_RE),
        to: z.string().regex(DATE_RE),
        tzOffsetMin: z.number().int().min(-900).max(900).default(0),
      }),
    )
    .handler(async ({ context, input }) => {
      const id = context.deviceId;
      const days = dateRange(input.from, input.to);
      if (days.length === 0 || days.length > 62) return [] as CalendarDay[];

      // Range bounds in UTC ms for the fast query (pad a day on each side for tz slack).
      const fromMs = new Date(`${input.from}T00:00:00Z`).getTime() + input.tzOffsetMin * 60_000 - 86_400_000;
      const toMs = new Date(`${input.to}T23:59:59Z`).getTime() + input.tzOffsetMin * 60_000 + 86_400_000;

      const [fastRows, exerciseRows, foodRows, waterRows, weightRows, photoRows] = await Promise.all([
        db
          .select()
          .from(schema.fasts)
          .where(
            and(
              eq(schema.fasts.deviceId, id),
              lte(schema.fasts.startAt, new Date(toMs)),
              or(isNull(schema.fasts.endedAt), gte(schema.fasts.endedAt, new Date(fromMs))),
            ),
          )
          .orderBy(asc(schema.fasts.startAt)),
        db
          .select()
          .from(schema.exerciseEvents)
          .where(
            and(
              eq(schema.exerciseEvents.deviceId, id),
              gte(schema.exerciseEvents.date, input.from),
              lte(schema.exerciseEvents.date, input.to),
            ),
          )
          .orderBy(asc(schema.exerciseEvents.date), asc(schema.exerciseEvents.time)),
        db
          .select({ date: schema.foodEntries.date, calories: schema.foodEntries.calories })
          .from(schema.foodEntries)
          .where(
            and(
              eq(schema.foodEntries.deviceId, id),
              gte(schema.foodEntries.date, input.from),
              lte(schema.foodEntries.date, input.to),
            ),
          ),
        db
          .select({ date: schema.waterEntries.date, amountMl: schema.waterEntries.amountMl })
          .from(schema.waterEntries)
          .where(
            and(
              eq(schema.waterEntries.deviceId, id),
              gte(schema.waterEntries.date, input.from),
              lte(schema.waterEntries.date, input.to),
            ),
          ),
        db
          .select({ date: schema.weightEntries.date, weightKg: schema.weightEntries.weightKg })
          .from(schema.weightEntries)
          .where(
            and(
              eq(schema.weightEntries.deviceId, id),
              gte(schema.weightEntries.date, input.from),
              lte(schema.weightEntries.date, input.to),
            ),
          ),
        db
          .select({ date: schema.progressPhotos.date })
          .from(schema.progressPhotos)
          .where(
            and(
              eq(schema.progressPhotos.deviceId, id),
              gte(schema.progressPhotos.date, input.from),
              lte(schema.progressPhotos.date, input.to),
            ),
          ),
      ]);

      const byDate = new Map<string, CalendarDay>();
      for (const date of days) {
        byDate.set(date, {
          date,
          fasts: [],
          exercises: [],
          food: { count: 0, calories: 0 },
          waterMl: 0,
          weightKg: null,
          photos: 0,
        });
      }

      const now = Date.now();
      for (const f of fastRows) {
        const startMs = f.startAt.getTime();
        const endMs = f.endedAt ? f.endedAt.getTime() : Math.min(now, f.plannedEndAt.getTime());
        const hours = Math.max(0, (endMs - startMs) / 3_600_000);
        const startDate = localDate(startMs, input.tzOffsetMin);
        const endDate = localDate(Math.max(endMs, startMs), input.tzOffsetMin);
        for (const date of dateRange(startDate, endDate)) {
          const day = byDate.get(date);
          if (!day) continue;
          day.fasts.push({
            id: f.id,
            protocol: f.protocol,
            status: f.status,
            startAt: startMs,
            endedAt: f.endedAt ? f.endedAt.getTime() : null,
            plannedHours: f.plannedHours,
            hours: Math.round(hours * 10) / 10,
            starts: date === startDate,
          });
        }
      }
      for (const e of exerciseRows) byDate.get(e.date)?.exercises.push(e);
      for (const r of foodRows) {
        const day = byDate.get(r.date);
        if (!day) continue;
        day.food.count += 1;
        day.food.calories += r.calories;
      }
      for (const r of waterRows) {
        const day = byDate.get(r.date);
        if (day) day.waterMl += r.amountMl;
      }
      for (const r of weightRows) {
        const day = byDate.get(r.date);
        if (day) day.weightKg = r.weightKg;
      }
      for (const r of photoRows) {
        const day = byDate.get(r.date);
        if (day) day.photos += 1;
      }

      for (const day of byDate.values()) day.food.calories = Math.round(day.food.calories);
      return days.map((d) => byDate.get(d)!);
    }),
};
