import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Check, Download, Smartphone } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { canInstall, isIos, isStandalone, promptInstall, subscribeInstall } from "../lib/pwa";
import { Card, Chip, Confirm, Eyebrow, FadeUp, Field, IconButton, Muted, NumberField, Pill, Pixel, SectionTitle, Spinner, ToggleRow } from "../components/ui";
import { useProfile, useResetData, useUpdateProfile } from "../queries/profile";
import { useWaterReminders } from "../queries/water";
import { cancelFastAlarms, notificationsSupported, permissionState, requestPermission, scheduleWaterReminders } from "../lib/notifications";

const GOALS = [
  { key: "lose", label: "Lose fat" },
  { key: "maintain", label: "Maintain" },
  { key: "gain", label: "Build" },
] as const;
const PROTOCOLS = ["16:8", "18:6", "20:4", "OMAD", "Extended", "Custom"];

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const profile = useProfile();
  const update = useUpdateProfile();
  const reset = useResetData();
  const [installable, setInstallable] = useState(canInstall());
  const standalone = isStandalone();
  useEffect(() => subscribeInstall(() => setInstallable(canInstall())), []);
  const reminders = useWaterReminders();
  const p = profile.data;

  const [name, setName] = useState("");
  const [height, setHeight] = useState<number | null>(null);
  const [goalKg, setGoalKg] = useState<number | null>(null);
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [sugar, setSugar] = useState<number | null>(null);
  const [waterMl, setWaterMl] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!p || hydrated) return;
    setName(p.name);
    setHeight(p.heightCm);
    setGoalKg(p.goalWeightKg);
    setKcal(p.calorieTarget);
    setProtein(p.proteinTarget);
    setCarbs(p.carbTarget);
    setSugar(p.sugarTarget);
    setWaterMl(p.waterTargetMl);
    setHydrated(true);
  }, [p, hydrated]);

  const clampInt = (n: number | null, min: number, max: number, fallback: number) => (n === null ? fallback : Math.min(max, Math.max(min, Math.round(n))));

  const saveTargets = () => {
    if (!p) return;
    update.mutate(
      {
        name: name.trim() || p.name,
        heightCm: height === null ? null : Math.min(260, Math.max(80, height)),
        goalWeightKg: goalKg === null ? null : Math.min(400, Math.max(20, Math.round(goalKg * 10) / 10)),
        calorieTarget: clampInt(kcal, 800, 8000, p.calorieTarget),
        proteinTarget: clampInt(protein, 10, 500, p.proteinTarget),
        carbTarget: clampInt(carbs, 0, 1000, p.carbTarget),
        sugarTarget: clampInt(sugar, 0, 500, p.sugarTarget),
        waterTargetMl: clampInt(waterMl, 500, 10000, p.waterTargetMl),
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
        },
      },
    );
  };

  const toggleNotif = async (key: "notifFastEnd" | "notifEatEnd" | "notifWater", v: boolean) => {
    if (v && notificationsSupported) {
      const ok = await requestPermission();
      if (!ok) return;
    }
    update.mutate({ [key]: v });
    if (key === "notifWater" && reminders.data) {
      void scheduleWaterReminders({ ...reminders.data, enabled: reminders.data.enabled && v });
    }
  };

  const perm = permissionState();

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <IconButton aria-label="Back" onClick={() => (window.history.length > 1 ? window.history.back() : navigate("/"))}>
          <ChevronLeft className="h-[18px] w-[18px]" />
        </IconButton>
        <div className="flex flex-col">
          <Pixel>Dojo</Pixel>
          <h1 className="mt-0.5 font-display text-[26px] font-bold leading-[1.1] text-foreground md:text-[34px]">Settings</h1>
        </div>
      </div>

      {profile.isLoading || !p ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            {/* Profile */}
            <FadeUp>
              <Card className="flex flex-col gap-4">
                <SectionTitle title="You" className="mb-0" />
                <div className="flex items-center gap-4">
                  <Avatar size={72} />
                  <div className="flex flex-col gap-1">
                    <span className="text-[14px] font-bold text-foreground">Profile selfie</span>
                    <Muted className="text-[12px]">Tap the circle to upload or change it. Shows next to your name on Home.</Muted>
                    {p.avatarUrl && (
                      <button type="button" onClick={() => update.mutate({ avatarUrl: null })} className="self-start text-[12px] font-bold text-destructive hover:underline">
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
                <Field label="Name" value={name} onChangeText={setName} placeholder="Shinobi" maxLength={40} />
                <div className="flex flex-col gap-2">
                  <Eyebrow>Goal</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <Chip key={g.key} label={g.label} active={p.goal === g.key} onClick={() => update.mutate({ goal: g.key })} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <NumberField label="Height" suffix="cm" value={height} onChange={setHeight} placeholder="175" />
                  <NumberField label="Goal weight" suffix="kg" value={goalKg} onChange={setGoalKg} placeholder="70" />
                </div>
              </Card>
            </FadeUp>

            {/* Fasting */}
            <FadeUp delay={0.06}>
              <Card className="flex flex-col gap-4">
                <SectionTitle title="Fasting" className="mb-0" />
                <div className="flex flex-col gap-2">
                  <Eyebrow>Default protocol</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {PROTOCOLS.map((k) => (
                      <Chip key={k} label={k} active={p.defaultProtocol === k} onClick={() => update.mutate({ defaultProtocol: k })} />
                    ))}
                  </div>
                </div>
              </Card>
            </FadeUp>

            {/* Targets */}
            <FadeUp delay={0.1}>
              <Card className="flex flex-col gap-4">
                <SectionTitle title="Daily targets" className="mb-0" />
                <div className="flex gap-3">
                  <NumberField label="Calories" suffix="kcal" value={kcal} onChange={setKcal} />
                  <NumberField label="Protein" suffix="g" value={protein} onChange={setProtein} />
                </div>
                <div className="flex gap-3">
                  <NumberField label="Carbs" suffix="g" value={carbs} onChange={setCarbs} />
                  <NumberField label="Sugar limit" suffix="g" value={sugar} onChange={setSugar} />
                </div>
                <NumberField label="Water" suffix="ml" value={waterMl} onChange={setWaterMl} />
                <Pill label={saved ? "Saved" : "Save changes"} loading={update.isPending} onClick={saveTargets} icon={saved ? <Check className="h-[18px] w-[18px]" /> : undefined} />
              </Card>
            </FadeUp>
          </div>

          <div className="flex flex-col gap-5">
            {/* Notifications */}
            <FadeUp delay={0.08}>
              <Card className="flex flex-col gap-1.5">
                <SectionTitle title="Alarms" className="mb-1.5" />
                {!notificationsSupported ? (
                  <Muted className="mb-1.5 text-warning">This browser can't show notifications. Alarms fire on the installed iOS / Android app; settings still save here.</Muted>
                ) : perm === "denied" ? (
                  <Muted className="mb-1.5 text-warning">Notifications are blocked for this site. Allow them in your browser settings.</Muted>
                ) : (
                  <Muted className="mb-1.5">Browser alarms fire while a FastTrack tab is open. The mobile app alarms work in the background.</Muted>
                )}
                <ToggleRow label="Fast complete" body="When your fasting window ends" value={p.notifFastEnd} onChange={(v) => void toggleNotif("notifFastEnd", v)} />
                <ToggleRow label="Eating window closing" body="When it's time to start the next fast" value={p.notifEatEnd} onChange={(v) => void toggleNotif("notifEatEnd", v)} />
                <ToggleRow label="Water reminders" body="Configure times on the Water tab" value={p.notifWater} onChange={(v) => void toggleNotif("notifWater", v)} />
              </Card>
            </FadeUp>

            {/* Install as app */}
            <FadeUp delay={0.11}>
              <Card className="flex flex-col gap-3">
                <SectionTitle title="Install as app" className="mb-0" />
                {standalone ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="h-4 w-4" />
                    <span className="text-[14px] font-bold">Running as an installed app</span>
                  </div>
                ) : installable ? (
                  <>
                    <Muted>Add FastTrack to your home screen — full-screen, offline shell, launches like a native app.</Muted>
                    <Pill label="Install FastTrack" icon={<Download className="h-4 w-4" />} onClick={() => void promptInstall()} className="self-start" />
                  </>
                ) : isIos() ? (
                  <Muted>
                    On iPhone: tap the <span className="font-bold text-foreground">Share</span> button in Safari, then{" "}
                    <span className="font-bold text-foreground">Add to Home Screen</span>.
                  </Muted>
                ) : (
                  <div className="flex items-start gap-2.5">
                    <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <Muted>Open this site in Chrome or Edge and choose “Install app” from the browser menu, or use Safari → Share → Add to Home Screen on iPhone.</Muted>
                  </div>
                )}
              </Card>
            </FadeUp>

            {/* Danger */}
            <FadeUp delay={0.14}>
              <Card className="flex flex-col gap-3 border-destructive/35">
                <SectionTitle title="Danger zone" className="mb-0" />
                <Muted>Wipes every fast, meal, weight and water entry in this browser. Targets reset to defaults. There is no undo.</Muted>
                <Pill label="Reset all data" variant="danger" onClick={() => setResetOpen(true)} className="self-start" />
              </Card>
            </FadeUp>

            <Muted className="text-center text-[11px]">FastTrack · data lives in this browser only</Muted>
          </div>
        </div>
      )}

      <Confirm
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset everything?"
        body="All fasts, meals, weight and water logs will be deleted permanently."
        confirmLabel="Yes, wipe it"
        danger
        loading={reset.isPending}
        onConfirm={() => {
          reset.mutate(undefined, {
            onSuccess: async () => {
              cancelFastAlarms();
              await scheduleWaterReminders({ enabled: false, mode: "interval", intervalMin: 90, activeFrom: "08:00", activeTo: "22:00", customTimes: [] });
              setHydrated(false);
              setResetOpen(false);
              navigate("/");
            },
          });
        }}
      />
    </>
  );
}
