import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Camera, CalendarDays, Droplets, Images, Scale, Settings, Shuffle, Zap } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Avatar } from "../components/Avatar";
import { Calendar, DayDetails, ExerciseSheet, Legend } from "../components/Calendar";
import { usePhotos } from "../queries/photos";
import { Card, Display, Empty, FadeUp, IconButton, Muted, Eyebrow, Pill, Pixel, SectionTitle, Spinner, Stat } from "../components/ui";
import { Ring } from "../components/Ring";
import { MacroBar, RankBadge, SuggestionCard } from "../components/charts";
import { useFastClock } from "../hooks/use-fast-clock";
import { useActiveFast, useFastStats } from "../queries/fasts";
import { useFoodByDate } from "../queries/food";
import { useProfile } from "../queries/profile";
import { useRegenerateSuggestions, useSuggestions } from "../queries/suggestions";
import { useAddWater, useWaterToday } from "../queries/water";
import { useWeightSummary } from "../queries/weight";
import { clock, humanDuration, today } from "../lib/dates";

export default function HomePage() {
  const [, navigate] = useLocation();
  const date = today();
  const profile = useProfile();
  const fast = useActiveFast();
  const stats = useFastStats();
  const food = useFoodByDate(date);
  const water = useWaterToday(date);
  const addWater = useAddWater(date);
  const weight = useWeightSummary();
  const suggestions = useSuggestions();
  const regenerate = useRegenerateSuggestions();
  const c = useFastClock(fast.data);
  const photos = usePhotos();
  const [selectedDay, setSelectedDay] = useState(date);
  const [addingExercise, setAddingExercise] = useState(false);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Night shift";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const waterPct = water.data ? Math.min(1, water.data.totalMl / water.data.targetMl) : 0;

  return (
    <div className="flex flex-col gap-5">
      <FadeUp>
        <PageHeader
          eyebrow={greeting}
          title={profile.isLoading ? "…" : (profile.data?.name ?? "Ninja")}
          leading={<Avatar size={56} />}
          right={
            <>
              {stats.data && <RankBadge rank={stats.data.rank} compact />}
              <IconButton onClick={() => navigate("/settings")} aria-label="Settings">
                <Settings className="h-[18px] w-[18px]" />
              </IconButton>
            </>
          }
        />
      </FadeUp>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        {/* Fasting hero */}
        <FadeUp delay={0.08}>
          <Card glass className="flex h-full flex-col items-center gap-5 py-7">
            {fast.isLoading ? (
              <div className="flex h-[220px] items-center">
                <Spinner />
              </div>
            ) : (
              <Ring size={230} stroke={14} progress={c.active ? c.progress : 0}>
                <div className="flex flex-col items-center gap-0.5">
                  {c.active ? (
                    <>
                      <Eyebrow className="tracking-[1.5px]">{c.done ? "Goal reached" : "Fasting"}</Eyebrow>
                      <span className="font-display text-[36px] font-bold text-foreground tabular">{humanDuration(c.elapsedMs, { seconds: true })}</span>
                      <Pixel className="text-[11px]">{c.done ? `+${humanDuration(-c.remainingMs)} extra` : `${humanDuration(c.remainingMs)} left`}</Pixel>
                    </>
                  ) : (
                    <>
                      <Eyebrow className="tracking-[1.5px]">Not fasting</Eyebrow>
                      <span className="font-display text-[30px] font-bold text-foreground">Ready?</span>
                      <Pixel className="text-[11px]">{profile.data?.defaultProtocol ?? "16:8"} protocol</Pixel>
                    </>
                  )}
                </div>
              </Ring>
            )}
            {c.active ? (
              <div className="flex gap-8">
                <Stat label="Started" value={clock(c.startAt)} />
                <Stat label="Window opens" value={clock(c.plannedEndAt)} />
              </div>
            ) : (
              <Pill label="Start fasting" size="lg" onClick={() => navigate("/fast")} icon={<Zap className="h-[18px] w-[18px]" />} />
            )}
            <div className="flex gap-6">
              <Stat label="Streak" value={stats.data?.currentStreak ?? 0} unit="days" pixel />
              <Stat label="Best" value={stats.data?.bestStreak ?? 0} unit="days" pixel />
              <Stat label="This week" value={stats.data?.weekHours ?? 0} unit="h" pixel />
            </div>
            {c.active && (
              <Link to="/fast" className="text-[13px] font-bold text-primary hover:underline">
                Manage fast →
              </Link>
            )}
          </Card>
        </FadeUp>

        {/* Today: macros + water + weight */}
        <FadeUp delay={0.16} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3.5">
            <SectionTitle
              title="Today's fuel"
              className="mb-0"
              action={
                <Link to="/scan" className="flex items-center gap-1 text-primary">
                  <Camera className="h-3.5 w-3.5" />
                  <Pixel className="text-[10px]">Scan meal</Pixel>
                </Link>
              }
            />
            <Link to="/food" className="flex items-end gap-1.5">
              <span className="font-display text-[34px] font-bold leading-none text-foreground">{Math.round(food.data?.totals.calories ?? 0)}</span>
              <Muted className="mb-1">/ {food.data?.targets.calories ?? profile.data?.calorieTarget ?? 2000} kcal</Muted>
            </Link>
            <MacroBar label="Protein" value={food.data?.totals.protein ?? 0} target={food.data?.targets.protein ?? 120} />
            <MacroBar label="Carbs" value={food.data?.totals.carbs ?? 0} target={food.data?.targets.carbs ?? 200} color="var(--accent)" />
            <MacroBar label="Sugar" value={food.data?.totals.sugar ?? 0} target={food.data?.targets.sugar ?? 50} color="var(--warning)" overIsBad />
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="flex flex-col items-center gap-2.5">
              <Link to="/water">
                <Ring size={92} stroke={9} progress={waterPct} color="var(--water)" glow={false}>
                  <Droplets className="h-6 w-6 text-water" />
                </Ring>
              </Link>
              <span className="font-display text-[16px] font-bold text-foreground">
                {water.data?.totalMl ?? 0}
                <Muted> / {water.data?.targetMl ?? 2500} ml</Muted>
              </span>
              <div className="flex gap-1.5">
                {[250, 500].map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => addWater.mutate({ date, amountMl: ml })}
                    disabled={addWater.isPending}
                    className="rounded-full bg-water/14 px-2.5 py-1.5 text-[12px] font-bold text-water transition hover:bg-water/25 active:scale-95"
                  >
                    +{ml}
                  </button>
                ))}
              </div>
            </Card>
            <Card onClick={() => navigate("/weight")} className="flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <Eyebrow>Weight</Eyebrow>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="font-display text-[28px] font-bold leading-none text-foreground">
                {weight.data?.latest ? weight.data.latest.weightKg.toFixed(1) : "—"}
                <Muted className="text-[13px]"> kg</Muted>
              </span>
              {weight.data?.weekDelta !== null && weight.data?.weekDelta !== undefined ? (
                <Pixel className="text-[10px]" color={weight.data.weekDelta <= 0 ? undefined : "var(--warning)"}>
                  {weight.data.weekDelta > 0 ? "+" : ""}
                  {weight.data.weekDelta} kg / 7d
                </Pixel>
              ) : weight.data?.toGoal !== null && weight.data?.toGoal !== undefined ? (
                <Pixel className="text-[10px]">{Math.abs(weight.data.toGoal).toFixed(1)} kg to goal</Pixel>
              ) : (
                <Muted className="text-[12px]">Click to log</Muted>
              )}
            </Card>
          </div>
        </FadeUp>
      </div>

      {/* Calendar + gallery */}
      <FadeUp delay={0.2}>
        <SectionTitle
          title="Your month"
          action={
            <Link to="/calendar" className="flex items-center gap-1 text-primary">
              <CalendarDays className="h-3.5 w-3.5" />
              <Pixel className="text-[10px]">Full calendar</Pixel>
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card className="flex flex-col gap-3">
            <Calendar compact selected={selectedDay} onSelect={setSelectedDay} />
            <Legend />
          </Card>
          <div className="flex flex-col gap-4">
            <Card className="flex flex-col gap-3">
              <DayDetails compact date={selectedDay} onAddExercise={() => setAddingExercise(true)} />
            </Card>
            <Card onClick={() => navigate("/gallery")} className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {(photos.data ?? []).slice(-3).reverse().map((p) => (
                  <img key={p.id} src={p.url} alt="" className="h-12 w-12 rounded-full border-2 border-card object-cover" />
                ))}
                {(photos.data?.length ?? 0) === 0 && (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-accent/50 text-accent">
                    <Images className="h-5 w-5" />
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-[15px] font-bold text-foreground">Before & after</span>
                <Muted className="text-[12px]">
                  {photos.isLoading ? "Loading…" : (photos.data?.length ?? 0) === 0 ? "Add your first progress photo" : `${photos.data!.length} photo${photos.data!.length === 1 ? "" : "s"} in your gallery`}
                </Muted>
              </div>
              <Pixel className="text-[10px] text-accent">Open →</Pixel>
            </Card>
          </div>
        </div>
        <ExerciseSheet open={addingExercise} onClose={() => setAddingExercise(false)} date={selectedDay} />
      </FadeUp>

      {/* Fuel suggestions */}
      <FadeUp delay={0.24}>
        <SectionTitle
          title="Fuel — today's picks"
          action={
            <button
              type="button"
              onClick={() => regenerate.mutate({ date, localHour: new Date().getHours() })}
              disabled={regenerate.isPending}
              className="flex items-center gap-1 text-primary disabled:opacity-50"
            >
              <Shuffle className="h-3.5 w-3.5" />
              <Pixel className="text-[10px]">{regenerate.isPending ? "Cooking…" : "Shuffle"}</Pixel>
            </button>
          }
        />
        {suggestions.isLoading || regenerate.isPending ? (
          <Card className="flex flex-col items-center gap-2.5 py-8">
            <img src="/images/ninja.png" alt="" className="h-16 w-16 animate-pulse object-contain" />
            <Muted className="text-[15px]">Your ninja chef is plating up ideas…</Muted>
          </Card>
        ) : suggestions.isError ? (
          <Card className="flex flex-col items-center gap-3">
            <Muted className="text-center text-[15px]">Fuel is recharging. Try again in a moment.</Muted>
            <Pill label="Retry" size="sm" variant="outline" onClick={() => suggestions.refetch()} />
          </Card>
        ) : suggestions.data && suggestions.data.items.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.data.items.map((it, i) => (
              <SuggestionCard key={`${it.title}-${i}`} item={it} />
            ))}
          </div>
        ) : (
          <Card>
            <Empty title="No picks yet" body="Hit shuffle to get today's suggestions." />
          </Card>
        )}
        {suggestions.data?.summary ? (
          <Display as="p" className="mt-3 font-body text-[13px] font-medium text-muted-foreground">
            {suggestions.data.summary}
          </Display>
        ) : null}
      </FadeUp>
    </div>
  );
}
