import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { tzOffsetMin } from "../lib/dates";

/** Per-day activity summary for an inclusive date range (max ~2 months). */
export function useCalendarRange(from: string, to: string) {
  return useQuery(
    orpc.calendar.range.queryOptions({
      input: { from, to, tzOffsetMin: tzOffsetMin() },
      staleTime: 15_000,
    }),
  );
}
