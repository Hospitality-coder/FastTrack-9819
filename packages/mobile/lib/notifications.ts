import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

/**
 * Local alarm scheduling. Everything is a no-op on web so the Expo web preview
 * keeps working; on native we use expo-notifications one-shot and daily triggers.
 */
export const notificationsSupported = Platform.OS !== "web";

const FAST_IDS_KEY = ["fast-end", "eat-end"] as const;
const WATER_PREFIX = "water-";

let configured = false;
function configure() {
  if (configured || !notificationsSupported) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync("fasttrack", {
      name: "FastTrack alarms",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#39FF14",
    });
  }
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  configure();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

async function cancelByIdentifiers(ids: readonly string[]) {
  if (!notificationsSupported) return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/**
 * Schedule "fast complete" and "eating window closes" alarms for the active fast.
 * eatingHours = 24 - fasting hours (skipped for extended fasts ≥ 24h).
 */
export async function scheduleFastAlarms(opts: {
  plannedEndAt: Date;
  plannedHours: number;
  notifFastEnd: boolean;
  notifEatEnd: boolean;
}) {
  if (!notificationsSupported) return;
  configure();
  await cancelByIdentifiers(FAST_IDS_KEY);
  const ok = await requestPermission();
  if (!ok) return;

  const now = Date.now();
  if (opts.notifFastEnd && opts.plannedEndAt.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: "fast-end",
      content: {
        title: "Fast complete. Ninja move.",
        body: `${opts.plannedHours}h in the shadows — your eating window is open.`,
        sound: true,
        ...(Platform.OS === "android" ? { channelId: "fasttrack" } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: opts.plannedEndAt },
    });
  }
  const eatingHours = 24 - opts.plannedHours;
  if (opts.notifEatEnd && eatingHours > 0) {
    const eatEnd = new Date(opts.plannedEndAt.getTime() + eatingHours * 3_600_000);
    if (eatEnd.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: "eat-end",
        content: {
          title: "Eating window closing",
          body: "Time to start your next fast. Back to the shadows.",
          sound: true,
          ...(Platform.OS === "android" ? { channelId: "fasttrack" } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eatEnd },
      });
    }
  }
}

export async function cancelFastAlarms() {
  await cancelByIdentifiers(FAST_IDS_KEY);
}

function parseTime(t: string): [number, number] {
  const [h, m] = t.split(":").map(Number) as [number, number];
  return [h, m];
}

/** Expand interval reminders into concrete HH:mm times within the active window. */
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

/** (Re)schedule daily water reminders. Cancels existing ones first. */
export async function scheduleWaterReminders(r: {
  enabled: boolean;
  mode: string;
  intervalMin: number;
  activeFrom: string;
  activeTo: string;
  customTimes: string[] | null;
}) {
  if (!notificationsSupported) return;
  configure();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await cancelByIdentifiers(scheduled.map((s) => s.identifier).filter((id) => id.startsWith(WATER_PREFIX)));
  if (!r.enabled) return;
  const ok = await requestPermission();
  if (!ok) return;

  const times = reminderTimes(r);
  await Promise.all(
    times.map((t, i) => {
      const [hour, minute] = parseTime(t);
      return Notifications.scheduleNotificationAsync({
        identifier: `${WATER_PREFIX}${t}`,
        content: {
          title: "Water time",
          body: WATER_MESSAGES[i % WATER_MESSAGES.length]!,
          sound: true,
          ...(Platform.OS === "android" ? { channelId: "fasttrack" } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    }),
  );
}
