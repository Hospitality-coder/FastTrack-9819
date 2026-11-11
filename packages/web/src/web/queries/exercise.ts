import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { today } from "../lib/dates";

function useInvalidateCalendar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.exercise.key() });
    qc.invalidateQueries({ queryKey: orpc.calendar.key() });
  };
}

export function useExerciseRange(from: string, to: string) {
  return useQuery(orpc.exercise.byRange.queryOptions({ input: { from, to } }));
}

export function useUpcomingExercise(limit = 4) {
  return useQuery(orpc.exercise.upcoming.queryOptions({ input: { today: today(), limit }, staleTime: 30_000 }));
}

export function useCreateExercise() {
  const invalidate = useInvalidateCalendar();
  return useMutation(orpc.exercise.create.mutationOptions({ onSuccess: invalidate }));
}

export function useUpdateExercise() {
  const invalidate = useInvalidateCalendar();
  return useMutation(orpc.exercise.update.mutationOptions({ onSuccess: invalidate }));
}

export function useToggleExercise() {
  const invalidate = useInvalidateCalendar();
  return useMutation(orpc.exercise.toggleComplete.mutationOptions({ onSuccess: invalidate }));
}

export function useDeleteExercise() {
  const invalidate = useInvalidateCalendar();
  return useMutation(orpc.exercise.delete.mutationOptions({ onSuccess: invalidate }));
}
