import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Dumbbell, Plus } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Calendar, DayDetails, ExerciseSheet, Legend, EXERCISE_TYPES } from "../components/Calendar";
import { Card, FadeUp, IconButton, Muted, Pill, Pixel, SectionTitle, Spinner } from "../components/ui";
import { useUpcomingExercise } from "../queries/exercise";
import { prettyDate, today } from "../lib/dates";

export default function CalendarPage() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState(today());
  const [adding, setAdding] = useState(false);
  const upcoming = useUpcomingExercise(6);

  return (
    <div className="flex flex-col gap-5">
      <FadeUp>
        <PageHeader
          eyebrow="Your month"
          title="Calendar"
          right={
            <>
              <IconButton onClick={() => navigate("/")} aria-label="Back home">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </IconButton>
              <Pill label="Schedule" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)} />
            </>
          }
        />
      </FadeUp>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <FadeUp delay={0.08}>
          <Card glass className="flex flex-col gap-4">
            <Calendar selected={selected} onSelect={setSelected} />
            <Legend />
          </Card>
        </FadeUp>

        <FadeUp delay={0.16} className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <DayDetails date={selected} onAddExercise={() => setAdding(true)} />
          </Card>

          <Card className="flex flex-col gap-3">
            <SectionTitle title="Upcoming sessions" className="mb-0" />
            {upcoming.isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : upcoming.data && upcoming.data.length > 0 ? (
              <div className="flex flex-col gap-2">
                {upcoming.data.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelected(e.date)}
                    className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5 text-left transition hover:border-accent/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Dumbbell className="h-4 w-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-bold text-foreground">{e.title}</span>
                      <Pixel className="text-[9px] text-muted-foreground">
                        {prettyDate(e.date)}
                        {e.time ? ` · ${e.time}` : ""} · {EXERCISE_TYPES.find((x) => x.value === e.type)?.label ?? e.type} · {e.durationMin} min
                      </Pixel>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Muted className="text-[13px]">No sessions scheduled. Add one and it shows up here and on the grid.</Muted>
            )}
          </Card>
        </FadeUp>
      </div>

      <ExerciseSheet open={adding} onClose={() => setAdding(false)} date={selected} />
    </div>
  );
}
