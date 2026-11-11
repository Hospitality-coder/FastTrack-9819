import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";

/* ---------- Screen shell: black base with the deep-green gradient hero ---------- */

export function Screen({ children, style, hero = true }: PropsWithChildren<{ style?: ViewStyle; hero?: boolean }>) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {hero && (
        <LinearGradient
          colors={["#1B5A2E", "#0F3A1D", colors.background]}
          locations={[0, 0.45, 1]}
          style={styles.hero}
          pointerEvents="none"
        />
      )}
      <SafeAreaView edges={["top", "left", "right"]} style={[{ flex: 1 }, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/* ---------- Typography ---------- */

export function Display({ style, ...p }: TextProps) {
  const colors = useColors();
  return <Text {...p} style={[{ fontFamily: Fonts.display, color: colors.foreground, letterSpacing: -0.5 }, style]} />;
}
export function Body({ style, ...p }: TextProps) {
  const colors = useColors();
  return <Text {...p} style={[{ fontFamily: Fonts.body, color: colors.foreground, fontSize: 15, lineHeight: 22 }, style]} />;
}
export function Muted({ style, ...p }: TextProps) {
  const colors = useColors();
  return <Text {...p} style={[{ fontFamily: Fonts.body, color: colors.mutedForeground, fontSize: 13, lineHeight: 18 }, style]} />;
}
export function Pixel({ style, ...p }: TextProps) {
  const colors = useColors();
  return (
    <Text
      {...p}
      style={[{ fontFamily: Fonts.pixel, color: colors.primary, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }, style]}
    />
  );
}

export function SectionTitle({ title, action, style }: { title: string; action?: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Display style={{ fontSize: 16 }}>{title}</Display>
      {action}
    </View>
  );
}

/* ---------- Surfaces ---------- */

export function Card({ style, children, ...p }: ViewProps) {
  const colors = useColors();
  return (
    <View {...p} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

/* ---------- Buttons ---------- */

type PillProps = PressableProps & {
  label: string;
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  textStyle?: TextStyle;
};

export function Pill({ label, variant = "primary", size = "md", loading, icon, style, disabled, textStyle, ...p }: PillProps) {
  const colors = useColors();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.destructive
        : variant === "outline"
          ? "transparent"
          : "rgba(255,255,255,0.06)";
  const fg = variant === "primary" || variant === "danger" ? colors.primaryForeground : colors.foreground;
  const pad = size === "lg" ? { paddingVertical: 18, paddingHorizontal: 28 } : size === "sm" ? { paddingVertical: 9, paddingHorizontal: 14 } : { paddingVertical: 14, paddingHorizontal: 22 };
  const fontSize = size === "lg" ? 16 : size === "sm" ? 13 : 15;
  return (
    <Pressable
      {...p}
      disabled={disabled || loading}
      style={(state) => [
        styles.pill,
        pad,
        {
          backgroundColor: bg,
          borderColor: variant === "outline" ? colors.primary : "transparent",
          borderWidth: variant === "outline" ? 1.5 : 0,
          opacity: disabled ? 0.5 : state.pressed ? 0.85 : 1,
          transform: [{ scale: state.pressed ? 0.98 : 1 }],
        },
        variant === "primary" && styles.glow,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[{ fontFamily: Fonts.bodyExtraBold, color: fg, fontSize, letterSpacing: 0.2 }, textStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const colors = useColors();
  const c = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? c : "rgba(255,255,255,0.05)",
          borderColor: active ? c : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: Fonts.bodyBold,
          fontSize: 13,
          color: active ? colors.primaryForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({ children, style, ...p }: PressableProps & { children: ReactNode }) {
  const colors = useColors();
  return (
    <Pressable
      {...p}
      style={(s) => [
        styles.iconBtn,
        { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border, opacity: s.pressed ? 0.7 : 1 },
        typeof style === "function" ? style(s) : style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/* ---------- Stats ---------- */

export function Stat({ label, value, unit, color, pixel }: { label: string; value: string | number; unit?: string; color?: string; pixel?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ gap: 2 }}>
      <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Muted>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
        <Text style={{ fontFamily: pixel ? Fonts.pixelBold : Fonts.display, fontSize: pixel ? 20 : 22, color: color ?? colors.foreground }}>
          {value}
        </Text>
        {unit ? <Muted style={{ marginBottom: 3 }}>{unit}</Muted> : null}
      </View>
    </View>
  );
}

export function Row({ style, ...p }: ViewProps) {
  return <View {...p} style={[{ flexDirection: "row", alignItems: "center" }, style]} />;
}

export function Empty({ title, body, art }: { title: string; body?: string; art?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
      {art}
      <Display style={{ fontSize: 15, textAlign: "center" }}>{title}</Display>
      {body ? <Muted style={{ textAlign: "center", maxWidth: 260 }}>{body}</Muted> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: 380 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 18 },
  pill: {
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  glow: {
    shadowColor: "#39FF14",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
});
