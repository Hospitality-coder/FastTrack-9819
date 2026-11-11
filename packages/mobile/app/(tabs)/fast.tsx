import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { useFastClock } from "@/hooks/use-fast-clock";
import { Body, Card, Chip, Display, IconButton, Muted, Pill, Pixel, Row, Screen, SectionTitle, Stat, Empty } from "@/components/ui";
import { Ring } from "@/components/Ring";
import { Sheet } from "@/components/Sheet";
import { Confirm } from "@/components/Confirm";
import { NumberField } from "@/components/Field";
import { RankBadge } from "@/components/RankBadge";
import { StreakHeatmap } from "@/components/StreakHeatmap";
import {
  useActiveFast,
  useDeleteFast,
  useEditFastStart,
  useEndFast,
  useExtendFast,
  useFastHistory,
  useFastStats,
  useStartFast,
} from "@/queries/fasts";
import { useProfile } from "@/queries/profile";
import { clock, hoursBetween, humanDuration, shortDate } from "@/lib/dates";
import { cancelFastAlarms, scheduleFastAlarms } from "@/lib/notifications";

const PRESETS: { key: string; hours: number; blurb: string }[] = [
  { key: "16:8", hours: 16, blurb: "The classic. 16h fast, 8h window." },
  { key: "18:6", hours: 18, blurb: "Tighter window. Deeper fat burn." },
  { key: "20:4", hours: 20, blurb: "Warrior mode. 4h to eat." },
  { key: "OMAD", hours: 23, blurb: "One meal a day." },
  { key: "Extended", hours: 36, blurb: "24h+ — hydrate and listen to your body." },
  { key: "Custom", hours: 14, blurb: "Pick your own hours." },
];

export default function FastScreen() {
  const colors = useColors();
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
  const [startOffsetMin, setStartOffsetMin] = useState(0); // negative = started earlier
  const [sheet, setSheet] = useState<null | "custom" | "extend" | "edit" | "break">(null);
  const [extendHours, setExtendHours] = useState<number | null>(2);
  const [editDelta, setEditDelta] = useState(0);

  const selected = protocol ?? profile.data?.defaultProtocol ?? "16:8";
  const preset = PRESETS.find((p) => p.key === selected) ?? PRESETS[0]!;
  const plannedHours = selected === "Custom" ? (customHours ?? 14) : preset.hours;

  // Pulse when the goal is reached.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!c.active || !c.done) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [c.active, c.done, pulse]);

  const doStart = async () => {
    const startAt = new Date(Date.now() + startOffsetMin * 60_000);
    const res = await start.mutateAsync({ protocol: selected, plannedHours, startAt });
    setStartOffsetMin(0);
    await scheduleFastAlarms({
      plannedEndAt: new Date(res.plannedEndAt),
      plannedHours,
      notifFastEnd: profile.data?.notifFastEnd ?? true,
      notifEatEnd: profile.data?.notifEatEnd ?? true,
    });
  };

  const doEnd = async () => {
    if (!fast.data) return;
    const hours = hoursBetween(new Date(fast.data.startAt), new Date());
    const res = await end.mutateAsync({ id: fast.data.id });
    await cancelFastAlarms();
    setSheet(null);
    if (res.status === "completed") {
      router.push({ pathname: "/fast-complete", params: { hours: String(hours), protocol: fast.data.protocol } });
    }
  };

  const doExtend = async () => {
    if (!fast.data || !extendHours) return;
    const res = await extend.mutateAsync({ id: fast.data.id, hours: extendHours });
    await scheduleFastAlarms({
      plannedEndAt: new Date(res.plannedEndAt),
      plannedHours: res.plannedHours,
      notifFastEnd: profile.data?.notifFastEnd ?? true,
      notifEatEnd: profile.data?.notifEatEnd ?? true,
    });
    setSheet(null);
  };

  const doEditStart = async () => {
    if (!fast.data) return;
    const startAt = new Date(new Date(fast.data.startAt).getTime() + editDelta * 60_000);
    const res = await editStart.mutateAsync({ id: fast.data.id, startAt });
    await scheduleFastAlarms({
      plannedEndAt: new Date(res.plannedEndAt),
      plannedHours: res.plannedHours,
      notifFastEnd: profile.data?.notifFastEnd ?? true,
      notifEatEnd: profile.data?.notifEatEnd ?? true,
    });
    setEditDelta(0);
    setSheet(null);
  };

  const ringLabel = c.active ? (c.done ? "Goal smashed" : "Fasting") : "Ready to fast";

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Pixel>Fast</Pixel>
            <Display style={{ fontSize: 26, marginTop: 4 }}>{c.active ? "In the shadows" : "Choose your path"}</Display>
          </View>
          {stats.data && <RankBadge rank={stats.data.rank} compact />}
        </Row>

        {/* Timer */}
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Card style={{ alignItems: "center", paddingVertical: 26, gap: 18, backgroundColor: "rgba(10,20,12,0.85)" }}>
            <Ring size={250} stroke={16} progress={c.active ? c.progress : 0} color={c.active && c.done ? colors.accent : undefined}>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>{ringLabel}</Muted>
                <Text style={{ fontFamily: Fonts.display, fontSize: c.active ? 40 : 34, color: colors.foreground, fontVariant: ["tabular-nums"] }}>
                  {c.active ? humanDuration(c.elapsedMs, { seconds: true }) : `${plannedHours}h`}
                </Text>
                <Pixel style={{ fontSize: 11 }}>
                  {c.active
                    ? c.done
                      ? `+${humanDuration(-c.remainingMs)} beyond goal`
                      : `${humanDuration(c.remainingMs)} to go`
                    : selected === "Custom"
                      ? "custom fast"
                      : `${selected} protocol`}
                </Pixel>
              </View>
            </Ring>

            {c.active ? (
              <>
                <Row style={{ gap: 28 }}>
                  <Stat label="Started" value={clock(c.startAt)} />
                  <Stat label="Goal" value={`${fast.data?.plannedHours}h`} />
                  <Stat label="Window opens" value={clock(c.plannedEndAt)} />
                </Row>
                <View style={{ width: "100%", gap: 10 }}>
                  <Pill
                    label={c.done ? "Complete fast" : "End fast early"}
                    size="lg"
                    variant={c.done ? "primary" : "outline"}
                    onPress={() => (c.done ? doEnd() : setSheet("break"))}
                    loading={end.isPending}
                    icon={<Ionicons name={c.done ? "checkmark-circle" : "stop-circle-outline"} size={18} color={c.done ? colors.primaryForeground : colors.foreground} />}
                  />
                  <Row style={{ gap: 10 }}>
                    <Pill label="Extend" variant="ghost" style={{ flex: 1 }} onPress={() => setSheet("extend")} icon={<Ionicons name="add-circle-outline" size={16} color={colors.foreground} />} />
                    <Pill label="Edit start" variant="ghost" style={{ flex: 1 }} onPress={() => setSheet("edit")} icon={<Ionicons name="time-outline" size={16} color={colors.foreground} />} />
                  </Row>
                </View>
              </>
            ) : (
              <View style={{ width: "100%", gap: 14 }}>
                <Row style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {PRESETS.map((p) => (
                    <Chip
                      key={p.key}
                      label={p.key}
                      active={selected === p.key}
                      onPress={() => {
                        setProtocol(p.key);
                        if (p.key === "Custom") setSheet("custom");
                      }}
                    />
                  ))}
                </Row>
                <Muted style={{ textAlign: "center" }}>{preset.blurb}</Muted>
                <Row style={{ justifyContent: "center", gap: 10 }}>
                  <Muted>Started</Muted>
                  <IconButton onPress={() => setStartOffsetMin((m) => Math.max(-720, m - 30))} style={{ width: 32, height: 32 }}>
                    <Ionicons name="remove" size={16} color={colors.foreground} />
                  </IconButton>
                  <Body style={{ fontFamily: Fonts.bodyBold, minWidth: 90, textAlign: "center" }}>
                    {startOffsetMin === 0 ? "now" : `${humanDuration(-startOffsetMin * 60_000)} ago`}
                  </Body>
                  <IconButton onPress={() => setStartOffsetMin((m) => Math.min(0, m + 30))} style={{ width: 32, height: 32 }}>
                    <Ionicons name="add" size={16} color={colors.foreground} />
                  </IconButton>
                </Row>
                <Pill
                  label={`Start ${plannedHours}h fast`}
                  size="lg"
                  onPress={doStart}
                  loading={start.isPending}
                  icon={<Ionicons name="flash" size={18} color={colors.primaryForeground} />}
                />
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Streaks */}
        <Card style={{ gap: 16 }}>
          <Row style={{ gap: 20 }}>
            <Stat label="Streak" value={stats.data?.currentStreak ?? 0} unit="days" pixel />
            <Stat label="Best" value={stats.data?.bestStreak ?? 0} unit="days" pixel />
            <Stat label="Completed" value={stats.data?.totalCompleted ?? 0} pixel />
            <Stat label="This week" value={stats.data?.weekHours ?? 0} unit="h" pixel />
          </Row>
          {stats.data && <StreakHeatmap cells={stats.data.heatmap} />}
          {stats.data && <RankBadge rank={stats.data.rank} />}
        </Card>

        {/* History */}
        <View>
          <SectionTitle title="History" />
          {history.data && history.data.length === 0 ? (
            <Card>
              <Empty title="No fasts yet" body="Your first completed fast puts you on the board." />
            </Card>
          ) : (
            <Card style={{ padding: 6 }}>
              {history.data?.map((f, i) => {
                const endAt = f.endedAt ? new Date(f.endedAt) : new Date();
                const hrs = hoursBetween(new Date(f.startAt), endAt);
                const tone = f.status === "completed" ? colors.primary : f.status === "broken" ? colors.destructive : colors.accent;
                return (
                  <Row
                    key={f.id}
                    style={{
                      justifyContent: "space-between",
                      padding: 12,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Row style={{ gap: 12 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} />
                      <View>
                        <Body style={{ fontFamily: Fonts.bodyBold }}>
                          {f.protocol} · {hrs}h
                        </Body>
                        <Muted>
                          {shortDate(new Date(f.startAt))} {clock(new Date(f.startAt))} → {f.endedAt ? clock(endAt) : "now"}
                        </Muted>
                      </View>
                    </Row>
                    <Row style={{ gap: 10 }}>
                      <Pixel style={{ fontSize: 10, color: tone }}>{f.status}</Pixel>
                      {f.status !== "active" && (
                        <Pressable onPress={() => del.mutate({ id: f.id })} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
                        </Pressable>
                      )}
                    </Row>
                  </Row>
                );
              })}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Custom hours */}
      <Sheet visible={sheet === "custom"} onClose={() => setSheet(null)} title="Custom fast" subtitle="1 to 168 hours. Anything over 24h counts as extended.">
        <NumberField label="Fasting hours" value={customHours} onChange={setCustomHours} suffix="h" />
        <Row style={{ gap: 8, flexWrap: "wrap" }}>
          {[12, 14, 16, 18, 20, 24, 36, 48, 72].map((h) => (
            <Chip key={h} label={`${h}h`} active={customHours === h} onPress={() => setCustomHours(h)} />
          ))}
        </Row>
        <Pill label="Use this" onPress={() => setSheet(null)} disabled={!customHours || customHours < 1 || customHours > 168} />
      </Sheet>

      {/* Extend */}
      <Sheet visible={sheet === "extend"} onClose={() => setSheet(null)} title="Extend fast" subtitle="Push the goal further out. Alarms move with it.">
        <Row style={{ gap: 8, flexWrap: "wrap" }}>
          {[1, 2, 4, 6, 12, 24].map((h) => (
            <Chip key={h} label={`+${h}h`} active={extendHours === h} onPress={() => setExtendHours(h)} />
          ))}
        </Row>
        <NumberField label="Hours to add" value={extendHours} onChange={setExtendHours} suffix="h" />
        <Pill label={`Extend by ${extendHours ?? 0}h`} onPress={doExtend} loading={extend.isPending} disabled={!extendHours} />
      </Sheet>

      {/* Edit start */}
      <Sheet visible={sheet === "edit"} onClose={() => setSheet(null)} title="Edit start time" subtitle="Forgot to hit start? Shift it back.">
        <Row style={{ justifyContent: "center", gap: 14 }}>
          <IconButton onPress={() => setEditDelta((d) => d - 15)}>
            <Ionicons name="remove" size={18} color={colors.foreground} />
          </IconButton>
          <View style={{ alignItems: "center", minWidth: 140 }}>
            <Text style={{ fontFamily: Fonts.display, fontSize: 24, color: colors.foreground }}>
              {c.active ? clock(new Date(c.startAt.getTime() + editDelta * 60_000)) : "--"}
            </Text>
            <Muted>{editDelta === 0 ? "unchanged" : `${editDelta > 0 ? "+" : ""}${editDelta} min`}</Muted>
          </View>
          <IconButton onPress={() => setEditDelta((d) => Math.min(d + 15, c.active ? Math.floor((Date.now() - c.startAt.getTime()) / 60_000) : 0))}>
            <Ionicons name="add" size={18} color={colors.foreground} />
          </IconButton>
        </Row>
        <Pill label="Save start time" onPress={doEditStart} loading={editStart.isPending} disabled={editDelta === 0} />
      </Sheet>

      <Confirm
        visible={sheet === "break"}
        onClose={() => setSheet(null)}
        onConfirm={doEnd}
        loading={end.isPending}
        danger
        title="End fast early?"
        body={c.active ? `You're ${humanDuration(c.elapsedMs)} in. Ending now logs it as broken — no streak credit, but the hours still count.` : undefined}
        confirmLabel="End fast"
      />
    </Screen>
  );
}
