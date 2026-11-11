/**
 * Browser-side alarms. Uses the Notification API with in-page timers — they
 * fire while the tab is open (web has no reliable background scheduling).
 */
export const notificationsSupported = typeof window !== "undefined" && "Notification" in window;

const timers = new Map<string, number>();

export function permissionState(): "granted" | "denied" | "default" | "unsupported" {
  if (!notificationsSupported) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

function clear(id: string) {
  const t = timers.get(id);
  if (t !== undefined) window.clearTimeout(t);
  timers.delete(id);
}

function schedule(id: string, at: Date, title: string, body: string) {
  clear(id);
  const delay = at.getTime() - Date.now();
  if (delay <= 0 || delay > 2_147_000_000) return; // setTimeout caps at ~24.8 days
  const t = window.setTimeout(() => {
    timers.delete(id);
    fire(title, body);
  }, delay);
  timers.set(id, t);
}

function fire(title: string, body: string) {
  if (!notificationsSupported || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/images/ninja.png", tag: title });
  } catch {
    // ignore
  }
}

export async function scheduleFastAlarms(opts: {
  plannedEndAt: Date;
  plannedHours: number;
  notifFastEnd: boolean;
  notifEatEnd: boolean;
}) {
  cancelFastAlarms();
  const ok = await requestPermission();
  if (!ok) return;
  if (opts.notifFastEnd) {
    schedule(
      "fast-end",
      opts.plannedEndAt,
      "Fast complete. Ninja move.",
      `${opts.plannedHours}h in the shadows — your eating window is open.`,
    );
  }
  const eatingHours = 24 - opts.plannedHours;
  if (opts.notifEatEnd && eatingHours > 0) {
    schedule(
      "eat-end",
      new Date(opts.plannedEndAt.getTime() + eatingHours * 3_600_000),
      "Eating window closing",
      "Time to start your next fast. Back to the shadows.",
    );
  }
}

export function cancelFastAlarms() {
  clear("fast-end");
  clear("eat-end");
}

function parseTime(t: string): [number, number] {
  const [h, m] = t.split(":").map(Number) as [number, number];
  return [h, m];
}

export function reminderTimes(r: {
  mode: string;
  intervalMin: number;
  activeFrom: string;
  activeTo: string;
  customTimes: string[] | null;
}): string[] {
  if (r.mode === "custom") return [...(r.customTimes ?? [])].sort();
  const [fh, fm] = parseTime(r.activeFrom);
  const [th, tm] = parseTime(r.activeTo);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  const out: string[] = [];
  for (let t = start; t <= end && out.length < 48; t += Math.max(15, r.intervalMin)) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

const WATER_MESSAGES = [
  "Hydrate, ninja. Water keeps the blade sharp.",
  "Drink up. Your streak is watching.",
  "Water break — 250 ml, go.",
  "Stay in the shadows, stay hydrated.",
];

/** Schedule today's (and tomorrow's) remaining water reminders while the tab is open. */
export async function scheduleWaterReminders(r: {
  enabled: boolean;
  mode: string;
  intervalMin: number;
  activeFrom: string;
  activeTo: string;
  customTimes: string[] | null;
}) {
  for (const id of Array.from(timers.keys())) if (id.startsWith("water-")) clear(id);
  if (!r.enabled) return;
  const ok = await requestPermission();
  if (!ok) return;
  const times = reminderTimes(r);
  const now = new Date();
  times.forEach((t, i) => {
    const [h, m] = parseTime(t);
    for (const dayOffset of [0, 1]) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m, 0, 0);
      if (at.getTime() > now.getTime()) {
        schedule(`water-${dayOffset}-${t}`, at, "Water time", WATER_MESSAGES[i % WATER_MESSAGES.length]!);
        break;
      }
    }
  });
}
