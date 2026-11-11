import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped } from "../middleware/device";
import { DATE_RE, addDays } from "../lib/dates";

export const PROTOCOLS: Record<string, number> = {
  "16:8": 16,
  "18:6": 18,
  "20:4": 20,
  OMAD: 23,
};

export const RANKS = [
  { name: "Novice", min: 0 },
  { name: "Apprentice", min: 3 },
  { name: "Shadow", min: 10 },
  { name: "Blade", min: 25 },
  { name: "Master", min: 50 },
  { name: "Grandmaster", min: 100 },
] as const;

export function rankFor(completed: number) {
  let current: (typeof RANKS)[number] = RANKS[0];
  let next: (typeof RANKS)[number] | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (completed >= RANKS[i]!.min) current = RANKS[i]!;
    else {
      next = RANKS[i]!;
      break;
    }
  }
  return {
    name: current.name,
    completed,
    nextName: next?.name ?? null,
    nextAt: next?.min ?? null,
    progress: next ? (completed - current.min) / (next.min - current.min) : 1,
  };
}

/** Local date (YYYY-MM-DD) for a timestamp, given the client's tz offset in minutes (Date#getTimezoneOffset). */
function localDate(ts: Date, tzOffsetMin: number) {
  return new Date(ts.getTime() - tzOffsetMin * 60_000).toISOString().slice(0, 10);
}

async function getActive(deviceId: string) {
  const [row] = await db
    .select()
    .from(schema.fasts)
    .where(and(eq(schema.fasts.deviceId, deviceId), eq(schema.fasts.status, "active")))
    .orderBy(desc(schema.fasts.startAt))
    .limit(1);
  return row ?? null;
}

export const fasts = {
  active: deviceScoped.handler(({ context }) => getActive(context.deviceId)),

  start: deviceScoped
    .input(
      z.object({
        protocol: z.string().min(1).max(20),
        plannedHours: z.number().min(1).max(168),
        startAt: z.date().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const existing = await getActive(context.deviceId);
      if (existing) throw new ORPCError("CONFLICT", { message: "A fast is already running" });
      const startAt = input.startAt ?? new Date();
      const plannedEndAt = new Date(startAt.getTime() + input.plannedHours * 3_600_000);
      const [row] = await db
        .insert(schema.fasts)
        .values({
          deviceId: context.deviceId,
          protocol: input.protocol,
          plannedHours: input.plannedHours,
          startAt,
          plannedEndAt,
        })
        .returning();
      return row!;
    }),

  /** End the active fast. Completed if planned time reached, otherwise "broken" (still logged). */
  end: deviceScoped
    .input(z.object({ id: z.number(), note: z.string().max(200).optional() }))
    .handler(async ({ context, input }) => {
      const [fast] = await db
        .select()
        .from(schema.fasts)
        .where(and(eq(schema.fasts.id, input.id), eq(schema.fasts.deviceId, context.deviceId)));
      if (!fast) throw new ORPCError("NOT_FOUND");
      const now = new Date();
      const status = now >= fast.plannedEndAt ? "completed" : "broken";
      const [row] = await db
        .update(schema.fasts)
        .set({ endedAt: now, status, note: input.note ?? fast.note })
        .where(eq(schema.fasts.id, fast.id))
        .returning();
      return row!;
    }),

  extend: deviceScoped
    .input(z.object({ id: z.number(), hours: z.number().min(0.5).max(72) }))
    .handler(async ({ context, input }) => {
      const [fast] = await db
        .select()
        .from(schema.fasts)
        .where(and(eq(schema.fasts.id, input.id), eq(schema.fasts.deviceId, context.deviceId)));
      if (!fast || fast.status !== "active") throw new ORPCError("NOT_FOUND");
      const plannedHours = fast.plannedHours + input.hours;
      const plannedEndAt = new Date(fast.startAt.getTime() + plannedHours * 3_600_000);
      const [row] = await db
        .update(schema.fasts)
        .set({ plannedHours, plannedEndAt, protocol: fast.protocol === "custom" ? "custom" : fast.protocol })
        .where(eq(schema.fasts.id, fast.id))
        .returning();
      return row!;
    }),

  /** Adjust the start time of the active fast (forgot to press start). */
  editStart: deviceScoped
    .input(z.object({ id: z.number(), startAt: z.date() }))
    .handler(async ({ context, input }) => {
      const [fast] = await db
        .select()
        .from(schema.fasts)
        .where(and(eq(schema.fasts.id, input.id), eq(schema.fasts.deviceId, context.deviceId)));
      if (!fast || fast.status !== "active") throw new ORPCError("NOT_FOUND");
      if (input.startAt > new Date()) throw new ORPCError("BAD_REQUEST", { message: "Start must be in the past" });
      const plannedEndAt = new Date(input.startAt.getTime() + fast.plannedHours * 3_600_000);
      const [row] = await db
        .update(schema.fasts)
        .set({ startAt: input.startAt, plannedEndAt })
        .where(eq(schema.fasts.id, fast.id))
        .returning();
      return row!;
    }),

  delete: deviceScoped.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db
      .delete(schema.fasts)
      .where(and(eq(schema.fasts.id, input.id), eq(schema.fasts.deviceId, context.deviceId)));
    return { ok: true };
  }),

  history: deviceScoped
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .handler(({ context, input }) =>
      db
        .select()
        .from(schema.fasts)
        .where(eq(schema.fasts.deviceId, context.deviceId))
        .orderBy(desc(schema.fasts.startAt))
        .limit(input.limit),
    ),

  /**
   * Streaks, rank, weekly hours and a 12-week heatmap.
   * `today` is the client's local date; `tzOffsetMin` is Date#getTimezoneOffset().
   */
  stats: deviceScoped
    .input(z.object({ today: z.string().regex(DATE_RE), tzOffsetMin: z.number().int() }))
    .handler(async ({ context, input }) => {
      const since = new Date(Date.now() - 120 * 86_400_000);
      const rows = await db
        .select()
        .from(schema.fasts)
        .where(and(eq(schema.fasts.deviceId, context.deviceId), gte(schema.fasts.startAt, since)))
        .orderBy(desc(schema.fasts.startAt));

      const allCompleted = await db
        .select({ id: schema.fasts.id })
        .from(schema.fasts)
        .where(and(eq(schema.fasts.deviceId, context.deviceId), eq(schema.fasts.status, "completed")));

      // Days with a completed fast (keyed by the local date the fast ended).
      const completedDays = new Set<string>();
      const hoursByDay = new Map<string, number>();
      let active = false;
      for (const f of rows) {
        const end = f.endedAt ?? new Date();
        const day = localDate(end, input.tzOffsetMin);
        const hours = (end.getTime() - f.startAt.getTime()) / 3_600_000;
        hoursByDay.set(day, (hoursByDay.get(day) ?? 0) + hours);
        if (f.status === "completed") completedDays.add(day);
        if (f.status === "active") active = true;
      }

      // Current streak: walk back from today (today counts if completed OR fast active).
      let streak = 0;
      let cursor = input.today;
      if (!completedDays.has(cursor) && !active) cursor = addDays(cursor, -1);
      else if (!completedDays.has(cursor) && active) {
        streak = 0; // active fast keeps the streak alive but doesn't add until completed
        cursor = addDays(cursor, -1);
      }
      while (completedDays.has(cursor)) {
        streak++;
        cursor = addDays(cursor, -1);
      }

      // Best streak over the window.
      const sortedDays = [...completedDays].sort();
      let best = 0;
      let run = 0;
      let prev: string | null = null;
      for (const d of sortedDays) {
        run = prev && addDays(prev, 1) === d ? run + 1 : 1;
        best = Math.max(best, run);
        prev = d;
      }
      best = Math.max(best, streak);

      // Heatmap for last 84 days.
      const heatmap: { date: string; hours: number; completed: boolean }[] = [];
      for (let i = 83; i >= 0; i--) {
        const d = addDays(input.today, -i);
        heatmap.push({
          date: d,
          hours: Math.round((hoursByDay.get(d) ?? 0) * 10) / 10,
          completed: completedDays.has(d),
        });
      }

      const weekHours = heatmap.slice(-7).reduce((a, h) => a + h.hours, 0);
      const totalCompleted = allCompleted.length;

      return {
        currentStreak: streak,
        bestStreak: best,
        totalCompleted,
        weekHours: Math.round(weekHours * 10) / 10,
        rank: rankFor(totalCompleted),
        heatmap,
      };
    }),
};
