import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped } from "../middleware/device";
import { DATE_RE } from "../lib/dates";

export const photos = {
  create: deviceScoped
    .input(
      z.object({
        date: z.string().regex(DATE_RE),
        url: z.string().url().max(600),
        label: z.enum(schema.PHOTO_LABELS).default("progress"),
        note: z.string().max(140).nullable().optional(),
        weightKg: z.number().min(20).max(400).nullable().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const [row] = await db
        .insert(schema.progressPhotos)
        .values({ ...input, deviceId: context.deviceId })
        .returning();
      return row!;
    }),

  update: deviceScoped
    .input(
      z.object({
        id: z.number(),
        date: z.string().regex(DATE_RE).optional(),
        label: z.enum(schema.PHOTO_LABELS).optional(),
        note: z.string().max(140).nullable().optional(),
        weightKg: z.number().min(20).max(400).nullable().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const { id, ...patch } = input;
      const [row] = await db
        .update(schema.progressPhotos)
        .set(patch)
        .where(and(eq(schema.progressPhotos.id, id), eq(schema.progressPhotos.deviceId, context.deviceId)))
        .returning();
      if (!row) throw new ORPCError("NOT_FOUND");
      return row;
    }),

  delete: deviceScoped.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db
      .delete(schema.progressPhotos)
      .where(and(eq(schema.progressPhotos.id, input.id), eq(schema.progressPhotos.deviceId, context.deviceId)));
    return { ok: true };
  }),

  /** All photos, oldest first — the client builds the before/after pair from the ends. */
  list: deviceScoped.handler(({ context }) =>
    db
      .select()
      .from(schema.progressPhotos)
      .where(eq(schema.progressPhotos.deviceId, context.deviceId))
      .orderBy(asc(schema.progressPhotos.date), asc(schema.progressPhotos.createdAt)),
  ),
};
