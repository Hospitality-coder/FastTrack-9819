import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Display, Muted, Pill, Pixel, Row } from "@/components/ui";
import { RankBadge } from "@/components/RankBadge";
import { useFastStats } from "@/queries/fasts";

const LINES = [
  "Discipline is the sharpest blade.",
  "The shadows reward patience.",
  "Another fast in the books. Unstoppable.",
  "Hunger bowed. You didn't.",
];

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53) % 100,
  delay: (i * 97) % 600,
  size: 6 + (i % 4) * 3,
  color: i % 3 === 0 ? "#39FF14" : i % 3 === 1 ? "#B6FF5C" : "#FFD60A",
}));

function Confetti({ left, delay, size, color }: (typeof CONFETTI)[number]) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fall, { toValue: 1, duration: 2600 + delay, easing: Easing.in(Easing.quad), useNativeDriver: false }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    ).start();
  }, [fall, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${left}%`,
        top: -20,
        width: size,
        height: size * 1.6,
        borderRadius: 2,
        backgroundColor: color,
        opacity: fall.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, 820] }) },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${left % 2 ? 540 : -540}deg`] }) },
        ],
      }}
    />
  );
}

export default function FastCompleteScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ hours?: string; protocol?: string }>();
  const hours = Number(params.hours ?? 0);
  const protocol = params.protocol ?? "";
  const stats = useFastStats();
  const scale = useRef(new Animated.Value(0.6)).current;
  const line = LINES[Math.floor(hours) % LINES.length]!;

  useEffect(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: false }).start();
  }, [scale]);

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      {CONFETTI.map((c, i) => (
        <Confetti key={i} {...c} />
      ))}
      <Animated.View style={[styles.card, { transform: [{ scale }], borderColor: colors.border }]}>
        <LinearGradient colors={["#1B5A2E", "#0F1A10"]} style={StyleSheet.absoluteFill} />
        <Image source={require("../assets/icon.png")} style={{ width: 120, height: 120, borderRadius: 30 }} />
        <Pixel style={{ fontSize: 14, marginTop: 14 }}>Fast complete</Pixel>
        <Row style={{ alignItems: "flex-end", gap: 6, marginTop: 6 }}>
          <Text style={{ fontFamily: Fonts.displayBlack, fontSize: 56, color: colors.foreground, lineHeight: 60 }}>{hours}</Text>
          <Display style={{ fontSize: 22, marginBottom: 8 }}>hours</Display>
        </Row>
        {protocol ? <Muted style={{ fontSize: 13 }}>{protocol} protocol · nailed it</Muted> : null}
        <Display style={{ fontSize: 16, textAlign: "center", marginTop: 18, color: colors.accent }}>{line}</Display>

        {stats.data && (
          <View style={styles.stats}>
            <Row style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <Row style={{ gap: 8 }}>
                <Ionicons name="flame" size={18} color={colors.warning} />
                <Text style={{ fontFamily: Fonts.pixelBold, fontSize: 16, color: colors.foreground }}>{stats.data.currentStreak}</Text>
                <Muted>day streak</Muted>
              </Row>
              {stats.data.currentStreak >= stats.data.bestStreak && stats.data.currentStreak > 1 ? (
                <Pixel style={{ fontSize: 10, color: colors.warning }}>New best</Pixel>
              ) : null}
            </Row>
            <RankBadge rank={stats.data.rank} />
          </View>
        )}

        <Pill label="Open the window" size="lg" style={{ alignSelf: "stretch", marginTop: 22 }} onPress={() => router.back()} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 26,
    alignItems: "center",
    overflow: "hidden",
  },
  stats: {
    alignSelf: "stretch",
    marginTop: 20,
    padding: 16,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(7,10,7,0.6)",
  },
});
