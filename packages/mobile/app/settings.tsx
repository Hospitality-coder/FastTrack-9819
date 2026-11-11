import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { Body, Card, Chip, Display, IconButton, Muted, Pill, Pixel, Row, Screen, SectionTitle } from "@/components/ui";
import { Field, NumberField } from "@/components/Field";
import { Confirm, ToggleRow } from "@/components/Confirm";
import { useProfile, useResetData, useUpdateProfile } from "@/queries/profile";
import { useWaterReminders } from "@/queries/water";
import { cancelFastAlarms, notificationsSupported, requestPermission, scheduleWaterReminders } from "@/lib/notifications";

const GOALS = [
  { key: "lose", label: "Lose fat", icon: "trending-down" },
  { key: "maintain", label: "Maintain", icon: "remove" },
  { key: "gain", label: "Build", icon: "trending-up" },
] as const;
const PROTOCOLS = ["16:8", "18:6", "20:4", "OMAD", "Extended", "Custom"];

export default function SettingsScreen() {
  const colors = useColors();
  const profile = useProfile();
  const update = useUpdateProfile();
  const reset = useResetData();
  const reminders = useWaterReminders();
  const p = profile.data;

  // Local drafts for number inputs; committed on blur / save.
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

  const clampInt = (n: number | null, min: number, max: number, fallback: number) =>
    n === null ? fallback : Math.min(max, Math.max(min, Math.round(n)));

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

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Row style={{ gap: 12 }}>
            <IconButton onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={18} color={colors.foreground} />
            </IconButton>
            <View>
              <Pixel>Dojo</Pixel>
              <Display style={{ fontSize: 26, marginTop: 2 }}>Settings</Display>
            </View>
          </Row>

          {/* Profile */}
          <Card style={{ gap: 14 }}>
            <SectionTitle title="You" style={{ marginBottom: 0 }} />
            <Field label="Name" value={name} onChangeText={setName} placeholder="Shinobi" maxLength={40} />
            <View style={{ gap: 8 }}>
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Goal</Muted>
              <Row style={{ gap: 8 }}>
                {GOALS.map((g) => (
                  <Chip key={g.key} label={g.label} active={p?.goal === g.key} onPress={() => update.mutate({ goal: g.key })} />
                ))}
              </Row>
            </View>
            <Row style={{ gap: 10 }}>
              <NumberField label="Height" suffix="cm" value={height} onChange={setHeight} placeholder="175" />
              <NumberField label="Goal weight" suffix="kg" value={goalKg} onChange={setGoalKg} placeholder="70" />
            </Row>
          </Card>

          {/* Fasting */}
          <Card style={{ gap: 14 }}>
            <SectionTitle title="Fasting" style={{ marginBottom: 0 }} />
            <View style={{ gap: 8 }}>
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Default protocol</Muted>
              <Row style={{ gap: 8, flexWrap: "wrap" }}>
                {PROTOCOLS.map((k) => (
                  <Chip key={k} label={k} active={p?.defaultProtocol === k} onPress={() => update.mutate({ defaultProtocol: k })} />
                ))}
              </Row>
            </View>
          </Card>

          {/* Targets */}
          <Card style={{ gap: 14 }}>
            <SectionTitle title="Daily targets" style={{ marginBottom: 0 }} />
            <Row style={{ gap: 10 }}>
              <NumberField label="Calories" suffix="kcal" value={kcal} onChange={setKcal} />
              <NumberField label="Protein" suffix="g" value={protein} onChange={setProtein} />
            </Row>
            <Row style={{ gap: 10 }}>
              <NumberField label="Carbs" suffix="g" value={carbs} onChange={setCarbs} />
              <NumberField label="Sugar limit" suffix="g" value={sugar} onChange={setSugar} />
            </Row>
            <NumberField label="Water" suffix="ml" value={waterMl} onChange={setWaterMl} />
            <Pill label={saved ? "Saved" : "Save changes"} loading={update.isPending} onPress={saveTargets} icon={saved ? <Ionicons name="checkmark" size={18} color={colors.primaryForeground} /> : undefined} />
          </Card>

          {/* Notifications */}
          <Card style={{ gap: 6 }}>
            <SectionTitle title="Alarms" style={{ marginBottom: 6 }} />
            {!notificationsSupported && (
              <Muted style={{ color: colors.warning, marginBottom: 6 }}>Alarms fire on the installed iOS / Android app. Settings still save here.</Muted>
            )}
            <ToggleRow label="Fast complete" hint="When your fasting window ends" value={p?.notifFastEnd ?? true} onChange={(v) => void toggleNotif("notifFastEnd", v)} />
            <ToggleRow label="Eating window closing" hint="When it's time to start the next fast" value={p?.notifEatEnd ?? true} onChange={(v) => void toggleNotif("notifEatEnd", v)} />
            <ToggleRow label="Water reminders" hint="Configure times on the Water tab" value={p?.notifWater ?? true} onChange={(v) => void toggleNotif("notifWater", v)} />
          </Card>

          {/* Danger */}
          <Card style={{ gap: 12, borderColor: "rgba(255,77,109,0.35)" }}>
            <SectionTitle title="Danger zone" style={{ marginBottom: 0 }} />
            <Body style={{ fontSize: 13, color: colors.mutedForeground }}>
              Wipes every fast, meal, weight and water entry on this device. Targets reset to defaults. There is no undo.
            </Body>
            <Pill label="Reset all data" variant="danger" onPress={() => setResetOpen(true)} />
          </Card>

          <Muted style={{ textAlign: "center", fontSize: 11 }}>FastTrack · data lives on this device only</Muted>
        </ScrollView>
      </KeyboardAvoidingView>

      <Confirm
        visible={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset everything?"
        body="All fasts, meals, weight and water logs will be deleted permanently."
        confirmLabel="Yes, wipe it"
        danger
        loading={reset.isPending}
        onConfirm={() => {
          reset.mutate(undefined, {
            onSuccess: async () => {
              await cancelFastAlarms();
              await scheduleWaterReminders({ enabled: false, mode: "interval", intervalMin: 90, activeFrom: "08:00", activeTo: "22:00", customTimes: [] });
              setHydrated(false);
              setResetOpen(false);
              router.replace("/");
            },
          });
        }}
      />
    </Screen>
  );
}
