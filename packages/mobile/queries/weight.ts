import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/api";
import { today } from "@/lib/dates";

export function useWeightList(days = 90) {
  return useQuery(orpc.weight.list.queryOptions({ input: { today: today(), days } }));
}
export function useWeightSummary() {
  return useQuery(orpc.weight.summary.queryOptions({ input: { today: today() } }));
}
export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation(
    orpc.weight.create.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.weight.key() }) }),
  );
}
export function useDeleteWeight() {
  const qc = useQueryClient();
  return useMutation(
    orpc.weight.delete.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.weight.key() }) }),
  );
}
