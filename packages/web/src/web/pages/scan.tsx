import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Camera, Check, Images, Plus, Sparkles, Trash2, X } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Card, Chip, Display, Eyebrow, FadeUp, Field, IconButton, Muted, NumberField, Pill, Pixel, Spinner } from "../components/ui";
import { useAnalyzeFood, useCreateFood } from "../queries/food";
import { compressImage, useUploadImage } from "../queries/upload";
import { currentHour, today } from "../lib/dates";

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

export default function ScanPage() {
  const [, navigate] = useLocation();
  const search = new URLSearchParams(useSearch());
  const date = search.get("date") ?? today();
  const upload = useUploadImage();
  const analyze = useAnalyzeFood();
  const create = useCreateFood();

  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const [blob, setBlob] = useState<Blob | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [meal, setMeal] = useState<Meal>(guessMeal());
  const [items, setItems] = useState<Item[]>([]);
  const [portionLabel, setPortionLabel] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  const busy = upload.isPending || analyze.isPending;

  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl]);

  const sum = (k: keyof Omit<Item, "name" | "portion">) => Math.round(items.reduce((a, it) => a + (Number(it[k]) || 0), 0));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);
    const compressed = await compressImage(file);
    setBlob(compressed);
    setPhotoUrl(null);
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(URL.createObjectURL(compressed));
    await run(compressed, hint, null);
  };

  const run = async (b: Blob, h: string, existingUrl: string | null) => {
    setError(null);
    try {
      const url = existingUrl ?? (await upload.mutateAsync({ blob: b, contentType: "image/jpeg" }));
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
    navigate("/food");
  };

  const healthColor = result ? (result.healthScore >= 7 ? "var(--primary)" : result.healthScore >= 4 ? "var(--warning)" : "var(--destructive)") : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
      <input ref={cameraInput} aria-label="Take a photo" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <input ref={libraryInput} aria-label="Upload a photo" type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      <FadeUp>
        <PageHeader
          eyebrow="AI scan"
          title={result ? "Check the numbers" : "Show me the plate"}
          right={
            <IconButton onClick={() => navigate("/food")} aria-label="Close">
              <X className="h-[18px] w-[18px]" />
            </IconButton>
          }
        />
      </FadeUp>

      <FadeUp delay={0.08}>
        <Card className={`flex flex-col items-center gap-3.5 overflow-hidden ${localUrl ? "p-0" : "p-5"}`}>
          {localUrl ? (
            <div className="relative w-full">
              <img src={localUrl} alt="Your plate" className="h-[280px] w-full object-cover md:h-[360px]" />
              {busy && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[rgba(7,10,7,0.75)]">
                  <Spinner className="h-8 w-8" />
                  <Pixel>{upload.isPending ? "Uploading…" : "Reading the plate…"}</Pixel>
                </div>
              )}
              {!busy && (
                <div className="absolute bottom-2.5 right-2.5 flex gap-2">
                  <IconButton onClick={() => libraryInput.current?.click()} aria-label="Choose from library">
                    <Images className="h-4 w-4" />
                  </IconButton>
                  <IconButton onClick={() => cameraInput.current?.click()} aria-label="Take photo">
                    <Camera className="h-4 w-4" />
                  </IconButton>
                </div>
              )}
            </div>
          ) : (
            <>
              <img src="/images/ninja.png" alt="" className="h-[90px] w-[90px] object-contain" />
              <p className="max-w-[320px] text-center text-[14px] text-muted-foreground">
                Photograph the whole plate from above with good light. The ninja chef estimates portions in grams and returns calories, sugar and macros.
              </p>
              <Field label="Hint (optional)" placeholder="e.g. homemade, large portion, oat milk" value={hint} onChangeText={setHint} containerClassName="w-full" />
              <div className="flex w-full gap-2.5">
                <Pill label="Camera" className="flex-1" onClick={() => cameraInput.current?.click()} icon={<Camera className="h-[18px] w-[18px]" />} />
                <Pill label="Upload photo" variant="ghost" className="flex-1" onClick={() => libraryInput.current?.click()} icon={<Images className="h-[18px] w-[18px]" />} />
              </div>
            </>
          )}
        </Card>
      </FadeUp>

      {error && (
        <Card className="flex flex-col gap-2.5 border-destructive">
          <p className="text-[14px] text-destructive">{error}</p>
          <div className="flex gap-2.5">
            {blob && <Pill label="Retry" size="sm" variant="outline" onClick={() => run(blob, hint, photoUrl)} />}
            <Pill label="Enter manually" size="sm" variant="ghost" onClick={() => navigate(`/food/new?date=${date}`)} />
          </div>
        </Card>
      )}

      {result && !busy && (
        <>
          <FadeUp>
            <Card className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <Pixel className="text-[10px]">{Math.round(result.confidence * 100)}% confident</Pixel>
                </span>
                <Pixel className="text-[10px]" color={healthColor}>
                  health {result.healthScore}/10
                </Pixel>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="font-display text-[40px] font-bold leading-none text-foreground">{sum("calories")}</span>
                <Muted className="mb-1">kcal · {portionLabel} portion</Muted>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["Protein", sum("protein"), "var(--primary)"],
                    ["Carbs", sum("carbs"), "var(--accent)"],
                    ["Sugar", sum("sugar"), "var(--warning)"],
                    ["Fat", sum("fat"), "var(--foreground)"],
                    ["Fiber", sum("fiber"), "var(--water)"],
                  ] as const
                ).map(([l, v, col]) => (
                  <div key={l} className="flex flex-col rounded-md bg-white/5 px-2.5 py-1.5">
                    <Muted className="text-[10px]">{l}</Muted>
                    <span className="text-[14px] font-extrabold" style={{ color: col }}>
                      {v} g
                    </span>
                  </div>
                ))}
              </div>
              {result.notes ? <Muted>{result.notes}</Muted> : null}
            </Card>
          </FadeUp>

          <Card className="flex flex-col gap-3.5">
            <Field label="Meal name" value={name} onChangeText={setName} />
            <div className="flex flex-col gap-1.5">
              <Eyebrow>Meal</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {MEALS.map((m) => (
                  <Chip key={m} label={m[0]!.toUpperCase() + m.slice(1)} active={meal === m} onClick={() => setMeal(m)} />
                ))}
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <Display as="h3" className="text-[16px]">
                Items
              </Display>
              <button
                type="button"
                onClick={() => setItems((a) => [...a, { name: "New item", portion: "100 g", calories: 0, protein: 0, carbs: 0, sugar: 0, fat: 0, fiber: 0 }])}
                className="flex items-center gap-1 text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                <Pixel className="text-[10px]">Add item</Pixel>
              </button>
            </div>
            {items.map((it, i) => (
              <Card key={i} className="flex flex-col gap-2.5">
                <div className="flex items-end gap-2.5">
                  <Field label="Item" value={it.name} onChangeText={(t) => updateItem(i, { name: t })} />
                  <Field label="Portion" value={it.portion} onChangeText={(t) => updateItem(i, { portion: t })} containerClassName="max-w-[130px]" />
                  <IconButton onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))} aria-label="Remove item" className="h-12 w-12 shrink-0">
                    <Trash2 className="h-[18px] w-[18px]" />
                  </IconButton>
                </div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  <NumberField label="kcal" value={it.calories} onChange={(n) => updateItem(i, { calories: n ?? 0 })} />
                  <NumberField label="Protein" value={it.protein} onChange={(n) => updateItem(i, { protein: n ?? 0 })} suffix="g" />
                  <NumberField label="Carbs" value={it.carbs} onChange={(n) => updateItem(i, { carbs: n ?? 0 })} suffix="g" />
                  <NumberField label="Sugar" value={it.sugar} onChange={(n) => updateItem(i, { sugar: n ?? 0 })} suffix="g" />
                  <NumberField label="Fat" value={it.fat} onChange={(n) => updateItem(i, { fat: n ?? 0 })} suffix="g" />
                  <NumberField label="Fiber" value={it.fiber} onChange={(n) => updateItem(i, { fiber: n ?? 0 })} suffix="g" />
                </div>
              </Card>
            ))}
          </div>

          <Pill label={`Log ${sum("calories")} kcal`} size="lg" onClick={save} loading={create.isPending} disabled={items.length === 0} icon={<Check className="h-[18px] w-[18px]" />} />
        </>
      )}
    </div>
  );
}
