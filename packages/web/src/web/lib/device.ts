const KEY = "fasttrack.deviceId";
let cached: string | null = null;

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Anonymous per-browser device ID, persisted in localStorage. */
export function getDeviceId(): string {
  if (cached) return cached;
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
    const id = uuid();
    localStorage.setItem(KEY, id);
    cached = id;
    return id;
  } catch {
    cached = cached ?? uuid();
    return cached;
  }
}
