import { useEffect, useRef } from "react";
import { Animated, Image, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { useFastClock } from "@/hooks/use-fast-clock";
import { Body, Card, Display, IconButton, Muted, Pill, Pixel, Row, Screen, SectionTitle, Stat } from "@/components/ui";
import { Ring } from "@/components/Ring";
import { MacroBar } from "@/components/MacroBar";
import { SuggestionCard } from "@/components/SuggestionCard";
import { RankBadge } from "@/components/RankBadge";
import { useActiveFast, useFastStats } from "@/queries/fasts";
import { useFoodByDate } from "@/queries/food";
import { useAddWater, useWaterToday } from "@/queries/water";
import { useWeightSummary } from "@/queries/weight";
import { useRegenerateSuggestions, useSuggestions } from "@/queries/suggestions";
import { useProfile } from "@/queries/profile";
import { clock, humanDuration, today } from "@/lib/dates";

function useFadeUp(delay: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 500, delay, useNativeDriver: false }).start();
  }, [v, delay]);
  return { opacity: v, transform: [{ translateY: Animated.multiply(Animated.subtract(1, v), 18) }] };
}

export default function Home() {
  const colors = useColors();
  const { width } = useWindowDimensions();
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
  const clockState = useFastClock(fast.data);

  const a1 = useFadeUp(0);
  const a2 = useFadeUp(120);
  const a3 = useFadeUp(220);
  const a4 = useFadeUp(320);

  const refreshing = fast.isRefetching || food.isRefetching;
  const onRefresh = () => {
    fast.refetch();
    stats.refetch();
    food.refetch();
    water.refetch();
    weight.refetch();
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Night shift";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const waterPct = water.data ? Math.min(1, water.data.totalMl / water.data.targetMl) : 0;
  const cardW = Math.min(300, width - 72);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View style={a1}>
          <Row style={{ justifyContent: "space-between" }}>
            <View>
              <Pixel>{greeting}</Pixel>
              <Display style={{ fontSize: 26, marginTop: 4 }}>{profile.data?.name ?? "Ninja"}</Display>
            </View>
            <Row style={{ gap: 10 }}>
              {stats.data && <RankBadge rank={stats.data.rank} compact />}
              <IconButton onPress={() => router.push("/settings")}>
                <Ionicons name="settings-outline" size={18} color={colors.foreground} />
              </IconButton>
            </Row>
          </Row>
        </Animated.View>

        {/* Fasting hero */}
        <Animated.View style={a2}>
          <Pressable onPress={() => router.push("/fast")}>
            <Card style={{ alignItems: "center", paddingVertical: 24, gap: 16, backgroundColor: "rgba(10,20,12,0.85)" }}>
              <Ring size={220} stroke={14} progress={clockState.active ? clockState.progress : 0}>
                <View style={{ alignItems: "center", gap: 2 }}>
                  {clockState.active ? (
                    <>
                      <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>
                        {clockState.done ? "Goal reached" : "Fasting"}
                      </Muted>
                      <Text style={{ fontFamily: Fonts.display, fontSize: 36, color: colors.foreground, fontVariant: ["tabular-nums"] }}>
                        {humanDuration(clockState.elapsedMs, { seconds: true })}
                      </Text>
                      <Pixel style={{ fontSize: 11 }}>
                        {clockState.done ? `+${humanDuration(-clockState.remainingMs)} extra` : `${humanDuration(clockState.remainingMs)} left`}
                      </Pixel>
                    </>
                  ) : (
                    <>
                      <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>Not fasting</Muted>
                      <Text style={{ fontFamily: Fonts.display, fontSize: 30, color: colors.foreground }}>Ready?</Text>
                      <Pixel style={{ fontSize: 11 }}>{profile.data?.defaultProtocol ?? "16:8"} protocol</Pixel>
                    </>
                  )}
                </View>
              </Ring>
              {clockState.active ? (
                <Row style={{ gap: 24 }}>
                  <Stat label="Started" value={clock(clockState.startAt!)} />
                  <Stat label="Window opens" value={clock(clockState.plannedEndAt!)} />
                </Row>
              ) : (
                <Pill label="Start fasting" size="lg" onPress={() => router.push("/fast")} icon={<Ionicons name="flash" size={18} color={colors.primaryForeground} />} />
              )}
              <Row style={{ gap: 20 }}>
                <Stat label="Streak" value={stats.data?.currentStreak ?? 0} unit="days" pixel />
                <Stat label="Best" value={stats.data?.bestStreak ?? 0} unit="days" pixel />
                <Stat label="This week" value={stats.data?.weekHours ?? 0} unit="h" pixel />
              </Row>
            </Card>
          </Pressable>
        </Animated.View>

        {/* Today: macros + water + weight */}
        <Animated.View style={[a3, { gap: 14 }]}>
          <Pressable onPress={() => router.push("/food")}>
            <Card style={{ gap: 14 }}>
              <SectionTitle
                title="Today's fuel"
                style={{ marginBottom: 0 }}
                action={
                  <Pressable onPress={() => router.push("/scan")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="camera" size={14} color={colors.primary} />
                    <Pixel style={{ fontSize: 10 }}>Scan meal</Pixel>
                  </Pressable>
                }
              />
              <Row style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontFamily: Fonts.display, fontSize: 34, color: colors.foreground }}>
                  {Math.round(food.data?.totals.calories ?? 0)}
                </Text>
                <Muted style={{ marginBottom: 6 }}>/ {food.data?.targets.calories ?? profile.data?.calorieTarget ?? 2000} kcal</Muted>
              </Row>
              <MacroBar label="Protein" value={food.data?.totals.protein ?? 0} target={food.data?.targets.protein ?? 120} />
              <MacroBar label="Carbs" value={food.data?.totals.carbs ?? 0} target={food.data?.targets.carbs ?? 200} color={colors.accent} />
              <MacroBar label="Sugar" value={food.data?.totals.sugar ?? 0} target={food.data?.targets.sugar ?? 50} color={colors.warning} overIsBad />
            </Card>
          </Pressable>

          <Row style={{ gap: 14 }}>
            <Card style={{ flex: 1, gap: 10, alignItems: "center" }}>
              <Pressable onPress={() => router.push("/water")} style={{ alignItems: "center" }}>
                <Ring size={92} stroke={9} progress={waterPct} color={colors.water} glow={false}>
                  <Ionicons name="water" size={26} color={colors.water} />
                </Ring>
              </Pressable>
              <Text style={{ fontFamily: Fonts.display, fontSize: 16, color: colors.foreground }}>
                {water.data?.totalMl ?? 0}
                <Muted> / {water.data?.targetMl ?? 2500} ml</Muted>
              </Text>
              <Row style={{ gap: 6 }}>
                {[250, 500].map((ml) => (
                  <Pressable
                    key={ml}
                    onPress={() => addWater.mutate({ date, amountMl: ml })}
                    style={({ pressed }) => ({
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: Radius.pill,
                      backgroundColor: "rgba(56,225,255,0.14)",
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 12, color: colors.water }}>+{ml}</Text>
                  </Pressable>
                ))}
              </Row>
            </Card>
            <Pressable style={{ flex: 1 }} onPress={() => router.push("/weight")}>
              <Card style={{ flex: 1, gap: 8, justifyContent: "space-between" }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Weight</Muted>
                  <Ionicons name="barbell-outline" size={16} color={colors.mutedForeground} />
                </Row>
                <Text style={{ fontFamily: Fonts.display, fontSize: 28, color: colors.foreground }}>
                  {weight.data?.latest ? weight.data.latest.weightKg.toFixed(1) : "—"}
                  <Muted style={{ fontSize: 13 }}> kg</Muted>
                </Text>
                {weight.data?.weekDelta !== null && weight.data?.weekDelta !== undefined ? (
                  <Pixel style={{ fontSize: 10, color: weight.data.weekDelta <= 0 ? colors.primary : colors.warning }}>
                    {weight.data.weekDelta > 0 ? "+" : ""}
                    {weight.data.weekDelta} kg / 7d
                  </Pixel>
                ) : weight.data?.toGoal !== null && weight.data?.toGoal !== undefined ? (
                  <Pixel style={{ fontSize: 10 }}>{Math.abs(weight.data.toGoal).toFixed(1)} kg to goal</Pixel>
                ) : (
                  <Muted style={{ fontSize: 12 }}>Tap to log</Muted>
                )}
              </Card>
            </Pressable>
          </Row>
        </Animated.View>

        {/* Fuel suggestions */}
        <Animated.View style={a4}>
          <SectionTitle
            title="Fuel — today's picks"
            action={
              <Pressable
                onPress={() => regenerate.mutate({ date, localHour: new Date().getHours() })}
                disabled={regenerate.isPending}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, opacity: regenerate.isPending ? 0.5 : 1 }}
              >
                <Ionicons name="shuffle" size={14} color={colors.primary} />
                <Pixel style={{ fontSize: 10 }}>{regenerate.isPending ? "Cooking…" : "Shuffle"}</Pixel>
              </Pressable>
            }
          />
          {suggestions.isLoading || regenerate.isPending ? (
            <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
              <Image source={require("../../assets/icon.png")} style={{ width: 64, height: 64 }} />
              <Body style={{ color: colors.mutedForeground }}>Your ninja chef is plating up ideas…</Body>
            </Card>
          ) : suggestions.isError ? (
            <Card style={{ alignItems: "center", gap: 10 }}>
              <Body style={{ color: colors.mutedForeground, textAlign: "center" }}>Fuel is recharging. Try again in a moment.</Body>
              <Pill label="Retry" size="sm" variant="outline" onPress={() => suggestions.refetch()} />
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
              {suggestions.data?.items.map((it, i) => <SuggestionCard key={`${it.title}-${i}`} item={it} width={cardW} />)}
            </ScrollView>
          )}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
