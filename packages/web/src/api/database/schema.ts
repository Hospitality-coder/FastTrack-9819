import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

/**
 * FastTrack schema. Every user-facing table is scoped by `deviceId`
 * (anonymous per-device id — no accounts). Dates are stored as ISO
 * `YYYY-MM-DD` strings in the device's local day; timestamps as unix ms.
 */

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const profiles = sqliteTable("profiles", {
  deviceId: text("device_id").primaryKey(),
  name: text("name").notNull().default("Shinobi"),
  avatarUrl: text("avatar_url"),
  goal: text("goal", { enum: ["lose", "maintain", "gain"] }).notNull().default("lose"),
  heightCm: real("height_cm"),
  goalWeightKg: real("goal_weight_kg"),
  calorieTarget: integer("calorie_target").notNull().default(2000),
  proteinTarget: integer("protein_target").notNull().default(120),
  carbTarget: integer("carb_target").notNull().default(200),
  sugarTarget: integer("sugar_target").notNull().default(50),
  waterTargetMl: integer("water_target_ml").notNull().default(2500),
  defaultProtocol: text("default_protocol").notNull().default("16:8"),
  notifFastEnd: integer("notif_fast_end", { mode: "boolean" }).notNull().default(true),
  notifEatEnd: integer("notif_eat_end", { mode: "boolean" }).notNull().default(true),
  notifWater: integer("notif_water", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const fasts = sqliteTable(
  "fasts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    protocol: text("protocol").notNull(), // "16:8" | "18:6" | "20:4" | "OMAD" | "custom" | "extended"
    plannedHours: real("planned_hours").notNull(),
    startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
    plannedEndAt: integer("planned_end_at", { mode: "timestamp_ms" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: ["active", "completed", "broken"] }).notNull().default("active"),
    note: text("note"),
  },
  (t) => [index("fasts_device_idx").on(t.deviceId, t.startAt)],
);

export const foodEntries = sqliteTable(
  "food_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    meal: text("meal", { enum: ["breakfast", "lunch", "dinner", "snack"] }).notNull().default("snack"),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    portion: text("portion"),
    calories: real("calories").notNull().default(0),
    protein: real("protein").notNull().default(0),
    carbs: real("carbs").notNull().default(0),
    sugar: real("sugar").notNull().default(0),
    fat: real("fat").notNull().default(0),
    fiber: real("fiber").notNull().default(0),
    source: text("source", { enum: ["scan", "manual"] }).notNull().default("manual"),
    aiRaw: text("ai_raw", { mode: "json" }),
    loggedAt: integer("logged_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("food_device_date_idx").on(t.deviceId, t.date)],
);

export const weightEntries = sqliteTable(
  "weight_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    date: text("date").notNull(),
    weightKg: real("weight_kg").notNull(),
    note: text("note"),
    loggedAt: integer("logged_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("weight_device_date_idx").on(t.deviceId, t.date)],
);

export const waterEntries = sqliteTable(
  "water_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    date: text("date").notNull(),
    amountMl: integer("amount_ml").notNull(),
    loggedAt: integer("logged_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("water_device_date_idx").on(t.deviceId, t.date)],
);

export const waterReminders = sqliteTable("water_reminders", {
  deviceId: text("device_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  mode: text("mode", { enum: ["interval", "custom"] }).notNull().default("interval"),
  intervalMin: integer("interval_min").notNull().default(90),
  activeFrom: text("active_from").notNull().default("08:00"), // HH:mm
  activeTo: text("active_to").notNull().default("22:00"),
  customTimes: text("custom_times", { mode: "json" }).$type<string[]>().notNull().default([]),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type SuggestionItem = {
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  tags: string[];
  whyForYou: string;
};

export const suggestions = sqliteTable(
  "suggestions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    date: text("date").notNull(),
    items: text("items", { mode: "json" }).$type<SuggestionItem[]>().notNull(),
    generatedAt: integer("generated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("suggestions_device_date_idx").on(t.deviceId, t.date)],
);

export const EXERCISE_TYPES = ["strength", "cardio", "hiit", "yoga", "walk", "sport", "other"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** Scheduled (or logged) exercise sessions shown on the calendar. */
export const exerciseEvents = sqliteTable(
  "exercise_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    time: text("time"), // HH:mm, optional
    title: text("title").notNull(),
    type: text("type", { enum: EXERCISE_TYPES }).notNull().default("other"),
    durationMin: integer("duration_min").notNull().default(30),
    note: text("note"),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("exercise_device_date_idx").on(t.deviceId, t.date)],
);

export const PHOTO_LABELS = ["before", "progress", "after"] as const;
export type PhotoLabel = (typeof PHOTO_LABELS)[number];

/** Before / after progress photo gallery. */
export const progressPhotos = sqliteTable(
  "progress_photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    date: text("date").notNull(),
    url: text("url").notNull(),
    label: text("label", { enum: PHOTO_LABELS }).notNull().default("progress"),
    note: text("note"),
    weightKg: real("weight_kg"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("photos_device_date_idx").on(t.deviceId, t.date)],
);
