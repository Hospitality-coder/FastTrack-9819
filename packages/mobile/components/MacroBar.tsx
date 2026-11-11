import { View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Muted, Row } from "./ui";
import { Text } from "react-native";

type Props = { label: string; value: number; target: number; unit?: string; color?: string; overIsBad?: boolean };

export function MacroBar({ label, value, target, unit = "g", color, overIsBad }: Props) {
  const colors = useColors();
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = target > 0 && value > target;
  const fill = over && overIsBad ? colors.destructive : (color ?? colors.primary);
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Muted style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</Muted>
        <Text style={{ fontFamily: Fonts.bodyBold, fontSize: 13, color: over && overIsBad ? colors.destructive : colors.foreground }}>
          {Math.round(value)}
          <Text style={{ color: colors.mutedForeground, fontFamily: Fonts.body }}>
            {" "}/ {target}
            {unit}
          </Text>
        </Text>
      </Row>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: fill, borderRadius: 4 }} />
      </View>
    </View>
  );
}
