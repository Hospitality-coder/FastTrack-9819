import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Camera, Check, ChevronLeft, ChevronRight, Droplets, Dumbbell, Plus, Scale, Timer, Trash2, UtensilsCrossed } from "lucide-react";
import { cn } from "../lib/utils";
import { addDays, localDate, parseDate, prettyDate, today } from "../lib/dates";
import { useCalendarRange } from "../queries/calendar";
import { useCreateExercise, useDeleteExercise, useToggleExercise, useUpdateExercise } from "../queries/exercise";
import { Chip, Eyebrow, Field, Muted, Pill, Pixel, Sheet, Spinner } from "./ui";

type Day = NonNullable<ReturnType<typeof useCalendarRange>["data"]>[number];
type Exercise = Day["exercises"][number];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const EXERCISE_TYPES: { value: Exercise["type"]; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "walk", label: "Walk" },
  { value: "sport", label: "Sport" },
  { value: "other", label: "Other" },
];

function monthBounds(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return { from: localDate(first), to: localDate(last), daysInMonth: last.getDate(), startWeekday: (first.getDay() + 6) % 7 };
}

/* ---------- Legend ---------- */

export function Legend({ className }: { className?: string }) {
  const items = [
    { label: "Fast", color: "var(--primary)" },
    { label: "Exercise", color: "var(--accent)" },
    { label: "Meals", color: "var(--warning)" },
    { label: "Water", color: "var(--water)" },
    { label: "Weight", color: "#ffffff" },
  ];
  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: it.color }} />
          <Pixel className="text-[9px]">{it.label}</Pixel>
        </span>
      ))}
    </div>
  );
}

/* ---------- Month grid ---------- */

export function Calendar({
  compact,
  selected,
  onSelect,
  className,
}: {
  compact?: boolean;
  selected: string;
  onSelect: (date: string) => void;
  className?: string;
}) {
  const t = today();
  const sel = parseDate(selected);
  const [cursor, setCursor] = useState({ y: sel.getFullYear(), m: sel.getMonth() });
  const { from, to, daysInMonth, startWeekday } = useMemo(() => monthBounds(cursor.y, cursor.m), [cursor]);
  const range = useCalendarRange(from, to);
  const byDate = useMemo(() => new Map((range.data ?? []).map((d) => [d.date, d])), [range.data]);

  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(addDays(from, d - 1));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/6 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display text-[14px] font-bold text-foreground">
            {MONTHS[cursor.m]} {cursor.y}
          </span>
          {range.isFetching && <Spinner className="h-3.5 w-3.5" />}
        </div>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/6 hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <Pixel key={`${w}-${i}`} className="py-1 text-center text-[9px] text-muted-foreground">
            {w}
          </Pixel>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />;
          const day = byDate.get(date);
          const isToday = date === t;
          const isSel = date === selected;
          const future = date > t;
          const activeFast = day?.fasts.some((f) => f.status === "active");
          const hasExercise = (day?.exercises.length ?? 0) > 0;
          const allDone = hasExercise && day!.exercises.every((e) => e.completed);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={prettyDate(date)}
              aria-pressed={isSel}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-md border py-1.5 transition",
                compact ? "min-h-[44px]" : "min-h-[58px] md:min-h-[68px]",
                isSel ? "border-primary/70 bg-primary/12" : "border-transparent hover:bg-white/5",
                activeFast && !isSel && "border-primary/35",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold tabular",
                  isToday ? "bg-primary text-primary-foreground" : future ? "text-muted-foreground/70" : "text-foreground",
                )}
              >
                {parseDate(date).getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-[3px]">
                {day && day.fasts.length > 0 && (
                  <span
                    className={cn("h-1.5 rounded-full bg-primary", day.fasts.some((f) => f.status === "completed" || f.status === "active") ? "w-1.5" : "w-1.5 opacity-40")}
                  />
                )}
                {hasExercise && (
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", allDone ? "bg-accent" : "border border-accent")}
                  />
                )}
                {day && day.food.count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                {day && day.waterMl > 0 && <span className="h-1.5 w-1.5 rounded-full bg-water" />}
                {day && day.weightKg !== null && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {!compact && day && day.fasts.length > 0 && (
                <Pixel className="hidden text-[8px] text-primary md:block">{Math.max(...day.fasts.map((f) => f.hours)).toFixed(0)}h</Pixel>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Day details ---------- */

export function DayDetails({
  date,
  onAddExercise,
  compact,
}: {
  date: string;
  onAddExercise: () => void;
  compact?: boolean;
}) {
  const range = useCalendarRange(date, date);
  const day = range.data?.[0];
  const toggle = useToggleExercise();
  const del = useDeleteExercise();
  const [editing, setEditing] = useState<Exercise | null>(null);

  if (range.isLoading || !day) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner />
      </div>
    );
  }

  const empty = day.fasts.length === 0 && day.exercises.length === 0 && day.food.count === 0 && day.waterMl === 0 && day.weightKg === null && day.photos === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <Eyebrow>{prettyDate(date)}</Eyebrow>
          {!compact && <Muted className="text-[12px]">{empty ? "Nothing logged yet." : "Everything on this day."}</Muted>}
        </div>
        <Pill label="Add exercise" size="sm" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={onAddExercise} />
      </div>

      {empty && (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <Muted className="text-[13px]">Nothing here. Schedule a workout or start a fast.</Muted>
        </div>
      )}

      {/* Exercise */}
      {day.exercises.map((e) => (
        <div key={e.id} className={cn("flex items-center gap-3 rounded-md border border-border bg-white/3 px-3.5 py-2.5", e.completed && "opacity-70")}>
          <button
            type="button"
            onClick={() => toggle.mutate({ id: e.id })}
            disabled={toggle.isPending}
            aria-label={e.completed ? "Mark as not done" : "Mark as done"}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
              e.completed ? "border-accent bg-accent text-accent-foreground" : "border-accent/60 text-accent hover:bg-accent/15",
            )}
          >
            {e.completed ? <Check className="h-4 w-4" /> : <Dumbbell className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => setEditing(e)} className="flex min-w-0 flex-1 flex-col items-start text-left">
            <span className={cn("truncate text-[14px] font-bold text-foreground", e.completed && "line-through")}>{e.title}</span>
            <Pixel className="text-[9px] text-accent">
              {EXERCISE_TYPES.find((x) => x.value === e.type)?.label ?? e.type} · {e.durationMin} min{e.time ? ` · ${e.time}` : ""}
            </Pixel>
          </button>
          <button
            type="button"
            onClick={() => del.mutate({ id: e.id })}
            disabled={del.isPending}
            aria-label="Delete session"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Fasts */}
      {day.fasts.map((f) => (
        <Link key={f.id} to="/fast" className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/6 px-3.5 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Timer className="h-3.5 w-3.5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-bold text-foreground">
              {f.status === "active" ? "Fasting now" : f.status === "completed" ? "Fast completed" : "Fast ended early"} · {f.protocol}
            </span>
            <Pixel className="text-[9px] text-primary">
              {f.hours}h{f.status !== "active" ? ` of ${f.plannedHours}h` : ""}
              {!f.starts ? " · continued" : ""}
            </Pixel>
          </span>
        </Link>
      ))}

      {/* Logged stats */}
      {(day.food.count > 0 || day.waterMl > 0 || day.weightKg !== null || day.photos > 0) && (
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4")}>
          {day.food.count > 0 && (
            <Link to="/food" className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2">
              <UtensilsCrossed className="h-4 w-4 text-warning" />
              <span className="flex flex-col leading-tight">
                <span className="text-[13px] font-bold text-foreground">{day.food.calories} kcal</span>
                <Pixel className="text-[8px]">{day.food.count} meal{day.food.count === 1 ? "" : "s"}</Pixel>
              </span>
            </Link>
          )}
          {day.waterMl > 0 && (
            <Link to="/water" className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2">
              <Droplets className="h-4 w-4 text-water" />
              <span className="flex flex-col leading-tight">
                <span className="text-[13px] font-bold text-foreground">{day.waterMl} ml</span>
                <Pixel className="text-[8px]">water</Pixel>
              </span>
            </Link>
          )}
          {day.weightKg !== null && (
            <Link to="/weight" className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2">
              <Scale className="h-4 w-4 text-foreground" />
              <span className="flex flex-col leading-tight">
                <span className="text-[13px] font-bold text-foreground">{day.weightKg.toFixed(1)} kg</span>
                <Pixel className="text-[8px]">weigh-in</Pixel>
              </span>
            </Link>
          )}
          {day.photos > 0 && (
            <Link to="/gallery" className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2">
              <Camera className="h-4 w-4 text-accent" />
              <span className="flex flex-col leading-tight">
                <span className="text-[13px] font-bold text-foreground">
                  {day.photos} photo{day.photos === 1 ? "" : "s"}
                </span>
                <Pixel className="text-[8px]">gallery</Pixel>
              </span>
            </Link>
          )}
        </div>
      )}

      <ExerciseSheet open={editing !== null} onClose={() => setEditing(null)} date={date} existing={editing} />
    </div>
  );
}

/* ---------- Add / edit exercise sheet ---------- */

export function ExerciseSheet({
  open,
  onClose,
  date,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  existing?: Exercise | null;
}) {
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Exercise["type"]>("strength");
  const [when, setWhen] = useState(date);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [note, setNote] = useState("");

  // Seed the form each time it opens.
  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? "");
    setType(existing?.type ?? "strength");
    setWhen(existing?.date ?? date);
    setTime(existing?.time ?? "");
    setDuration(String(existing?.durationMin ?? 30));
    setNote(existing?.note ?? "");
  }, [open, existing, date]);

  const pending = create.isPending || update.isPending;
  const valid = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(when) && Number(duration) >= 5;

  const submit = () => {
    const payload = {
      date: when,
      time: time ? time : null,
      title: title.trim(),
      type,
      durationMin: Math.min(600, Math.max(5, Math.round(Number(duration) || 30))),
      note: note.trim() ? note.trim() : null,
    };
    const done = () => onClose();
    if (existing) update.mutate({ id: existing.id, ...payload }, { onSuccess: done });
    else create.mutate(payload, { onSuccess: done });
  };

  const presets = ["Push day", "Pull day", "Leg day", "5k run", "Yoga flow", "Evening walk", "HIIT 20"];

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit session" : "Schedule exercise"} subtitle={existing ? undefined : "Shows on your calendar. Tick it off when done."}>
      <div className="flex flex-col gap-4">
        <Field label="Session" placeholder="e.g. Push day" value={title} onChangeText={setTitle} maxLength={60} />
        {!existing && (
          <div className="-mt-1 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTitle(p)}
                className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Type</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {EXERCISE_TYPES.map((t) => (
              <Chip key={t.value} label={t.label} active={type === t.value} onClick={() => setType(t.value)} color="var(--accent)" className={type === t.value ? "text-accent-foreground" : ""} />
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <Field label="Date" type="date" value={when} onChangeText={setWhen} />
          <Field label="Time" type="time" value={time} onChangeText={setTime} />
        </div>
        <div className="flex gap-3">
          <Field label="Duration" type="number" inputMode="numeric" min={5} max={600} suffix="min" value={duration} onChangeText={setDuration} />
          <Field label="Note" placeholder="optional" value={note} onChangeText={setNote} maxLength={200} />
        </div>
        <Pill
          label={existing ? "Save changes" : "Add to calendar"}
          size="lg"
          onClick={submit}
          disabled={!valid || pending}
          loading={pending}
          icon={<Dumbbell className="h-[18px] w-[18px]" />}
        />
        {(create.isError || update.isError) && <Muted className="text-center text-destructive">Couldn't save. Check the fields and try again.</Muted>}
      </div>
    </Sheet>
  );
}
