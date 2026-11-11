import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/api";
import { today } from "@/lib/dates";

export function useWaterToday(date = today()) {
  return useQuery(orpc.water.today.queryOptions({ input: { date } }));
}
export function useWaterHistory(days = 7) {
  return useQuery(orpc.water.history.queryOptions({ input: { today: today(), days } }));
}
export function useWaterReminders() {
  return useQuery(orpc.water.getReminders.queryOptions());
}

export function useAddWater(date = today()) {
  const qc = useQueryClient();
  const key = orpc.water.today.queryOptions({ input: { date } }).queryKey;
  return useMutation(
    orpc.water.add.mutationOptions({
      onMutate: async ({ amountMl }) => {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData(key);
        qc.setQueryData(key, (old) => (old ? { ...old, totalMl: Math.max(0, old.totalMl + amountMl) } : old));
        return { prev };
      },
      onError: (_e, _i, ctx) => qc.setQueryData(key, ctx?.prev),
      onSettled: () => qc.invalidateQueries({ queryKey: orpc.water.key() }),
    }),
  );
}

export function useDeleteWater() {
  const qc = useQueryClient();
  return useMutation(
    orpc.water.delete.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.water.key() }) }),
  );
}

export function useSetWaterReminders() {
  const qc = useQueryClient();
  const key = orpc.water.getReminders.queryOptions().queryKey;
  return useMutation(
    orpc.water.setReminders.mutationOptions({
      onMutate: async (input) => {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData(key);
        qc.setQueryData(key, (old) => (old ? { ...old, ...input } : old));
        return { prev };
      },
      onError: (_e, _i, ctx) => qc.setQueryData(key, ctx?.prev),
      onSettled: () => qc.invalidateQueries({ queryKey: key }),
    }),
  );
}
