import { Platform } from "react-native";

/**
 * FastTrack color tokens — see /design.md. The app is always dark (black base +
 * neon green), so both schemes resolve to the same palette.
 */
const palette = {
  background: "#070A07",
  foreground: "#E8FFE0",
  card: "#0F1A10",
  cardForeground: "#E8FFE0",
  primary: "#39FF14",
  primaryForeground: "#061006",
  secondary: "#153D22",
  secondaryForeground: "#E8FFE0",
  muted: "#101810",
  mutedForeground: "#8A9A8C",
  accent: "#B6FF5C",
  accentForeground: "#061006",
  border: "#1E2E20",
  destructive: "#FF4D6D",
  success: "#39FF14",
  warning: "#FFD60A",
  water: "#38E1FF",
  deep: "#153D22",
  deeper: "#0B2213",
} as const;

export const Colors = {
  light: palette,
  dark: palette,
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ColorScheme];

/**
 * Font families. Loaded in app/_layout.tsx via expo-font.
 *  - display: Unbounded (headlines, timer digits)
 *  - body: Manrope
 *  - pixel: Silkscreen (accent words, streak counts, rank labels)
 */
export const Fonts = {
  display: "Unbounded_700Bold",
  displayBlack: "Unbounded_900Black",
  displayMedium: "Unbounded_500Medium",
  body: "Manrope_500Medium",
  bodyBold: "Manrope_700Bold",
  bodyExtraBold: "Manrope_800ExtraBold",
  pixel: "Silkscreen_400Regular",
  pixelBold: "Silkscreen_700Bold",
  mono: Platform.select({ ios: "ui-monospace", web: "'SF Mono', monospace", default: "monospace" }) as string,
} as const;

export const Radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;
