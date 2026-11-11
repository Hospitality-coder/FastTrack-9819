import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/api";
import { today } from "@/lib/dates";

export function useFoodByDate(date: string) {
  return useQuery(orpc.food.byDate.queryOptions({ input: { date } }));
}

export function useFoodWeek(days = 7) {
  return useQuery(orpc.food.weekSummary.queryOptions({ input: { today: today(), days } }));
}

function useInvalidateFood() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.food.key() });
    qc.invalidateQueries({ queryKey: orpc.suggestions.key() });
  };
}

export function useAnalyzeFood() {
  return useMutation(orpc.food.analyze.mutationOptions());
}
export function useCreateFood() {
  const inv = useInvalidateFood();
  return useMutation(orpc.food.create.mutationOptions({ onSuccess: inv }));
}
export function useUpdateFood() {
  const inv = useInvalidateFood();
  return useMutation(orpc.food.update.mutationOptions({ onSuccess: inv }));
}

export function useDeleteFood(date: string) {
  const qc = useQueryClient();
  const key = orpc.food.byDate.queryOptions({ input: { date } }).queryKey;
  return useMutation(
    orpc.food.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData(key);
        qc.setQueryData(key, (old) => {
          if (!old) return old;
          const entries = old.entries.filter((e) => e.id !== id);
          const sum = (k: "calories" | "protein" | "carbs" | "sugar" | "fat" | "fiber") =>
            Math.round(entries.reduce((a, e) => a + e[k], 0));
          return {
            ...old,
            entries,
            totals: {
              count: entries.length,
              calories: sum("calories"),
              protein: sum("protein"),
              carbs: sum("carbs"),
              sugar: sum("sugar"),
              fat: sum("fat"),
              fiber: sum("fiber"),
            },
          };
        });
        return { prev };
      },
      onError: (_e, _i, ctx) => qc.setQueryData(key, ctx?.prev),
      onSettled: () => {
        qc.invalidateQueries({ queryKey: orpc.food.key() });
        qc.invalidateQueries({ queryKey: orpc.suggestions.key() });
      },
    }),
  );
}
