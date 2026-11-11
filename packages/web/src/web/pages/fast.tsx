import { useState } from "react";
import { CheckCircle2, Clock, Minus, Plus, PlusCircle, StopCircle, Trash2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { PageHeader } from "../components/layout";
import { Card, Chip, Confirm, Display, Empty, Eyebrow, FadeUp, IconButton, Muted, NumberField, Pill, Pixel, SectionTitle, Sheet, Spinner, Stat } from "../components/ui";
import { Ring } from "../components/Ring";
import { RankBadge, StreakHeatmap } from "../components/charts";
import { FastComplete } from "../components/fast-complete";
import { useFastClock } from "../hooks/use-fast-clock";
import { useActiveFast, useDeleteFast, useEditFastStart, useEndFast, useExtendFast, useFastHistory, useFastStats, useStartFast } from "../queries/fasts";
import { useProfile } from "../queries/profile";
import { clock, hoursBetween, humanDuration, shortDate } from "../lib/dates";
import { cancelFastAlarms, scheduleFastAlarms } from "../lib/notifications";

const PRESETS: { key: string; hours: number; blurb: string }[] = [
  { key: "16:8", hours: 16, blurb: "The classic. 16h fast, 8h window." },
  { key: "18:6", hours: 18, blurb: "Tighter window. Deeper fat burn." },
  { key: "20:4", hours: 20, blurb: "Warrior mode. 4h to eat." },
  { key: "OMAD", hours: 23, blurb: "One meal a day." },
  { key: "Extended", hours: 36, blurb: "24h+ — hydrate and listen to your body." },
  { key: "Custom", hours: 14, blurb: "Pick your own hours." },
];

export default function FastPage() {
  const profile = useProfile();
  const fast = useActiveFast();
  const stats = useFastStats();
  const history = useFastHistory(30);
  const start = useStartFast();
  const end = useEndFast();
  const extend = useExtendFast();
  const editStart = useEditFastStart();
  const del = useDeleteFast();
  const c = useFastClock(fast.data);

  const [protocol, setProtocol] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState<number | null>(14);
  const [startOffsetMin, setStartOffsetMin] = useState(0);
  const [sheet, setSheet] = useState<null | "custom" | "extend" | "edit" | "break">(null);
  const [extendHours, setExtendHours] = useState<number | null>(2);
  const [editDelta, setEditDelta] = useState(0);
  const [celebrate, setCelebrate] = useState<{ hours: number; protocol: string } | null>(null);

  const selected = protocol ?? profile.data?.defaultProtocol ?? "16:8";
  const preset = PRESETS.find((p) => p.key === selected) ?? PRESETS[0]!;
  const plannedHours = selected === "Custom" ? (customHours ?? 14) : preset.hours;

  const notif = () => ({ notifFastEnd: profile.data?.notifFastEnd ?? true, notifEatEnd: profile.data?.notifEatEnd ?? true });

  const doStart = async () => {
    const startAt = new Date(Date.now() + startOffsetMin * 60_000);
    const res = await start.mutateAsync({ protocol: selected, plannedHours, startAt });
    setStartOffsetMin(0);
    await scheduleFastAlarms({ plannedEndAt: new Date(res.plannedEndAt), plannedHours, ...notif() });
  };

  const doEnd = async () => {
    if (!fast.data) return;
    const hours = hoursBetween(new Date(fast.data.startAt), new Date());
    const proto = fast.data.protocol;
    const res = await end.mutateAsync({ id: fast.data.id });
    cancelFastAlarms();
    setSheet(null);
    if (res.status === "completed") setCelebrate({ hours, protocol: proto });
  };

  const doExtend = async () => {
    if (!fast.data || !extendHours) return;
    const res = await extend.mutateAsync({ id: fast.data.id, hours: extendHours });
    await scheduleFastAlarms({ plannedEndAt: new Date(res.plannedEndAt), plannedHours: res.plannedHours, ...notif() });
    setSheet(null);
  };

  const doEditStart = async () => {
    if (!fast.data) return;
    const startAt = new Date(new Date(fast.data.startAt).getTime() + editDelta * 60_000);
    const res = await editStart.mutateAsync({ id: fast.data.id, startAt });
    await scheduleFastAlarms({ plannedEndAt: new Date(res.plannedEndAt), plannedHours: res.plannedHours, ...notif() });
    setEditDelta(0);
    setSheet(null);
  };

  const ringLabel = c.active ? (c.done ? "Goal smashed" : "Fasting") : "Ready to fast";

  return (
    <div className="flex flex-col gap-5">
      <FadeUp>
        <PageHeader eyebrow="Fast" title={c.active ? "In the shadows" : "Choose your path"} right={stats.data && <RankBadge rank={stats.data.rank} compact />} />
      </FadeUp>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <FadeUp delay={0.08}>
          <motion.div
            animate={c.active && c.done ? { scale: [1, 1.015, 1] } : { scale: 1 }}
            transition={c.active && c.done ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
          >
            <Card glass className="flex flex-col items-center gap-5 py-7">
              {fast.isLoading ? (
                <div className="flex h-[250px] items-center">
                  <Spinner />
                </div>
              ) : (
                <Ring size={250} stroke={16} progress={c.active ? c.progress : 0} color={c.active && c.done ? "var(--accent)" : undefined}>
                  <div className="flex flex-col items-center gap-1">
                    <Eyebrow className="tracking-[1.5px]">{ringLabel}</Eyebrow>
                    <span className={`font-display font-bold text-foreground tabular ${c.active ? "text-[40px]" : "text-[34px]"}`}>
                      {c.active ? humanDuration(c.elapsedMs, { seconds: true }) : `${plannedHours}h`}
                    </span>
                    <Pixel className="text-[11px]">
                      {c.active
                        ? c.done
                          ? `+${humanDuration(-c.remainingMs)} beyond goal`
                          : `${humanDuration(c.remainingMs)} to go`
                        : selected === "Custom"
                          ? "custom fast"
                          : `${selected} protocol`}
                    </Pixel>
                  </div>
                </Ring>
              )}

              {c.active ? (
                <>
                  <div className="flex gap-7">
                    <Stat label="Started" value={clock(c.startAt)} />
                    <Stat label="Goal" value={`${fast.data?.plannedHours}h`} />
                    <Stat label="Window opens" value={clock(c.plannedEndAt)} />
                  </div>
                  <div className="flex w-full flex-col gap-2.5">
                    <Pill
                      label={c.done ? "Complete fast" : "End fast early"}
                      size="lg"
                      variant={c.done ? "primary" : "outline"}
                      onClick={() => (c.done ? doEnd() : setSheet("break"))}
                      loading={end.isPending}
                      icon={c.done ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <StopCircle className="h-[18px] w-[18px]" />}
                    />
                    <div className="flex gap-2.5">
                      <Pill label="Extend" variant="ghost" className="flex-1" onClick={() => setSheet("extend")} icon={<PlusCircle className="h-4 w-4" />} />
                      <Pill label="Edit start" variant="ghost" className="flex-1" onClick={() => setSheet("edit")} icon={<Clock className="h-4 w-4" />} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex w-full flex-col gap-3.5">
                  <div className="flex flex-wrap justify-center gap-2">
                    {PRESETS.map((p) => (
                      <Chip
                        key={p.key}
                        label={p.key}
                        active={selected === p.key}
                        onClick={() => {
                          setProtocol(p.key);
                          if (p.key === "Custom") setSheet("custom");
                        }}
                      />
                    ))}
                  </div>
                  <Muted className="text-center">{preset.blurb}</Muted>
                  <div className="flex items-center justify-center gap-2.5">
                    <Muted>Started</Muted>
                    <IconButton className="h-8 w-8" onClick={() => setStartOffsetMin((m) => Math.max(-720, m - 30))} aria-label="Earlier">
                      <Minus className="h-4 w-4" />
                    </IconButton>
                    <span className="min-w-[90px] text-center text-[14px] font-bold text-foreground">
                      {startOffsetMin === 0 ? "now" : `${humanDuration(-startOffsetMin * 60_000)} ago`}
                    </span>
                    <IconButton className="h-8 w-8" onClick={() => setStartOffsetMin((m) => Math.min(0, m + 30))} aria-label="Later">
                      <Plus className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <Pill label={`Start ${plannedHours}h fast`} size="lg" onClick={doStart} loading={start.isPending} icon={<Zap className="h-[18px] w-[18px]" />} />
                </div>
              )}
            </Card>
          </motion.div>
        </FadeUp>

        <FadeUp delay={0.16}>
          <Card className="flex h-full flex-col gap-4">
            <div className="flex justify-around">
              <Stat label="Streak" value={stats.data?.currentStreak ?? 0} unit="days" pixel />
              <Stat label="Best" value={stats.data?.bestStreak ?? 0} unit="days" pixel />
              <Stat label="Completed" value={stats.data?.totalCompleted ?? 0} pixel />
              <Stat label="This week" value={stats.data?.weekHours ?? 0} unit="h" pixel />
            </div>
            {stats.isLoading && (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )}
            {stats.data && (
              <>
                <div>
                  <Eyebrow>Last 12 weeks</Eyebrow>
                  <div className="mt-2">
                    <StreakHeatmap cells={stats.data.heatmap} />
                  </div>
                </div>
                <div className="mt-auto border-t border-border pt-4">
                  <RankBadge rank={stats.data.rank} />
                </div>
              </>
            )}
          </Card>
        </FadeUp>
      </div>

      <FadeUp delay={0.24}>
        <SectionTitle title="History" />
        {history.isLoading ? (
          <Card className="flex justify-center py-8">
            <Spinner />
          </Card>
        ) : history.data && history.data.length === 0 ? (
          <Card>
            <Empty title="No fasts yet" body="Your first completed fast puts you on the board." />
          </Card>
        ) : (
          <Card className="p-1.5">
            {history.data?.map((f, i) => {
              const endAt = f.endedAt ? new Date(f.endedAt) : new Date();
              const hrs = hoursBetween(new Date(f.startAt), endAt);
              const tone = f.status === "completed" ? "var(--primary)" : f.status === "broken" ? "var(--destructive)" : "var(--accent)";
              return (
                <div key={f.id} className={`flex items-center justify-between gap-3 p-3 ${i === 0 ? "" : "border-t border-border"}`}>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone }} />
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-foreground">
                        {f.protocol} · {hrs}h
                      </span>
                      <Muted>
                        {shortDate(new Date(f.startAt))} {clock(new Date(f.startAt))} → {f.endedAt ? clock(endAt) : "now"}
                      </Muted>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pixel className="text-[10px]" color={tone}>
                      {f.status}
                    </Pixel>
                    {f.status !== "active" && (
                      <button type="button" onClick={() => del.mutate({ id: f.id })} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </FadeUp>

      <Sheet open={sheet === "custom"} onClose={() => setSheet(null)} title="Custom fast" subtitle="1 to 168 hours. Anything over 24h counts as extended.">
        <NumberField label="Fasting hours" value={customHours} onChange={setCustomHours} suffix="h" />
        <div className="flex flex-wrap gap-2">
          {[12, 14, 16, 18, 20, 24, 36, 48, 72].map((h) => (
            <Chip key={h} label={`${h}h`} active={customHours === h} onClick={() => setCustomHours(h)} />
          ))}
        </div>
        <Pill label="Use this" onClick={() => setSheet(null)} disabled={!customHours || customHours < 1 || customHours > 168} />
      </Sheet>

      <Sheet open={sheet === "extend"} onClose={() => setSheet(null)} title="Extend fast" subtitle="Push the goal further out. Alarms move with it.">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 4, 6, 12, 24].map((h) => (
            <Chip key={h} label={`+${h}h`} active={extendHours === h} onClick={() => setExtendHours(h)} />
          ))}
        </div>
        <NumberField label="Hours to add" value={extendHours} onChange={setExtendHours} suffix="h" />
        <Pill label={`Extend by ${extendHours ?? 0}h`} onClick={doExtend} loading={extend.isPending} disabled={!extendHours} />
      </Sheet>

      <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Edit start time" subtitle="Forgot to hit start? Shift it back.">
        <div className="flex items-center justify-center gap-3.5">
          <IconButton onClick={() => setEditDelta((d) => d - 15)} aria-label="Earlier">
            <Minus className="h-[18px] w-[18px]" />
          </IconButton>
          <div className="flex min-w-[140px] flex-col items-center">
            <Display as="span" className="text-[24px]">
              {c.active ? clock(new Date(c.startAt.getTime() + editDelta * 60_000)) : "--"}
            </Display>
            <Muted>{editDelta === 0 ? "unchanged" : `${editDelta > 0 ? "+" : ""}${editDelta} min`}</Muted>
          </div>
          <IconButton
            onClick={() => setEditDelta((d) => Math.min(d + 15, c.active ? Math.floor((Date.now() - c.startAt.getTime()) / 60_000) : 0))}
            aria-label="Later"
          >
            <Plus className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
        <Pill label="Save start time" onClick={doEditStart} loading={editStart.isPending} disabled={editDelta === 0} />
      </Sheet>

      <Confirm
        open={sheet === "break"}
        onClose={() => setSheet(null)}
        onConfirm={doEnd}
        loading={end.isPending}
        danger
        title="End fast early?"
        body={c.active ? `You're ${humanDuration(c.elapsedMs)} in. Ending now logs it as broken — no streak credit, but the hours still count.` : undefined}
        confirmLabel="End fast"
      />

      <FastComplete data={celebrate} onClose={() => setCelebrate(null)} />
    </div>
  );
}
