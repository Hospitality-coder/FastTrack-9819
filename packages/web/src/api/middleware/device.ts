import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import * as schema from "../database/schema";

const DEVICE_HEADER = "x-device-id";
const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * Procedure base scoped to an anonymous device. Clients send a stable
 * `x-device-id` header (UUID generated on first launch). The device row is
 * upserted and `context.deviceId` is exposed to handlers.
 */
export const deviceScoped = base.use(async ({ context, next }) => {
  const deviceId = context.headers.get(DEVICE_HEADER);
  if (!deviceId || !ID_RE.test(deviceId)) {
    throw new ORPCError("UNAUTHORIZED", { message: "Missing device id" });
  }

  await db
    .insert(schema.devices)
    .values({ id: deviceId })
    .onConflictDoUpdate({
      target: schema.devices.id,
      set: { lastSeenAt: new Date() },
    });

  return next({ context: { deviceId } });
});

export async function ensureProfile(deviceId: string) {
  const [existing] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.deviceId, deviceId));
  if (existing) return existing;
  const [created] = await db.insert(schema.profiles).values({ deviceId }).returning();
  return created!;
}
