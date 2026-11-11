import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "fasttrack.deviceId";
let cached: string | null = null;
let pending: Promise<string> | null = null;

function uuid() {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // RFC4122-ish fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Anonymous per-install device ID. Generated once, persisted in AsyncStorage. */
export function getDeviceId(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    try {
      const existing = await AsyncStorage.getItem(KEY);
      if (existing) {
        cached = existing;
        return existing;
      }
      const id = uuid();
      await AsyncStorage.setItem(KEY, id);
      cached = id;
      return id;
    } catch {
      cached = cached ?? uuid();
      return cached;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
