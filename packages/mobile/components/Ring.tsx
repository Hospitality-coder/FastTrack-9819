import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  stroke?: number;
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  glow?: boolean;
};

/** Neon progress ring with animated fill and soft outer glow. */
export function Ring({ size, stroke = 12, progress, color, trackColor, children, glow = true }: Props) {
  const colors = useColors();
  const c = color ?? colors.primary;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  const dashOffset = anim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c} />
            <Stop offset="1" stopColor={c === colors.primary ? colors.accent : c} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? "rgba(255,255,255,0.08)"} strokeWidth={stroke} fill="none" />
        {glow && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={c}
            strokeOpacity={0.25}
            strokeWidth={stroke + 10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
