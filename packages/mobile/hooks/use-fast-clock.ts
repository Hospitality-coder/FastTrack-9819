import { useEffect, useState } from "react";

type Fast = { startAt: Date | string; plannedEndAt: Date | string; plannedHours: number } | null | undefined;

/** Ticks every second while a fast is active; returns derived timing values. */
export function useFastClock(fast: Fast) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!fast) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fast]);

  if (!fast) {
    return { active: false as const, elapsedMs: 0, remainingMs: 0, progress: 0, done: false, startAt: null, plannedEndAt: null };
  }
  const startAt = new Date(fast.startAt);
  const plannedEndAt = new Date(fast.plannedEndAt);
  const total = plannedEndAt.getTime() - startAt.getTime();
  const elapsedMs = Math.max(0, now - startAt.getTime());
  const remainingMs = plannedEndAt.getTime() - now;
  return {
    active: true as const,
    elapsedMs,
    remainingMs,
    progress: total > 0 ? Math.min(1, elapsedMs / total) : 0,
    done: remainingMs <= 0,
    startAt,
    plannedEndAt,
  };
}
