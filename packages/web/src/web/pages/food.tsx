import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Camera, ChevronLeft, ChevronRight, Cookie, Moon, PencilLine, Sun, Trash2, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Card, Empty, Eyebrow, FadeUp, IconButton, Muted, Pill, Pixel, SectionTitle, Spinner } from "../components/ui";
import { MacroBar, WeekBars } from "../components/charts";
import { useDeleteFood, useFoodByDate, useFoodWeek } from "../queries/food";
import { addDays, prettyDate, today } from "../lib/dates";

const MEALS = [
  { key: "breakfast", label: "Breakfast", Icon: Sun },
  { key: "lunch", label: "Lunch", Icon: UtensilsCrossed },
  { key: "dinner", label: "Dinner", Icon: Moon },
  { key: "snack", label: "Snacks", Icon: Cookie },
] as const;

export default function FoodPage() {
  const [, navigate] = useLocation();
  const [date, setDate] = useState(today());
  const food = useFoodByDate(date);
  const week = useFoodWeek(7);
  const del = useDeleteFood(date);

  const totals = food.data?.totals;
  const targets = food.data?.targets;
  const remaining = (targets?.calories ?? 2000) - (totals?.calories ?? 0);
  const isToday = date >= today();

  return (
    <div className="flex flex-col gap-5">
      <FadeUp>
        <PageHeader
          eyebrow="Food log"
          title={prettyDate(date)}
          right={
            <>
              <IconButton onClick={() => setDate((d) => addDays(d, -1))} aria-label="Previous day">
                <ChevronLeft className="h-[18px] w-[18px]" />
              </IconButton>
              <IconButton onClick={() => setDate((d) => addDays(d, 1))} disabled={isToday} aria-label="Next day">
                <ChevronRight className="h-[18px] w-[18px]" />
              </IconButton>
            </>
          }
        />
      </FadeUp>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <FadeUp delay={0.08} className="flex flex-col gap-4">
          <Card glass className="flex flex-col gap-3.5">
            {food.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <Eyebrow>Eaten</Eyebrow>
                    <div className="flex items-end gap-1.5">
                      <span className="font-display text-[38px] font-bold leading-none text-foreground">{Math.round(totals?.calories ?? 0)}</span>
                      <Muted className="mb-1">/ {targets?.calories ?? 2000} kcal</Muted>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <Eyebrow>{remaining >= 0 ? "Left" : "Over"}</Eyebrow>
                    <Pixel className="text-[18px]" color={remaining >= 0 ? undefined : "var(--destructive)"}>
                      {Math.abs(Math.round(remaining))}
                    </Pixel>
                  </div>
                </div>
                <MacroBar label="Protein" value={totals?.protein ?? 0} target={targets?.protein ?? 120} />
                <MacroBar label="Carbs" value={totals?.carbs ?? 0} target={targets?.carbs ?? 200} color="var(--accent)" />
                <MacroBar label="Sugar" value={totals?.sugar ?? 0} target={targets?.sugar ?? 50} color="var(--warning)" overIsBad />
                <div className="flex gap-4">
                  <Muted>
                    Fat <span className="font-bold text-foreground">{Math.round(totals?.fat ?? 0)} g</span>
                  </Muted>
                  <Muted>
                    Fiber <span className="font-bold text-foreground">{Math.round(totals?.fiber ?? 0)} g</span>
                  </Muted>
                  <Muted>
                    Items <span className="font-bold text-foreground">{totals?.count ?? 0}</span>
                  </Muted>
                </div>
              </>
            )}
          </Card>
          <div className="flex gap-2.5">
            <Pill label="Scan meal" className="flex-1" onClick={() => navigate(`/scan?date=${date}`)} icon={<Camera className="h-[18px] w-[18px]" />} />
            <Pill label="Add manually" variant="ghost" className="flex-1" onClick={() => navigate(`/food/new?date=${date}`)} icon={<PencilLine className="h-[18px] w-[18px]" />} />
          </div>
        </FadeUp>

        <FadeUp delay={0.16}>
          <SectionTitle title="Last 7 days" action={<Muted>kcal vs target</Muted>} />
          <Card>
            {week.data ? (
              <WeekBars
                bars={week.data.map((d) => ({ date: d.date, value: Math.round(d.calories) }))}
                target={targets?.calories}
                overColor="var(--destructive)"
                format={(v) => (v ? String(v) : "")}
              />
            ) : (
              <div className="flex h-[150px] items-center justify-center">
                <Spinner />
              </div>
            )}
          </Card>
        </FadeUp>
      </div>

      <FadeUp delay={0.24} className="flex flex-col gap-4">
        {food.data && food.data.entries.length === 0 ? (
          <Card>
            <Empty title="Nothing logged yet" body="Snap a photo of your plate and the ninja chef will break it down — calories, sugar, protein, the lot." />
          </Card>
        ) : (
          MEALS.map((m) => {
            const entries = food.data?.entries.filter((e) => e.meal === m.key) ?? [];
            if (entries.length === 0) return null;
            const kcal = Math.round(entries.reduce((a, e) => a + e.calories, 0));
            return (
              <div key={m.key}>
                <SectionTitle title={m.label} action={<Muted className="font-bold">{kcal} kcal</Muted>} />
                <Card className="p-1.5">
                  {entries.map((e, i) => (
                    <div key={e.id} className={`flex items-center gap-3 p-2.5 ${i === 0 ? "" : "border-t border-border"}`}>
                      <Link to={`/food/${e.id}?date=${date}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition hover:bg-white/4">
                        {e.photoUrl ? (
                          <img src={e.photoUrl} alt="" className="h-[52px] w-[52px] shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md bg-secondary">
                            <m.Icon className="h-[22px] w-[22px] text-accent" />
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[14px] font-bold text-foreground">{e.name}</span>
                          <Muted className="truncate">
                            {e.portion ? `${e.portion} · ` : ""}P {Math.round(e.protein)} · C {Math.round(e.carbs)} · S {Math.round(e.sugar)} · F {Math.round(e.fat)}
                          </Muted>
                        </span>
                        <span className="font-display text-[15px] font-bold text-foreground">{Math.round(e.calories)}</span>
                      </Link>
                      <button type="button" onClick={() => del.mutate({ id: e.id })} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </Card>
              </div>
            );
          })
        )}
      </FadeUp>
    </div>
  );
}
