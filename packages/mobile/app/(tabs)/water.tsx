import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Body, Card, Chip, Display, Empty, IconButton, Muted, Pill, Pixel, Row, Screen, SectionTitle } from "@/components/ui";
import { Ring } from "@/components/Ring";
import { Sheet } from "@/components/Sheet";
import { Field, NumberField } from "@/components/Field";
import { ToggleRow } from "@/components/Confirm";
import { WeekBars } from "@/components/WeekBars";
import {
  useAddWater,
  useDeleteWater,
  useSetWaterReminders,
  useWaterHistory,
  useWaterReminders,
  useWaterToday,
} from "@/queries/water";
import { useProfile, useUpdateProfile } from "@/queries/profile";
import { notificationsSupported, reminderTimes, scheduleWaterReminders } from "@/lib/notifications";
import { clock, today } from "@/lib/dates";

const QUICK = [150, 250, 500, 750];
const INTERVALS = [30, 60, 90, 120, 180];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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
      keyboardType="numbers-and-punctuation"
      onChangeText={(t) => {
        setText(t);
        if (TIME_RE.test(t)) onCommit(t);
      }}
      onBlur={() => !TIME_RE.test(text) && setText(value)}
    />
  );
}

function tap() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function WaterScreen() {
  const colors = useColors();
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

  // Keep native alarms in sync whenever the reminder config changes.
  useEffect(() => {
    if (!r || !notificationsSupported) return;
    void scheduleWaterReminders({ ...r, enabled: r.enabled && notifOn });
  }, [r, notifOn]);

  const logWater = (ml: number) => {
    tap();
    add.mutate({ date, amountMl: ml });
  };

  const patchReminders = (patch: Parameters<typeof setReminders.mutate>[0]) => setReminders.mutate(patch);

  const addCustomTime = () => {
    const t = newTime.trim();
    if (!TIME_RE.test(t) || !r) return;
    const next = Array.from(new Set([...(r.customTimes ?? []), t])).sort();
    patchReminders({ customTimes: next });
    setNewTime("");
  };

  const previewTimes = r ? reminderTimes(r) : [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }} showsVerticalScrollIndicator={false}>
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Pixel style={{ color: colors.water }}>Hydration</Pixel>
            <Display style={{ fontSize: 26, marginTop: 4 }}>Water</Display>
          </View>
          <IconButton
            onPress={() => {
              setTargetMl(target);
              setTargetOpen(true);
            }}
          >
            <Ionicons name="options-outline" size={18} color={colors.foreground} />
          </IconButton>
        </Row>

        {/* Ring */}
        <Card style={{ alignItems: "center", paddingVertical: 26, gap: 18, backgroundColor: "rgba(10,20,12,0.85)" }}>
          <Ring size={220} stroke={16} progress={progress} color={colors.water}>
            <View style={{ alignItems: "center" }}>
              <Ionicons name="water" size={22} color={colors.water} />
              <Text style={{ fontFamily: Fonts.display, fontSize: 40, color: colors.foreground, marginTop: 4 }}>
                {total >= 1000 ? (total / 1000).toFixed(2).replace(/\.?0+$/, "") : total}
              </Text>
              <Muted>{total >= 1000 ? "litres" : "ml"} today</Muted>
              <Pixel style={{ marginTop: 8, color: progress >= 1 ? colors.primary : colors.water }}>
                {progress >= 1 ? "Goal smashed" : `${left} ml to go`}
              </Pixel>
            </View>
          </Ring>
          <Row style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {QUICK.map((ml) => (
              <Pressable
                key={ml}
                onPress={() => logWater(ml)}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: Radius.pill,
                  backgroundColor: pressed ? colors.water : "rgba(56,225,255,0.12)",
                  borderWidth: 1,
                  borderColor: colors.water,
                })}
              >
                <Text style={{ fontFamily: Fonts.bodyExtraBold, color: colors.foreground, fontSize: 14 }}>+{ml} ml</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setCustomMl(null);
                setCustomOpen(true);
              }}
              style={({ pressed }) => ({
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: Radius.pill,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: Fonts.bodyExtraBold, color: colors.foreground, fontSize: 14 }}>Custom</Text>
            </Pressable>
          </Row>
          <Muted>Target {target} ml / day</Muted>
        </Card>

        {/* Week */}
        <Card style={{ gap: 12 }}>
          <SectionTitle title="Last 7 days" style={{ marginBottom: 0 }} action={<Muted>dashed = target</Muted>} />
          <WeekBars
            bars={(history.data ?? []).map((d) => ({ date: d.date, value: d.totalMl }))}
            target={target}
            color={colors.water}
            format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}`)}
          />
        </Card>

        {/* Reminders */}
        <Card style={{ gap: 12 }}>
          <SectionTitle
            title="Reminders"
            style={{ marginBottom: 0 }}
            action={<Ionicons name="alarm-outline" size={18} color={colors.water} />}
          />
          {!notificationsSupported && (
            <Muted style={{ color: colors.warning }}>Alarms fire on the installed iOS / Android app. This web preview only saves your schedule.</Muted>
          )}
          <ToggleRow
            label="Water alarms"
            hint="Nudges you to drink during your active hours"
            value={(r?.enabled ?? true) && notifOn}
            onChange={(v) => {
              patchReminders({ enabled: v });
              if (v && !notifOn) updateProfile.mutate({ notifWater: true });
            }}
          />
          {r && r.enabled && notifOn && (
            <>
              <Row style={{ gap: 8 }}>
                <Chip label="Every X minutes" active={r.mode === "interval"} color={colors.water} onPress={() => patchReminders({ mode: "interval" })} />
                <Chip label="Custom times" active={r.mode === "custom"} color={colors.water} onPress={() => patchReminders({ mode: "custom" })} />
              </Row>

              {r.mode === "interval" ? (
                <View style={{ gap: 12 }}>
                  <Row style={{ gap: 8, flexWrap: "wrap" }}>
                    {INTERVALS.map((m) => (
                      <Chip
                        key={m}
                        label={m < 60 ? `${m}m` : `${m / 60}h${m % 60 ? "30" : ""}`}
                        active={r.intervalMin === m}
                        color={colors.water}
                        onPress={() => patchReminders({ intervalMin: m })}
                      />
                    ))}
                  </Row>
                  <Row style={{ gap: 10 }}>
                    <TimeField label="Active from" value={r.activeFrom} onCommit={(t) => patchReminders({ activeFrom: t })} />
                    <TimeField label="Until" value={r.activeTo} onCommit={(t) => patchReminders({ activeTo: t })} />
                  </Row>
                  <Muted>
                    {previewTimes.length} alarms/day · {previewTimes.slice(0, 4).join(", ")}
                    {previewTimes.length > 4 ? "…" : ""}
                  </Muted>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <Row style={{ gap: 8, flexWrap: "wrap" }}>
                    {(r.customTimes ?? []).length === 0 && <Muted>No times yet. Add one below (24h, e.g. 09:30).</Muted>}
                    {(r.customTimes ?? []).map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => patchReminders({ customTimes: (r.customTimes ?? []).filter((x) => x !== t) })}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: Radius.pill,
                          backgroundColor: "rgba(56,225,255,0.12)",
                          borderWidth: 1,
                          borderColor: colors.water,
                        }}
                      >
                        <Text style={{ fontFamily: Fonts.pixelBold, color: colors.foreground, fontSize: 12 }}>{t}</Text>
                        <Ionicons name="close" size={14} color={colors.mutedForeground} />
                      </Pressable>
                    ))}
                  </Row>
                  <Row style={{ gap: 10, alignItems: "flex-end" }}>
                    <Field
                      label="Add time"
                      value={newTime}
                      onChangeText={setNewTime}
                      placeholder="14:30"
                      maxLength={5}
                      autoCapitalize="none"
                      onSubmitEditing={addCustomTime}
                    />
                    <Pill label="Add" size="md" onPress={addCustomTime} disabled={!TIME_RE.test(newTime.trim())} />
                  </Row>
                </View>
              )}
            </>
          )}
        </Card>

        {/* Today's log */}
        <View>
          <SectionTitle title="Today's log" action={<Muted>{water.data?.entries.length ?? 0} drinks</Muted>} />
          <Card style={{ padding: 6 }}>
            {water.data && water.data.entries.length === 0 ? (
              <Empty title="Dry so far" body="Tap a quick-add above. Your first glass starts the streak." />
            ) : (
              water.data?.entries.map((e, i) => (
                <Row
                  key={e.id}
                  style={{
                    padding: 12,
                    justifyContent: "space-between",
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Row style={{ gap: 12 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(56,225,255,0.12)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="water" size={16} color={colors.water} />
                    </View>
                    <View>
                      <Body style={{ fontFamily: Fonts.bodyBold }}>{e.amountMl} ml</Body>
                      <Muted>{clock(new Date(e.loggedAt))}</Muted>
                    </View>
                  </Row>
                  <Pressable onPress={() => del.mutate({ id: e.id })} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
                  </Pressable>
                </Row>
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Custom amount */}
      <Sheet visible={customOpen} onClose={() => setCustomOpen(false)} title="Custom amount" subtitle="How much did you drink?">
        <NumberField label="Amount" suffix="ml" value={customMl} onChange={setCustomMl} placeholder="330" />
        <Pill
          label="Log it"
          size="lg"
          disabled={!customMl || customMl <= 0 || customMl > 5000}
          onPress={() => {
            if (customMl) logWater(Math.round(customMl));
            setCustomOpen(false);
          }}
        />
      </Sheet>

      {/* Daily target */}
      <Sheet visible={targetOpen} onClose={() => setTargetOpen(false)} title="Daily water target" subtitle="2.5 L is a solid default for most adults.">
        <NumberField label="Target" suffix="ml" value={targetMl} onChange={setTargetMl} />
        <Row style={{ gap: 8, flexWrap: "wrap" }}>
          {[2000, 2500, 3000, 3500].map((v) => (
            <Chip key={v} label={`${v / 1000} L`} active={targetMl === v} color={colors.water} onPress={() => setTargetMl(v)} />
          ))}
        </Row>
        <Pill
          label="Save target"
          size="lg"
          loading={updateProfile.isPending}
          disabled={!targetMl || targetMl < 500 || targetMl > 10000}
          onPress={() => {
            if (targetMl) updateProfile.mutate({ waterTargetMl: Math.round(targetMl) });
            setTargetOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}
