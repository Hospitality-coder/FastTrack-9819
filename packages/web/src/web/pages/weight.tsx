import { useState } from "react";
import { Link } from "wouter";
import { Pencil, Plus, Settings, Trash2, TrendingDown } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Card, Chip, Empty, FadeUp, Field, IconButton, Muted, NumberField, Pill, Pixel, SectionTitle, Sheet, Spinner, Stat } from "../components/ui";
import { LineChart } from "../components/charts";
import { useDeleteWeight, useLogWeight, useWeightList, useWeightSummary } from "../queries/weight";
import { useUpdateProfile } from "../queries/profile";
import { addDays, prettyDate, today } from "../lib/dates";
import { cn } from "../lib/utils";

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
] as const;

const C = {
  primary: "var(--primary)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  fg: "var(--foreground)",
  muted: "var(--muted-foreground)",
};

function delta(n: number | null | undefined, suffix = " kg") {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${suffix}`;
}

export default function WeightPage() {
  const [days, setDays] = useState<number>(90);
  const list = useWeightList(days);
  const summary = useWeightSummary();
  const log = useLogWeight();
  const del = useDeleteWeight();
  const updateProfile = useUpdateProfile();

  const [logOpen, setLogOpen] = useState(false);
  const [kg, setKg] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [logDate, setLogDate] = useState(today());
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalKg, setGoalKg] = useState<number | null>(null);

  const s = summary.data;
  const latest = s?.latest;
  const points = (list.data ?? []).map((e) => ({ date: e.date, value: e.weightKg }));
  const goal = s?.goal ?? "lose";

  const toGoalColor =
    s?.toGoal === null || s?.toGoal === undefined
      ? C.muted
      : Math.abs(s.toGoal) < 0.5
        ? C.primary
        : goal === "lose"
          ? s.toGoal > 0
            ? C.warning
            : C.primary
          : goal === "gain"
            ? s.toGoal < 0
              ? C.warning
              : C.primary
            : C.fg;

  const deltaColor = (n: number | null | undefined) => {
    if (n === null || n === undefined || n === 0) return C.fg;
    if (goal === "maintain") return Math.abs(n) < 1 ? C.primary : C.warning;
    const good = goal === "lose" ? n < 0 : n > 0;
    return good ? C.primary : C.destructive;
  };

  const openLog = () => {
    setKg(latest?.weightKg ?? null);
    setNote("");
    setLogDate(today());
    setLogOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Body"
        title="Weight"
        right={
          <Link to="/settings" aria-label="Settings" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/5 text-foreground transition hover:bg-white/10">
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-5">
          {/* Hero */}
          <FadeUp>
            <Card glass className="flex flex-col gap-5">
              {summary.isLoading ? (
                <div className="flex h-[160px] items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col">
                      <Muted className="text-[11px] uppercase tracking-[1px]">Current</Muted>
                      <div className="flex items-end gap-1.5">
                        <span className="font-display text-[44px] font-bold leading-none text-foreground tabular">{latest ? latest.weightKg : "--"}</span>
                        <Muted className="mb-1.5">kg</Muted>
                      </div>
                      <Muted>{latest ? `Logged ${prettyDate(latest.date)}` : "No entries yet"}</Muted>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGoalKg(s?.goalWeightKg ?? null);
                        setGoalOpen(true);
                      }}
                      className="flex flex-col items-end gap-0.5 rounded-md p-1 text-right transition hover:bg-white/5"
                    >
                      <Muted className="text-[11px] uppercase tracking-[1px]">Goal</Muted>
                      <span className="flex items-center gap-1">
                        <span className="font-display text-[22px] font-bold text-accent tabular">{s?.goalWeightKg ?? "set"}</span>
                        {s?.goalWeightKg ? <Muted>kg</Muted> : null}
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </span>
                      {s?.toGoal !== null && s?.toGoal !== undefined ? (
                        <Pixel className="text-[11px]" color={toGoalColor}>
                          {Math.abs(s.toGoal) < 0.5 ? "At goal" : `${Math.abs(s.toGoal)} kg ${s.toGoal > 0 ? "above" : "below"}`}
                        </Pixel>
                      ) : null}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="7 days" value={delta(s?.weekDelta, "")} unit="kg" color={deltaColor(s?.weekDelta)} />
                    <Stat label="30 days" value={delta(s?.monthDelta, "")} unit="kg" color={deltaColor(s?.monthDelta)} />
                    <Stat label="All time" value={delta(s?.totalDelta, "")} unit="kg" color={deltaColor(s?.totalDelta)} />
                    <Stat label="BMI" value={s?.bmi ?? "—"} />
                  </div>

                  <Pill label="Log weight" size="lg" onClick={openLog} icon={<Plus className="h-5 w-5" />} />
                </>
              )}
            </Card>
          </FadeUp>

          {/* History */}
          <FadeUp delay={0.1}>
            <SectionTitle title="History" action={<Muted>{s?.entries ?? 0} entries</Muted>} />
            <Card className="p-1.5">
              {list.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : list.data && list.data.length === 0 ? (
                <Empty title="Nothing logged" body="Weigh in at the same time each day — mornings after the bathroom are most consistent." />
              ) : (
                [...(list.data ?? [])].reverse().map((e, i, arr) => {
                  const prev = arr[i + 1];
                  const d = prev ? Math.round((e.weightKg - prev.weightKg) * 10) / 10 : null;
                  return (
                    <div key={e.id} className={cn("flex items-center justify-between gap-3 p-3", i !== 0 && "border-t border-border")}>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] font-bold text-foreground">{prettyDate(e.date)}</span>
                        {e.note ? <Muted className="truncate">{e.note}</Muted> : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="font-display text-[16px] font-bold text-foreground tabular">{e.weightKg} kg</span>
                          {d !== null ? (
                            <span className="text-[11px] tabular" style={{ color: deltaColor(d) }}>
                              {delta(d)}
                            </span>
                          ) : null}
                        </div>
                        <IconButton aria-label="Delete" className="h-9 w-9 border-0 bg-transparent hover:text-destructive" onClick={() => del.mutate({ id: e.id })}>
                          <Trash2 className="h-[18px] w-[18px]" />
                        </IconButton>
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </FadeUp>
        </div>

        {/* Chart */}
        <FadeUp delay={0.06}>
          <Card className="flex flex-col gap-3">
            <SectionTitle
              title="Trend"
              className="mb-0"
              action={
                <div className="flex gap-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => setDays(r.days)}
                      className={cn("rounded-sm px-2 py-1 font-pixel text-[11px] uppercase transition", days === r.days ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              }
            />
            {list.isLoading ? (
              <div className="flex h-[260px] items-center justify-center">
                <Spinner />
              </div>
            ) : points.length >= 2 ? (
              <LineChart points={points} goal={s?.goalWeightKg} unit="kg" height={300} />
            ) : (
              <div className="flex h-[260px] items-center justify-center">
                <Empty
                  title={points.length === 1 ? "One point down" : "No trend yet"}
                  body={points.length === 1 ? "Log again tomorrow and the line appears." : "Log your weight a couple of times to see the curve."}
                  art={<TrendingDown className="mb-1 h-10 w-10 text-primary" />}
                />
              </div>
            )}
          </Card>
        </FadeUp>
      </div>

      {/* Log sheet */}
      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="Log weight" subtitle="One entry per day — logging again replaces it.">
        <div className="flex flex-wrap gap-2">
          {[0, -1, -2].map((n) => (
            <Chip key={n} label={prettyDate(addDays(today(), n))} active={logDate === addDays(today(), n)} onClick={() => setLogDate(addDays(today(), n))} />
          ))}
        </div>
        <NumberField label="Weight" suffix="kg" value={kg} onChange={setKg} placeholder="72.4" />
        <div className="flex flex-wrap gap-2">
          {[-0.5, -0.1, 0.1, 0.5].map((step) => (
            <Chip key={step} label={`${step > 0 ? "+" : ""}${step}`} onClick={() => setKg(Math.round(((kg ?? latest?.weightKg ?? 70) + step) * 10) / 10)} />
          ))}
        </div>
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Morning, after workout…" maxLength={120} />
        <Pill
          label="Save"
          size="lg"
          loading={log.isPending}
          disabled={!kg || kg < 20 || kg > 400}
          onClick={() => {
            if (!kg) return;
            log.mutate({ date: logDate, weightKg: Math.round(kg * 10) / 10, note: note.trim() || undefined }, { onSuccess: () => setLogOpen(false) });
          }}
        />
      </Sheet>

      {/* Goal sheet */}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Goal weight" subtitle="The dashed line on your chart.">
        <NumberField label="Goal" suffix="kg" value={goalKg} onChange={setGoalKg} placeholder="68" />
        <div className="flex gap-3">
          <Pill
            label="Clear"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              updateProfile.mutate({ goalWeightKg: null });
              setGoalOpen(false);
            }}
          />
          <Pill
            label="Save goal"
            className="flex-1"
            disabled={!goalKg || goalKg < 20 || goalKg > 400}
            onClick={() => {
              if (goalKg) updateProfile.mutate({ goalWeightKg: Math.round(goalKg * 10) / 10 });
              setGoalOpen(false);
            }}
          />
        </div>
      </Sheet>
    </>
  );
}
