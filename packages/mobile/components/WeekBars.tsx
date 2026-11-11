import { View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { shortDay, today } from "@/lib/dates";
import { Muted, Row } from "./ui";

type Bar = { date: string; value: number };

/** Simple 7-day bar chart; bars above `target` turn `overColor`. */
export function WeekBars({
  bars,
  target,
  color,
  overColor,
  height = 90,
  format,
}: {
  bars: Bar[];
  target?: number;
  color?: string;
  overColor?: string;
  height?: number;
  format?: (v: number) => string;
}) {
  const colors = useColors();
  const fill = color ?? colors.primary;
  const max = Math.max(target ?? 0, ...bars.map((b) => b.value), 1) * 1.05;
  const t = today();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height, position: "relative" }}>
        {target ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: (target / max) * height,
              borderTopWidth: 1,
              borderStyle: "dashed",
              borderColor: "rgba(255,255,255,0.25)",
            }}
          />
        ) : null}
        <Row style={{ height, alignItems: "flex-end", gap: 8 }}>
          {bars.map((b) => {
            const h = Math.max(3, (b.value / max) * height);
            const over = target !== undefined && b.value > target && overColor;
            return (
              <View key={b.date} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height }}>
                <View
                  style={{
                    width: "100%",
                    height: h,
                    borderRadius: 6,
                    backgroundColor: over ? overColor : b.date === t ? fill : `${fill}88`,
                  }}
                />
              </View>
            );
          })}
        </Row>
      </View>
      <Row style={{ gap: 8 }}>
        {bars.map((b) => (
          <View key={b.date} style={{ flex: 1, alignItems: "center" }}>
            <Muted style={{ fontSize: 10, color: b.date === t ? colors.foreground : colors.mutedForeground }}>{shortDay(b.date).slice(0, 2)}</Muted>
            {format ? <Muted style={{ fontSize: 9 }}>{format(b.value)}</Muted> : null}
          </View>
        ))}
      </Row>
    </View>
  );
}
