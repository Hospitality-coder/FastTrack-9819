import { View, Text } from "react-native";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Body, Muted, Pixel, Row } from "./ui";

export type Suggestion = {
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  sugar: number;
  tags: string[];
  whyForYou: string;
};

export function SuggestionCard({ item, width }: { item: Suggestion; width?: number }) {
  const colors = useColors();
  return (
    <View
      style={{
        width,
        backgroundColor: colors.deeper,
        borderColor: "rgba(57,255,20,0.25)",
        borderWidth: 1,
        borderRadius: Radius.lg,
        padding: 16,
        gap: 10,
      }}
    >
      <Row style={{ gap: 6, flexWrap: "wrap" }}>
        {item.tags.slice(0, 3).map((t) => (
          <Pixel key={t} style={{ fontSize: 9, backgroundColor: "rgba(57,255,20,0.12)", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
            {t}
          </Pixel>
        ))}
      </Row>
      <Text style={{ fontFamily: Fonts.display, fontSize: 16, color: colors.foreground }}>{item.title}</Text>
      <Body style={{ fontSize: 13, lineHeight: 19, color: "#C9DCC5" }} numberOfLines={3}>
        {item.description}
      </Body>
      <Row style={{ gap: 14 }}>
        <Macro v={item.calories} u="kcal" />
        <Macro v={item.protein} u="g P" />
        <Macro v={item.carbs} u="g C" />
        <Macro v={item.sugar} u="g S" />
      </Row>
      <Muted style={{ fontSize: 12, fontStyle: "italic" }} numberOfLines={2}>
        {item.whyForYou}
      </Muted>
    </View>
  );
}

function Macro({ v, u }: { v: number; u: string }) {
  const colors = useColors();
  return (
    <Text style={{ fontFamily: Fonts.bodyBold, color: colors.accent, fontSize: 12 }}>
      {Math.round(v)}
      <Text style={{ color: colors.mutedForeground, fontFamily: Fonts.body }}> {u}</Text>
    </Text>
  );
}
