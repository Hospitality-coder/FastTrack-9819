import { useEffect, useState } from "react";
import { AlarmClock, Droplet, Droplets, SlidersHorizontal, Trash2, X } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Card, Chip, Empty, FadeUp, Field, IconButton, Muted, NumberField, Pill, Pixel, SectionTitle, Sheet, Spinner, ToggleRow } from "../components/ui";
import { Ring } from "../components/Ring";
import { WeekBars } from "../components/charts";
import { useAddWater, useDeleteWater, useSetWaterReminders, useWaterHistory, useWaterReminders, useWaterToday } from "../queries/water";
import { useProfile, useUpdateProfile } from "../queries/profile";
import { notificationsSupported, permissionState, reminderTimes, scheduleWaterReminders } from "../lib/notifications";
import { clock, today } from "../lib/dates";

const QUICK = [150, 250, 500, 750];
const INTERVALS = [30, 60, 90, 120, 180];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const WATER = "var(--water)";

/** Time input that only commits valid HH:mm values. */
function TimeField({ label, value, onCommit }: { label: string; value: string; onCommit: (t: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Field
      label={label}
      value={text}
      placeholder="08:00"
      maxLength={5}
      autoCapitalize="none"
      onChangeText={(t) => {
        setText(t);
        if (TIME_RE.test(t)) onCommit(t);
      }}
      onBlur={() => !TIME_RE.test(text) && setText(value)}
    />
  );
}

export default function WaterPage() {
  const date = today();
  const water = useWaterToday(date);
  const history = useWaterHistory(7);
  const reminders = useWaterReminders();
  const profile = useProfile();
  const add = useAddWater(date);
  const del = useDeleteWater();
  const setReminders = useSetWaterReminders();
  const updateProfile = useUpdateProfile();

  const [customOpen, setCustomOpen] = useState(false);
  const [customMl, setCustomMl] = useState<number | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetMl, setTargetMl] = useState<number | null>(null);
  const [newTime, setNewTime] = useState("");

  const total = water.data?.totalMl ?? 0;
  const target = water.data?.targetMl ?? profile.data?.waterTargetMl ?? 2500;
  const progress = Math.min(1, total / target);
  const left = Math.max(0, target - total);
  const r = reminders.data;
  const notifOn = profile.data?.notifWater ?? true;
  const perm = permissionState();

  useEffect(() => {
    if (!r || !notificationsSupported) return;
    void scheduleWaterReminders({ ...r, enabled: r.enabled && notifOn });
  }, [r, notifOn]);

  const logWater = (ml: number) => add.mutate({ date, amountMl: ml });
  const patchReminders = (patch: Parameters<typeof setReminders.mutate>[0]) => setReminders.mutate(patch);

  const addCustomTime = () => {
    const t = newTime.trim();
    if (!TIME_RE.test(t) || !r) return;
    const next = Array.from(new Set([...(r.customTimes ?? []), t])).sort();
    patchReminders({ customTimes: next });
    setNewTime("");
  };

  const previewTimes = r ? reminderTimes(r) : [];
  const fmtTotal = total >= 1000 ? (total / 1000).toFixed(2).replace(/\.?0+$/, "") : String(total);

  return (
    <>
      <PageHeader
        eyebrow="Hydration"
        title="Water"
        color={WATER}
        right={
          <IconButton
            aria-label="Daily target"
            onClick={() => {
              setTargetMl(target);
              setTargetOpen(true);
            }}
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" />
          </IconButton>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <FadeUp>
            <Card glass className="flex flex-col items-center gap-5 py-7">
              {water.isLoading ? (
                <div className="flex h-[220px] items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <Ring size={220} stroke={16} progress={progress} color={WATER}>
                  <div className="flex flex-col items-center">
                    <Droplet className="h-6 w-6 text-water" fill="currentColor" />
                    <span className="mt-1 font-display text-[40px] font-bold leading-none text-foreground tabular">{fmtTotal}</span>
                    <Muted>{total >= 1000 ? "litres" : "ml"} today</Muted>
                    <Pixel className="mt-2" color={progress >= 1 ? "var(--primary)" : WATER}>
                      {progress >= 1 ? "Goal smashed" : `${left} ml to go`}
                    </Pixel>
                  </div>
                </Ring>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => logWater(ml)}
                    className="h-11 rounded-full border border-water bg-water/12 px-4 text-[14px] font-extrabold text-foreground transition hover:bg-water hover:text-primary-foreground active:scale-95"
                  >
                    +{ml} ml
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCustomMl(null);
                    setCustomOpen(true);
                  }}
                  className="h-11 rounded-full border border-border bg-white/5 px-4 text-[14px] font-extrabold text-foreground transition hover:bg-white/10 active:scale-95"
                >
                  Custom
                </button>
              </div>
              <Muted>Target {target} ml / day</Muted>
            </Card>
          </FadeUp>

          <FadeUp delay={0.08}>
            <Card className="flex flex-col gap-3">
              <SectionTitle title="Last 7 days" className="mb-0" action={<Muted>dashed = target</Muted>} />
              {history.isLoading ? (
                <div className="flex h-[150px] items-center justify-center">
                  <Spinner />
                </div>
              ) : (
                <WeekBars
                  bars={(history.data ?? []).map((d) => ({ date: d.date, value: d.totalMl }))}
                  target={target}
                  color={WATER}
                  format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}`)}
                />
              )}
            </Card>
          </FadeUp>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <FadeUp delay={0.12}>
            <Card className="flex flex-col gap-3">
              <SectionTitle title="Reminders" className="mb-0" action={<AlarmClock className="h-[18px] w-[18px] text-water" />} />
              {!notificationsSupported ? (
                <Muted className="text-warning">This browser can't show notifications. Your schedule is still saved and fires in the mobile app.</Muted>
              ) : perm === "denied" ? (
                <Muted className="text-warning">Notifications are blocked for this site. Allow them in your browser settings to get water alarms.</Muted>
              ) : (
                <Muted>Browser reminders fire while FastTrack is open in a tab. The mobile app alarms work in the background.</Muted>
              )}
              {reminders.isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (
                <>
                  <ToggleRow
                    label="Water alarms"
                    body="Nudges you to drink during your active hours"
                    color={WATER}
                    value={(r?.enabled ?? true) && notifOn}
                    onChange={(v) => {
                      patchReminders({ enabled: v });
                      if (v && !notifOn) updateProfile.mutate({ notifWater: true });
                    }}
                  />
                  {r && r.enabled && notifOn && (
                    <>
                      <div className="flex gap-2">
                        <Chip label="Every X minutes" active={r.mode === "interval"} color={WATER} onClick={() => patchReminders({ mode: "interval" })} />
                        <Chip label="Custom times" active={r.mode === "custom"} color={WATER} onClick={() => patchReminders({ mode: "custom" })} />
                      </div>

                      {r.mode === "interval" ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap gap-2">
                            {INTERVALS.map((m) => (
                              <Chip
                                key={m}
                                label={m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? "30" : ""}`}
                                active={r.intervalMin === m}
                                color={WATER}
                                onClick={() => patchReminders({ intervalMin: m })}
                              />
                            ))}
                          </div>
                          <div className="flex gap-3">
                            <TimeField label="Active from" value={r.activeFrom} onCommit={(t) => patchReminders({ activeFrom: t })} />
                            <TimeField label="Until" value={r.activeTo} onCommit={(t) => patchReminders({ activeTo: t })} />
                          </div>
                          <Muted>
                            {previewTimes.length} alarms/day · {previewTimes.slice(0, 5).join(", ")}
                            {previewTimes.length > 5 ? "…" : ""}
                          </Muted>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap gap-2">
                            {(r.customTimes ?? []).length === 0 && <Muted>No times yet. Add one below (24h, e.g. 09:30).</Muted>}
                            {(r.customTimes ?? []).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => patchReminders({ customTimes: (r.customTimes ?? []).filter((x) => x !== t) })}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-water bg-water/12 px-3 font-pixel text-[12px] text-foreground transition hover:bg-destructive/20 hover:border-destructive"
                              >
                                {t}
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                          <form
                            className="flex items-end gap-3"
                            onSubmit={(e) => {
                              e.preventDefault();
                              addCustomTime();
                            }}
                          >
                            <Field label="Add time" value={newTime} onChangeText={setNewTime} placeholder="14:30" maxLength={5} autoCapitalize="none" />
                            <Pill label="Add" variant="water" type="submit" className="h-12" disabled={!TIME_RE.test(newTime.trim())} />
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </Card>
          </FadeUp>

          <FadeUp delay={0.16}>
            <SectionTitle title="Today's log" action={<Muted>{water.data?.entries.length ?? 0} drinks</Muted>} />
            <Card className="p-1.5">
              {water.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : water.data && water.data.entries.length === 0 ? (
                <Empty title="Dry so far" body="Tap a quick-add. Your first glass starts the streak." art={<Droplets className="mb-1 h-12 w-12 text-water/60" />} />
              ) : (
                water.data?.entries.map((e, i) => (
                  <div key={e.id} className={i === 0 ? "flex items-center justify-between p-3" : "flex items-center justify-between border-t border-border p-3"}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-water/12">
                        <Droplet className="h-4 w-4 text-water" fill="currentColor" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-foreground">{e.amountMl} ml</span>
                        <Muted>{clock(new Date(e.loggedAt))}</Muted>
                      </div>
                    </div>
                    <IconButton aria-label="Delete" className="h-9 w-9 border-0 bg-transparent hover:text-destructive" onClick={() => del.mutate({ id: e.id })}>
                      <Trash2 className="h-[18px] w-[18px]" />
                    </IconButton>
                  </div>
                ))
              )}
            </Card>
          </FadeUp>
        </div>
      </div>

      {/* Custom amount */}
      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Custom amount" subtitle="How much did you drink?">
        <NumberField label="Amount" suffix="ml" value={customMl} onChange={setCustomMl} placeholder="330" />
        <Pill
          label="Log it"
          variant="water"
          size="lg"
          disabled={!customMl || customMl <= 0 || customMl > 5000}
          onClick={() => {
            if (customMl) logWater(Math.round(customMl));
            setCustomOpen(false);
          }}
        />
      </Sheet>

      {/* Daily target */}
      <Sheet open={targetOpen} onClose={() => setTargetOpen(false)} title="Daily water target" subtitle="2.5 L is a solid default for most adults.">
        <NumberField label="Target" suffix="ml" value={targetMl} onChange={setTargetMl} />
        <div className="flex flex-wrap gap-2">
          {[2000, 2500, 3000, 3500].map((v) => (
            <Chip key={v} label={`${v / 1000} L`} active={targetMl === v} color={WATER} onClick={() => setTargetMl(v)} />
          ))}
        </div>
        <Pill
          label="Save target"
          variant="water"
          size="lg"
          loading={updateProfile.isPending}
          disabled={!targetMl || targetMl < 500 || targetMl > 10000}
          onClick={() => {
            if (targetMl) updateProfile.mutate({ waterTargetMl: Math.round(targetMl) });
            setTargetOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
