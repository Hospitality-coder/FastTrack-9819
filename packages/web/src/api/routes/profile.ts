import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { deviceScoped, ensureProfile } from "../middleware/device";

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  avatarUrl: z.string().url().max(600).nullable().optional(),
  goal: z.enum(["lose", "maintain", "gain"]).optional(),
  heightCm: z.number().min(80).max(260).nullable().optional(),
  goalWeightKg: z.number().min(20).max(400).nullable().optional(),
  calorieTarget: z.number().int().min(800).max(8000).optional(),
  proteinTarget: z.number().int().min(10).max(500).optional(),
  carbTarget: z.number().int().min(0).max(1000).optional(),
  sugarTarget: z.number().int().min(0).max(500).optional(),
  waterTargetMl: z.number().int().min(500).max(10000).optional(),
  defaultProtocol: z.string().max(20).optional(),
  notifFastEnd: z.boolean().optional(),
  notifEatEnd: z.boolean().optional(),
  notifWater: z.boolean().optional(),
});

export const profile = {
  get: deviceScoped.handler(({ context }) => ensureProfile(context.deviceId)),

  update: deviceScoped.input(updateSchema).handler(async ({ context, input }) => {
    await ensureProfile(context.deviceId);
    const [updated] = await db
      .update(schema.profiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.profiles.deviceId, context.deviceId))
      .returning();
    return updated!;
  }),

  /** Wipe every record for this device. */
  reset: deviceScoped.handler(async ({ context }) => {
    const id = context.deviceId;
    await Promise.all([
      db.delete(schema.fasts).where(eq(schema.fasts.deviceId, id)),
      db.delete(schema.foodEntries).where(eq(schema.foodEntries.deviceId, id)),
      db.delete(schema.weightEntries).where(eq(schema.weightEntries.deviceId, id)),
      db.delete(schema.waterEntries).where(eq(schema.waterEntries.deviceId, id)),
      db.delete(schema.waterReminders).where(eq(schema.waterReminders.deviceId, id)),
      db.delete(schema.suggestions).where(eq(schema.suggestions.deviceId, id)),
      db.delete(schema.exerciseEvents).where(eq(schema.exerciseEvents.deviceId, id)),
      db.delete(schema.progressPhotos).where(eq(schema.progressPhotos.deviceId, id)),
      db.delete(schema.profiles).where(eq(schema.profiles.deviceId, id)),
    ]);
    return { ok: true };
  }),
};
