import { View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Muted, Row } from "./ui";

type Cell = { date: string; hours: number; completed: boolean };

/** 12-week grid, columns = weeks, rows = weekdays. */
export function StreakHeatmap({ cells }: { cells: Cell[] }) {
  const colors = useColors();
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const shade = (c: Cell) => {
    if (c.completed) return colors.primary;
    if (c.hours >= 12) return "rgba(57,255,20,0.45)";
    if (c.hours >= 4) return "rgba(57,255,20,0.22)";
    return "rgba(255,255,255,0.06)";
  };
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ gap: 4 }}>
        {weeks.map((w, wi) => (
          <View key={wi} style={{ gap: 4 }}>
            {w.map((c) => (
              <View key={c.date} style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: shade(c) }} />
            ))}
          </View>
        ))}
      </Row>
      <Row style={{ gap: 12 }}>
        <Row style={{ gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)" }} />
          <Muted style={{ fontSize: 11 }}>none</Muted>
        </Row>
        <Row style={{ gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "rgba(57,255,20,0.3)" }} />
          <Muted style={{ fontSize: 11 }}>partial</Muted>
        </Row>
        <Row style={{ gap: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.primary }} />
          <Muted style={{ fontSize: 11 }}>completed</Muted>
        </Row>
      </Row>
    </View>
  );
}
