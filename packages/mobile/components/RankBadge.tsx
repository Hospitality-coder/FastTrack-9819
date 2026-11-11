import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Muted, Pixel, Row } from "./ui";

type Rank = { name: string; completed: number; nextName: string | null; nextAt: number | null; progress: number };

export function RankBadge({ rank, compact }: { rank: Rank; compact?: boolean }) {
  const colors = useColors();
  if (compact) {
    return (
      <Row style={{ gap: 6, backgroundColor: "rgba(57,255,20,0.12)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
        <Ionicons name="flash" size={12} color={colors.primary} />
        <Pixel style={{ fontSize: 11 }}>{rank.name}</Pixel>
      </Row>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View>
          <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Ninja rank</Muted>
          <Pixel style={{ fontSize: 18, marginTop: 2 }}>{rank.name}</Pixel>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontFamily: Fonts.display, fontSize: 22, color: colors.foreground }}>{rank.completed}</Text>
          <Muted style={{ fontSize: 11 }}>fasts done</Muted>
        </View>
      </Row>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <View style={{ width: `${Math.round(rank.progress * 100)}%`, height: "100%", backgroundColor: colors.primary }} />
      </View>
      <Muted style={{ fontSize: 12 }}>
        {rank.nextName ? `${rank.nextAt! - rank.completed} more to reach ${rank.nextName}` : "Max rank. Legendary."}
      </Muted>
    </View>
  );
}
