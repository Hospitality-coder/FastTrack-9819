import { z } from "zod";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped } from "../middleware/device";
import { DATE_RE } from "../lib/dates";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const baseInput = {
  date: z.string().regex(DATE_RE),
  time: z.string().regex(TIME_RE).nullable().optional(),
  title: z.string().min(1).max(60),
  type: z.enum(schema.EXERCISE_TYPES).default("other"),
  durationMin: z.number().int().min(5).max(600).default(30),
  note: z.string().max(200).nullable().optional(),
};

export const exercise = {
  create: deviceScoped.input(z.object(baseInput)).handler(async ({ context, input }) => {
    const [row] = await db
      .insert(schema.exerciseEvents)
      .values({ ...input, deviceId: context.deviceId })
      .returning();
    return row!;
  }),

  update: deviceScoped
    .input(
      z.object({
        id: z.number(),
        date: baseInput.date.optional(),
        time: baseInput.time,
        title: baseInput.title.optional(),
        type: z.enum(schema.EXERCISE_TYPES).optional(),
        durationMin: z.number().int().min(5).max(600).optional(),
        note: baseInput.note,
        completed: z.boolean().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const { id, ...patch } = input;
      const [row] = await db
        .update(schema.exerciseEvents)
        .set(patch)
        .where(and(eq(schema.exerciseEvents.id, id), eq(schema.exerciseEvents.deviceId, context.deviceId)))
        .returning();
      if (!row) throw new ORPCError("NOT_FOUND");
      return row;
    }),

  toggleComplete: deviceScoped.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    const [existing] = await db
      .select()
      .from(schema.exerciseEvents)
      .where(and(eq(schema.exerciseEvents.id, input.id), eq(schema.exerciseEvents.deviceId, context.deviceId)));
    if (!existing) throw new ORPCError("NOT_FOUND");
    const [row] = await db
      .update(schema.exerciseEvents)
      .set({ completed: !existing.completed })
      .where(eq(schema.exerciseEvents.id, existing.id))
      .returning();
    return row!;
  }),

  delete: deviceScoped.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db
      .delete(schema.exerciseEvents)
      .where(and(eq(schema.exerciseEvents.id, input.id), eq(schema.exerciseEvents.deviceId, context.deviceId)));
    return { ok: true };
  }),

  byRange: deviceScoped
    .input(z.object({ from: z.string().regex(DATE_RE), to: z.string().regex(DATE_RE) }))
    .handler(({ context, input }) =>
      db
        .select()
        .from(schema.exerciseEvents)
        .where(
          and(
            eq(schema.exerciseEvents.deviceId, context.deviceId),
            gte(schema.exerciseEvents.date, input.from),
            lte(schema.exerciseEvents.date, input.to),
          ),
        )
        .orderBy(asc(schema.exerciseEvents.date), asc(schema.exerciseEvents.time)),
    ),

  /** Upcoming sessions from `today` onwards (for the dashboard). */
  upcoming: deviceScoped
    .input(z.object({ today: z.string().regex(DATE_RE), limit: z.number().int().min(1).max(20).default(5) }))
    .handler(({ context, input }) =>
      db
        .select()
        .from(schema.exerciseEvents)
        .where(
          and(
            eq(schema.exerciseEvents.deviceId, context.deviceId),
            gte(schema.exerciseEvents.date, input.today),
            eq(schema.exerciseEvents.completed, false),
          ),
        )
        .orderBy(asc(schema.exerciseEvents.date), asc(schema.exerciseEvents.time))
        .limit(input.limit),
    ),
};
