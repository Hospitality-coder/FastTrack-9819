import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Body, Card, Chip, Display, Empty, IconButton, Muted, Pill, Pixel, Row, Screen, SectionTitle, Stat } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { Field, NumberField } from "@/components/Field";
import { LineChart } from "@/components/LineChart";
import { useDeleteWeight, useLogWeight, useWeightList, useWeightSummary } from "@/queries/weight";
import { useUpdateProfile } from "@/queries/profile";
import { addDays, prettyDate, today } from "@/lib/dates";

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
] as const;

function delta(n: number | null | undefined, suffix = " kg") {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}${suffix}`;
}

export default function WeightScreen() {
  const colors = useColors();
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
      ? colors.mutedForeground
      : Math.abs(s.toGoal) < 0.5
        ? colors.primary
        : goal === "lose"
          ? s.toGoal > 0
            ? colors.warning
            : colors.primary
          : goal === "gain"
            ? s.toGoal < 0
              ? colors.warning
              : colors.primary
            : colors.foreground;

  const deltaColor = (n: number | null | undefined) => {
    if (n === null || n === undefined || n === 0) return colors.foreground;
    if (goal === "maintain") return Math.abs(n) < 1 ? colors.primary : colors.warning;
    const good = goal === "lose" ? n < 0 : n > 0;
    return good ? colors.primary : colors.destructive;
  };

  const openLog = () => {
    setKg(latest?.weightKg ?? null);
    setNote("");
    setLogDate(today());
    setLogOpen(true);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }} showsVerticalScrollIndicator={false}>
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Pixel>Body</Pixel>
            <Display style={{ fontSize: 26, marginTop: 4 }}>Weight</Display>
          </View>
          <IconButton onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={18} color={colors.foreground} />
          </IconButton>
        </Row>

        {/* Hero */}
        <Card style={{ gap: 16, backgroundColor: "rgba(10,20,12,0.85)" }}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Current</Muted>
              <Row style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontFamily: Fonts.display, fontSize: 44, color: colors.foreground }}>{latest ? latest.weightKg : "--"}</Text>
                <Muted style={{ marginBottom: 9 }}>kg</Muted>
              </Row>
              {latest ? <Muted>Logged {prettyDate(latest.date)}</Muted> : <Muted>No entries yet</Muted>}
            </View>
            <Pressable
              onPress={() => {
                setGoalKg(s?.goalWeightKg ?? null);
                setGoalOpen(true);
              }}
              style={{ alignItems: "flex-end", gap: 2 }}
            >
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Goal</Muted>
              <Row style={{ gap: 4 }}>
                <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: colors.accent }}>{s?.goalWeightKg ?? "set"}</Text>
                {s?.goalWeightKg ? <Muted>kg</Muted> : null}
                <Ionicons name="pencil" size={12} color={colors.mutedForeground} />
              </Row>
              {s?.toGoal !== null && s?.toGoal !== undefined ? (
                <Pixel style={{ fontSize: 11, color: toGoalColor }}>
                  {Math.abs(s.toGoal) < 0.5 ? "At goal" : `${Math.abs(s.toGoal)} kg ${s.toGoal > 0 ? "above" : "below"}`}
                </Pixel>
              ) : null}
            </Pressable>
          </Row>

          <Row style={{ justifyContent: "space-between" }}>
            <Stat label="7 days" value={delta(s?.weekDelta, "")} unit="kg" color={deltaColor(s?.weekDelta)} />
            <Stat label="30 days" value={delta(s?.monthDelta, "")} unit="kg" color={deltaColor(s?.monthDelta)} />
            <Stat label="All time" value={delta(s?.totalDelta, "")} unit="kg" color={deltaColor(s?.totalDelta)} />
            <Stat label="BMI" value={s?.bmi ?? "—"} />
          </Row>

          <Pill label="Log weight" size="lg" onPress={openLog} icon={<Ionicons name="add" size={20} color={colors.primaryForeground} />} />
        </Card>

        {/* Chart */}
        <Card style={{ gap: 12 }}>
          <SectionTitle
            title="Trend"
            style={{ marginBottom: 0 }}
            action={
              <Row style={{ gap: 6 }}>
                {RANGES.map((r) => (
                  <Pressable key={r.label} onPress={() => setDays(r.days)} hitSlop={6}>
                    <Pixel style={{ fontSize: 11, color: days === r.days ? colors.primary : colors.mutedForeground }}>{r.label}</Pixel>
                  </Pressable>
                ))}
              </Row>
            }
          />
          {points.length >= 2 ? (
            <LineChart points={points} goal={s?.goalWeightKg} unit="" />
          ) : (
            <Empty
              title={points.length === 1 ? "One point down" : "No trend yet"}
              body={points.length === 1 ? "Log again tomorrow and the line appears." : "Log your weight a couple of times to see the curve."}
              art={<Ionicons name="trending-down" size={36} color={colors.primary} />}
            />
          )}
        </Card>

        {/* History */}
        <View>
          <SectionTitle title="History" action={<Muted>{s?.entries ?? 0} entries</Muted>} />
          <Card style={{ padding: 6 }}>
            {list.data && list.data.length === 0 ? (
              <Empty title="Nothing logged" body="Weigh in at the same time each day — mornings after the bathroom are most consistent." />
            ) : (
              [...(list.data ?? [])].reverse().map((e, i, arr) => {
                const prev = arr[i + 1];
                const d = prev ? Math.round((e.weightKg - prev.weightKg) * 10) / 10 : null;
                return (
                  <Row
                    key={e.id}
                    style={{ padding: 12, justifyContent: "space-between", borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
                  >
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontFamily: Fonts.bodyBold }}>{prettyDate(e.date)}</Body>
                      {e.note ? <Muted numberOfLines={1}>{e.note}</Muted> : null}
                    </View>
                    <Row style={{ gap: 14 }}>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontFamily: Fonts.display, fontSize: 16, color: colors.foreground }}>{e.weightKg} kg</Text>
                        {d !== null ? <Muted style={{ fontSize: 11, color: deltaColor(d) }}>{delta(d)}</Muted> : null}
                      </View>
                      <Pressable onPress={() => del.mutate({ id: e.id })} hitSlop={10}>
                        <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
                      </Pressable>
                    </Row>
                  </Row>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Log sheet */}
      <Sheet visible={logOpen} onClose={() => setLogOpen(false)} title="Log weight" subtitle="One entry per day — logging again replaces it.">
        <Row style={{ gap: 8 }}>
          {[0, -1, -2].map((n) => (
            <Chip key={n} label={prettyDate(addDays(today(), n))} active={logDate === addDays(today(), n)} onPress={() => setLogDate(addDays(today(), n))} />
          ))}
        </Row>
        <NumberField label="Weight" suffix="kg" value={kg} onChange={setKg} placeholder="72.4" />
        <Row style={{ gap: 8 }}>
          {[-0.5, -0.1, 0.1, 0.5].map((step) => (
            <Chip
              key={step}
              label={`${step > 0 ? "+" : ""}${step}`}
              onPress={() => setKg(Math.round(((kg ?? latest?.weightKg ?? 70) + step) * 10) / 10)}
            />
          ))}
        </Row>
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Morning, after workout…" maxLength={120} />
        <Pill
          label="Save"
          size="lg"
          loading={log.isPending}
          disabled={!kg || kg < 20 || kg > 400}
          onPress={() => {
            if (!kg) return;
            log.mutate(
              { date: logDate, weightKg: Math.round(kg * 10) / 10, note: note.trim() || undefined },
              { onSuccess: () => setLogOpen(false) },
            );
          }}
        />
      </Sheet>

      {/* Goal sheet */}
      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="Goal weight" subtitle="The dashed line on your chart.">
        <NumberField label="Goal" suffix="kg" value={goalKg} onChange={setGoalKg} placeholder="68" />
        <Row style={{ gap: 10 }}>
          <Pill
            label="Clear"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={() => {
              updateProfile.mutate({ goalWeightKg: null });
              setGoalOpen(false);
            }}
          />
          <Pill
            label="Save goal"
            style={{ flex: 1 }}
            disabled={!goalKg || goalKg < 20 || goalKg > 400}
            onPress={() => {
              if (goalKg) updateProfile.mutate({ goalWeightKg: Math.round(goalKg * 10) / 10 });
              setGoalOpen(false);
            }}
          />
        </Row>
      </Sheet>
    </Screen>
  );
}
