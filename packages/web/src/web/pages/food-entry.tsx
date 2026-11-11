import { useEffect, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { X } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Card, Chip, Confirm, Eyebrow, FadeUp, Field, IconButton, NumberField, Pill, Pixel, Spinner } from "../components/ui";
import { useCreateFood, useDeleteFood, useFoodByDate, useUpdateFood } from "../queries/food";
import { currentHour, prettyDate, today } from "../lib/dates";

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export default function FoodEntryPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id?: string }>();
  const search = new URLSearchParams(useSearch());
  const date = search.get("date") ?? today();
  const id = params.id && params.id !== "new" ? Number(params.id) : null;
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
  const back = () => navigate("/food");

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
    back();
  };

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
      <FadeUp>
        <PageHeader
          eyebrow={prettyDate(date)}
          title={id ? "Edit entry" : "Add food"}
          right={
            <IconButton onClick={back} aria-label="Close">
              <X className="h-[18px] w-[18px]" />
            </IconButton>
          }
        />
      </FadeUp>

      {id && existing.isLoading ? (
        <Card className="flex justify-center py-10">
          <Spinner />
        </Card>
      ) : (
        <>
          <FadeUp delay={0.08}>
            <Card className="flex flex-col gap-3.5">
              <Field label="Name" placeholder="Grilled chicken salad" value={name} onChangeText={setName} />
              <Field label="Portion (optional)" placeholder="e.g. 250 g, 1 bowl" value={portion} onChangeText={setPortion} />
              <div className="flex flex-col gap-1.5">
                <Eyebrow>Meal</Eyebrow>
                <div className="flex flex-wrap gap-2">
                  {MEALS.map((m) => (
                    <Chip key={m} label={m[0]!.toUpperCase() + m.slice(1)} active={meal === m} onClick={() => setMeal(m)} />
                  ))}
                </div>
              </div>
            </Card>
          </FadeUp>

          <FadeUp delay={0.14}>
            <Card className="flex flex-col gap-3">
              <Pixel className="text-[10px]">Nutrition</Pixel>
              <NumberField label="Calories" value={calories} onChange={setCalories} suffix="kcal" placeholder="0" />
              <div className="flex gap-2">
                <NumberField label="Protein" value={protein} onChange={setProtein} suffix="g" placeholder="0" />
                <NumberField label="Carbs" value={carbs} onChange={setCarbs} suffix="g" placeholder="0" />
                <NumberField label="Sugar" value={sugar} onChange={setSugar} suffix="g" placeholder="0" />
              </div>
              <div className="flex gap-2">
                <NumberField label="Fat" value={fat} onChange={setFat} suffix="g" placeholder="0" />
                <NumberField label="Fiber" value={fiber} onChange={setFiber} suffix="g" placeholder="0" />
              </div>
            </Card>
          </FadeUp>

          <FadeUp delay={0.2} className="flex flex-col gap-2.5">
            <Pill label={id ? "Save changes" : "Add to log"} size="lg" onClick={save} disabled={!valid} loading={create.isPending || update.isPending} />
            {id ? <Pill label="Delete entry" variant="ghost" className="text-destructive" onClick={() => setConfirm(true)} /> : null}
          </FadeUp>
        </>
      )}

      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          if (id) await del.mutateAsync({ id });
          setConfirm(false);
          back();
        }}
        danger
        title="Delete this entry?"
        body="It disappears from today's totals."
        confirmLabel="Delete"
        loading={del.isPending}
      />
    </div>
  );
}
