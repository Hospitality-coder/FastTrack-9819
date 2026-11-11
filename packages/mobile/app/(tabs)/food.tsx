import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Body, Card, Display, Empty, IconButton, Muted, Pill, Pixel, Row, Screen, SectionTitle } from "@/components/ui";
import { MacroBar } from "@/components/MacroBar";
import { WeekBars } from "@/components/WeekBars";
import { useDeleteFood, useFoodByDate, useFoodWeek } from "@/queries/food";
import { addDays, prettyDate, today } from "@/lib/dates";

const MEALS = [
  { key: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { key: "lunch", label: "Lunch", icon: "restaurant-outline" },
  { key: "dinner", label: "Dinner", icon: "moon-outline" },
  { key: "snack", label: "Snacks", icon: "nutrition-outline" },
] as const;

export default function FoodScreen() {
  const colors = useColors();
  const [date, setDate] = useState(today());
  const food = useFoodByDate(date);
  const week = useFoodWeek(7);
  const del = useDeleteFood(date);

  const totals = food.data?.totals;
  const targets = food.data?.targets;
  const remaining = (targets?.calories ?? 2000) - (totals?.calories ?? 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 18 }} showsVerticalScrollIndicator={false}>
        <Row style={{ justifyContent: "space-between" }}>
          <View>
            <Pixel>Food log</Pixel>
            <Display style={{ fontSize: 26, marginTop: 4 }}>{prettyDate(date)}</Display>
          </View>
          <Row style={{ gap: 8 }}>
            <IconButton onPress={() => setDate((d) => addDays(d, -1))}>
              <Ionicons name="chevron-back" size={18} color={colors.foreground} />
            </IconButton>
            <IconButton onPress={() => setDate((d) => addDays(d, 1))} disabled={date >= today()} style={{ opacity: date >= today() ? 0.4 : 1 }}>
              <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
            </IconButton>
          </Row>
        </Row>

        {/* Totals */}
        <Card style={{ gap: 14, backgroundColor: "rgba(10,20,12,0.85)" }}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Eaten</Muted>
              <Row style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontFamily: Fonts.display, fontSize: 38, color: colors.foreground }}>{Math.round(totals?.calories ?? 0)}</Text>
                <Muted style={{ marginBottom: 7 }}>/ {targets?.calories ?? 2000} kcal</Muted>
              </Row>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{remaining >= 0 ? "Left" : "Over"}</Muted>
              <Pixel style={{ fontSize: 18, color: remaining >= 0 ? colors.primary : colors.destructive }}>{Math.abs(Math.round(remaining))}</Pixel>
            </View>
          </Row>
          <MacroBar label="Protein" value={totals?.protein ?? 0} target={targets?.protein ?? 120} />
          <MacroBar label="Carbs" value={totals?.carbs ?? 0} target={targets?.carbs ?? 200} color={colors.accent} />
          <MacroBar label="Sugar" value={totals?.sugar ?? 0} target={targets?.sugar ?? 50} color={colors.warning} overIsBad />
          <Row style={{ gap: 18 }}>
            <Muted>
              Fat <Body style={{ fontFamily: Fonts.bodyBold, fontSize: 13 }}>{Math.round(totals?.fat ?? 0)} g</Body>
            </Muted>
            <Muted>
              Fiber <Body style={{ fontFamily: Fonts.bodyBold, fontSize: 13 }}>{Math.round(totals?.fiber ?? 0)} g</Body>
            </Muted>
            <Muted>
              Items <Body style={{ fontFamily: Fonts.bodyBold, fontSize: 13 }}>{totals?.count ?? 0}</Body>
            </Muted>
          </Row>
        </Card>

        {/* Actions */}
        <Row style={{ gap: 10 }}>
          <Pill
            label="Scan meal"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: "/scan", params: { date } })}
            icon={<Ionicons name="camera" size={18} color={colors.primaryForeground} />}
          />
          <Pill
            label="Add manually"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: "/food-entry", params: { date } })}
            icon={<Ionicons name="create-outline" size={18} color={colors.foreground} />}
          />
        </Row>

        {/* Meals */}
        {food.data && food.data.entries.length === 0 ? (
          <Card>
            <Empty
              title="Nothing logged yet"
              body="Snap a photo of your plate and the ninja chef will break it down — calories, sugar, protein, the lot."
              art={<Image source={require("../../assets/icon.png")} style={{ width: 72, height: 72, marginBottom: 6 }} />}
            />
          </Card>
        ) : (
          MEALS.map((m) => {
            const entries = food.data?.entries.filter((e) => e.meal === m.key) ?? [];
            if (entries.length === 0) return null;
            const kcal = Math.round(entries.reduce((a, e) => a + e.calories, 0));
            return (
              <View key={m.key}>
                <SectionTitle
                  title={m.label}
                  action={<Muted style={{ fontFamily: Fonts.bodyBold }}>{kcal} kcal</Muted>}
                />
                <Card style={{ padding: 6 }}>
                  {entries.map((e, i) => (
                    <Pressable
                      key={e.id}
                      onPress={() => router.push({ pathname: "/food-entry", params: { id: String(e.id), date } })}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 10,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: colors.border,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      {e.photoUrl ? (
                        <Image source={{ uri: e.photoUrl }} style={{ width: 52, height: 52, borderRadius: Radius.sm }} />
                      ) : (
                        <View style={{ width: 52, height: 52, borderRadius: Radius.sm, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name={m.icon} size={22} color={colors.accent} />
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Body style={{ fontFamily: Fonts.bodyBold }} numberOfLines={1}>
                          {e.name}
                        </Body>
                        <Muted numberOfLines={1}>
                          {e.portion ? `${e.portion} · ` : ""}P {Math.round(e.protein)} · C {Math.round(e.carbs)} · S {Math.round(e.sugar)} · F {Math.round(e.fat)}
                        </Muted>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={{ fontFamily: Fonts.display, fontSize: 15, color: colors.foreground }}>{Math.round(e.calories)}</Text>
                        <Pressable onPress={() => del.mutate({ id: e.id })} hitSlop={10}>
                          <Ionicons name="trash-outline" size={15} color={colors.mutedForeground} />
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}
                </Card>
              </View>
            );
          })
        )}

        {/* Week */}
        <View>
          <SectionTitle title="Last 7 days" action={<Muted>kcal vs target</Muted>} />
          <Card>
            {week.data ? (
              <WeekBars
                bars={week.data.map((d) => ({ date: d.date, value: Math.round(d.calories) }))}
                target={targets?.calories}
                overColor={colors.destructive}
                format={(v) => (v ? String(v) : "")}
              />
            ) : null}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
