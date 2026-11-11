import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { Card, Chip, Display, IconButton, Muted, Pill, Pixel, Row, Screen } from "@/components/ui";
import { Field, NumberField } from "@/components/Field";
import { Confirm } from "@/components/Confirm";
import { useCreateFood, useDeleteFood, useFoodByDate, useUpdateFood } from "@/queries/food";
import { currentHour, prettyDate, today } from "@/lib/dates";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export default function FoodEntryScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const date = params.date ?? today();
  const id = params.id ? Number(params.id) : null;
  const existing = useFoodByDate(date);
  const entry = id ? existing.data?.entries.find((e) => e.id === id) : undefined;

  const create = useCreateFood();
  const update = useUpdateFood();
  const del = useDeleteFood(date);

  const [name, setName] = useState("");
  const [portion, setPortion] = useState("");
  const [meal, setMeal] = useState<Meal>(() => {
    const h = currentHour();
    return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snack";
  });
  const [calories, setCalories] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [sugar, setSugar] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [fiber, setFiber] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!entry || loaded) return;
    setLoaded(true);
    setName(entry.name);
    setPortion(entry.portion ?? "");
    setMeal(entry.meal as Meal);
    setCalories(entry.calories);
    setProtein(entry.protein);
    setCarbs(entry.carbs);
    setSugar(entry.sugar);
    setFat(entry.fat);
    setFiber(entry.fiber);
  }, [entry, loaded]);

  const valid = name.trim().length > 0 && calories !== null && calories >= 0;

  const save = async () => {
    const payload = {
      date,
      meal,
      name: name.trim(),
      portion: portion.trim() || null,
      calories: calories ?? 0,
      protein: protein ?? 0,
      carbs: carbs ?? 0,
      sugar: sugar ?? 0,
      fat: fat ?? 0,
      fiber: fiber ?? 0,
    };
    if (id) await update.mutateAsync({ id, ...payload });
    else await create.mutateAsync({ ...payload, source: "manual" });
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Row style={{ justifyContent: "space-between" }}>
            <View>
              <Pixel>{prettyDate(date)}</Pixel>
              <Display style={{ fontSize: 24, marginTop: 4 }}>{id ? "Edit entry" : "Add food"}</Display>
            </View>
            <IconButton onPress={() => router.back()}>
              <Ionicons name="close" size={18} color={colors.foreground} />
            </IconButton>
          </Row>

          <Card style={{ gap: 14 }}>
            <Field label="Name" placeholder="Grilled chicken salad" value={name} onChangeText={setName} />
            <Field label="Portion (optional)" placeholder="e.g. 250 g, 1 bowl" value={portion} onChangeText={setPortion} />
            <View style={{ gap: 6 }}>
              <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Meal</Muted>
              <Row style={{ gap: 8, flexWrap: "wrap" }}>
                {MEALS.map((m) => (
                  <Chip key={m} label={m[0]!.toUpperCase() + m.slice(1)} active={meal === m} onPress={() => setMeal(m)} />
                ))}
              </Row>
            </View>
          </Card>

          <Card style={{ gap: 12 }}>
            <Pixel style={{ fontSize: 10 }}>Nutrition</Pixel>
            <NumberField label="Calories" value={calories} onChange={setCalories} suffix="kcal" placeholder="0" />
            <Row style={{ gap: 8 }}>
              <NumberField label="Protein" value={protein} onChange={setProtein} suffix="g" placeholder="0" />
              <NumberField label="Carbs" value={carbs} onChange={setCarbs} suffix="g" placeholder="0" />
              <NumberField label="Sugar" value={sugar} onChange={setSugar} suffix="g" placeholder="0" />
            </Row>
            <Row style={{ gap: 8 }}>
              <NumberField label="Fat" value={fat} onChange={setFat} suffix="g" placeholder="0" />
              <NumberField label="Fiber" value={fiber} onChange={setFiber} suffix="g" placeholder="0" />
            </Row>
          </Card>

          <Pill label={id ? "Save changes" : "Add to log"} size="lg" onPress={save} disabled={!valid} loading={create.isPending || update.isPending} />
          {id ? <Pill label="Delete entry" variant="ghost" onPress={() => setConfirm(true)} textStyle={{ color: colors.destructive }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Confirm
        visible={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          if (id) await del.mutateAsync({ id });
          setConfirm(false);
          router.back();
        }}
        danger
        title="Delete this entry?"
        body="It disappears from today's totals."
        confirmLabel="Delete"
        loading={del.isPending}
      />
    </Screen>
  );
}
