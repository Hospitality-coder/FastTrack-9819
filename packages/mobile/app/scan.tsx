import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Fonts, Radius } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { Body, Card, Chip, Display, IconButton, Muted, Pill, Pixel, Row, Screen } from "@/components/ui";
import { Field, NumberField } from "@/components/Field";
import { useAnalyzeFood, useCreateFood } from "@/queries/food";
import { useUploadImage } from "@/queries/upload";
import { currentHour, today } from "@/lib/dates";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
type Analysis = NonNullable<ReturnType<typeof useAnalyzeFood>["data"]>;
type Item = Analysis["items"][number];

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
function guessMeal(): Meal {
  const h = currentHour();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export default function ScanScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? today();
  const upload = useUploadImage();
  const analyze = useAnalyzeFood();
  const create = useCreateFood();

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Review state (editable copy of the analysis)
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<Meal>(guessMeal());
  const [items, setItems] = useState<Item[]>([]);
  const [portionLabel, setPortionLabel] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  const busy = upload.isPending || analyze.isPending;

  const sum = (k: keyof Omit<Item, "name" | "portion">) => Math.round(items.reduce((a, it) => a + (Number(it[k]) || 0), 0));

  const pick = async (source: "camera" | "library") => {
    setError(null);
    try {
      if (source === "camera" && Platform.OS !== "web") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError("Camera permission denied. Pick from your library instead.");
          return;
        }
      }
      const res =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      let uri = asset.uri;
      try {
        const out = await manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.8, format: SaveFormat.JPEG });
        uri = out.uri;
      } catch {
        // keep original
      }
      setLocalUri(uri);
      await run(uri, hint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong picking that photo.");
    }
  };

  const run = async (uri: string, h: string) => {
    setError(null);
    try {
      const url = photoUrl && uri === localUri ? photoUrl : await upload.mutateAsync({ uri, contentType: "image/jpeg" });
      setPhotoUrl(url);
      const a = await analyze.mutateAsync({ imageUrl: url, hint: h.trim() || undefined });
      if (!a.isFood) {
        setError("That doesn't look like food. Try another shot or add the meal manually.");
        return;
      }
      setResult(a);
      setName(a.mealName);
      setItems(a.items.length ? a.items : [{ name: a.mealName, portion: "1 serving", ...a.totals }]);
      setPortionLabel(a.portionSizeLabel);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Try again or enter manually.");
    }
  };

  const updateItem = (i: number, patch: Partial<Item>) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const save = async () => {
    await create.mutateAsync({
      date,
      meal,
      name: name.trim() || "Scanned meal",
      photoUrl,
      portion: items.length === 1 ? items[0]!.portion : `${items.length} items · ${portionLabel}`,
      calories: sum("calories"),
      protein: sum("protein"),
      carbs: sum("carbs"),
      sugar: sum("sugar"),
      fat: sum("fat"),
      fiber: sum("fiber"),
      source: "scan",
      aiRaw: result,
    });
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Row style={{ justifyContent: "space-between" }}>
            <View>
              <Pixel>AI scan</Pixel>
              <Display style={{ fontSize: 24, marginTop: 4 }}>{result ? "Check the numbers" : "Show me the plate"}</Display>
            </View>
            <IconButton onPress={() => router.back()}>
              <Ionicons name="close" size={18} color={colors.foreground} />
            </IconButton>
          </Row>

          {/* Photo / picker */}
          <Card style={{ alignItems: "center", gap: 14, overflow: "hidden", padding: localUri ? 0 : 18 }}>
            {localUri ? (
              <View style={{ width: "100%" }}>
                <Image source={{ uri: localUri }} style={{ width: "100%", height: 240 }} resizeMode="cover" />
                {busy && (
                  <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(7,10,7,0.72)", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Pixel>{upload.isPending ? "Uploading…" : "Reading the plate…"}</Pixel>
                  </View>
                )}
                {!busy && (
                  <Row style={{ position: "absolute", bottom: 10, right: 10, gap: 8 }}>
                    <IconButton onPress={() => pick("library")}>
                      <Ionicons name="images-outline" size={16} color={colors.foreground} />
                    </IconButton>
                    <IconButton onPress={() => pick("camera")}>
                      <Ionicons name="camera-outline" size={16} color={colors.foreground} />
                    </IconButton>
                  </Row>
                )}
              </View>
            ) : (
              <>
                <Image source={require("../assets/icon.png")} style={{ width: 90, height: 90 }} />
                <Body style={{ textAlign: "center", color: colors.mutedForeground, maxWidth: 280 }}>
                  Photograph the whole plate from above with good light. The ninja chef estimates portions in grams and returns calories, sugar and macros.
                </Body>
                <Field label="Hint (optional)" placeholder="e.g. homemade, large portion, oat milk" value={hint} onChangeText={setHint} />
                <Row style={{ gap: 10, width: "100%" }}>
                  <Pill label="Camera" style={{ flex: 1 }} onPress={() => pick("camera")} icon={<Ionicons name="camera" size={18} color={colors.primaryForeground} />} />
                  <Pill label="Library" variant="ghost" style={{ flex: 1 }} onPress={() => pick("library")} icon={<Ionicons name="images" size={18} color={colors.foreground} />} />
                </Row>
              </>
            )}
          </Card>

          {error && (
            <Card style={{ borderColor: colors.destructive, gap: 10 }}>
              <Body style={{ color: colors.destructive }}>{error}</Body>
              <Row style={{ gap: 10 }}>
                {localUri && <Pill label="Retry" size="sm" variant="outline" onPress={() => run(localUri, hint)} />}
                <Pill label="Enter manually" size="sm" variant="ghost" onPress={() => router.replace({ pathname: "/food-entry", params: { date } })} />
              </Row>
            </Card>
          )}

          {/* Review */}
          {result && !busy && (
            <>
              <Card style={{ gap: 14 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Row style={{ gap: 6 }}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Pixel style={{ fontSize: 10 }}>{Math.round(result.confidence * 100)}% confident</Pixel>
                  </Row>
                  <Pixel style={{ fontSize: 10, color: result.healthScore >= 7 ? colors.primary : result.healthScore >= 4 ? colors.warning : colors.destructive }}>
                    health {result.healthScore}/10
                  </Pixel>
                </Row>
                <Row style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={{ fontFamily: Fonts.display, fontSize: 40, color: colors.foreground }}>{sum("calories")}</Text>
                  <Muted style={{ marginBottom: 8 }}>kcal · {portionLabel} portion</Muted>
                </Row>
                <Row style={{ gap: 8, flexWrap: "wrap" }}>
                  {(
                    [
                      ["Protein", sum("protein"), colors.primary],
                      ["Carbs", sum("carbs"), colors.accent],
                      ["Sugar", sum("sugar"), colors.warning],
                      ["Fat", sum("fat"), colors.foreground],
                      ["Fiber", sum("fiber"), colors.water],
                    ] as const
                  ).map(([l, v, col]) => (
                    <View key={l} style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Muted style={{ fontSize: 10 }}>{l}</Muted>
                      <Text style={{ fontFamily: Fonts.bodyExtraBold, color: col, fontSize: 14 }}>{v} g</Text>
                    </View>
                  ))}
                </Row>
                {result.notes ? <Muted>{result.notes}</Muted> : null}
              </Card>

              <Card style={{ gap: 14 }}>
                <Field label="Meal name" value={name} onChangeText={setName} />
                <View style={{ gap: 6 }}>
                  <Muted style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Meal</Muted>
                  <Row style={{ gap: 8, flexWrap: "wrap" }}>
                    {MEALS.map((m) => (
                      <Chip key={m} label={m[0]!.toUpperCase() + m.slice(1)} active={meal === m} onPress={() => setMeal(m)} />
                    ))}
                  </Row>
                </View>
              </Card>

              <View style={{ gap: 10 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Display style={{ fontSize: 16 }}>Items</Display>
                  <Pressable
                    onPress={() => setItems((a) => [...a, { name: "New item", portion: "100 g", calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, fiber: 0 }])}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Pixel style={{ fontSize: 10 }}>Add item</Pixel>
                  </Pressable>
                </Row>
                {items.map((it, i) => (
                  <Card key={i} style={{ gap: 10 }}>
                    <Row style={{ gap: 10 }}>
                      <Field label="Item" value={it.name} onChangeText={(t) => updateItem(i, { name: t })} />
                      <Field label="Portion" value={it.portion} onChangeText={(t) => updateItem(i, { portion: t })} style={{ maxWidth: 110 }} />
                      <Pressable onPress={() => setItems((a) => a.filter((_, idx) => idx !== i))} hitSlop={8} style={{ paddingTop: 30 }}>
                        <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
                      </Pressable>
                    </Row>
                    <Row style={{ gap: 8 }}>
                      <NumberField label="kcal" value={it.calories} onChange={(n) => updateItem(i, { calories: n ?? 0 })} />
                      <NumberField label="Protein" value={it.protein} onChange={(n) => updateItem(i, { protein: n ?? 0 })} suffix="g" />
                      <NumberField label="Carbs" value={it.carbs} onChange={(n) => updateItem(i, { carbs: n ?? 0 })} suffix="g" />
                    </Row>
                    <Row style={{ gap: 8 }}>
                      <NumberField label="Sugar" value={it.sugar} onChange={(n) => updateItem(i, { sugar: n ?? 0 })} suffix="g" />
                      <NumberField label="Fat" value={it.fat} onChange={(n) => updateItem(i, { fat: n ?? 0 })} suffix="g" />
                      <NumberField label="Fiber" value={it.fiber} onChange={(n) => updateItem(i, { fiber: n ?? 0 })} suffix="g" />
                    </Row>
                  </Card>
                ))}
              </View>

              <Pill
                label={`Log ${sum("calories")} kcal`}
                size="lg"
                onPress={save}
                loading={create.isPending}
                disabled={items.length === 0}
                icon={<Ionicons name="checkmark" size={18} color={colors.primaryForeground} />}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
