import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/api";
import { today, tzOffsetMin } from "@/lib/dates";

export function useActiveFast() {
  return useQuery(orpc.fasts.active.queryOptions({ refetchInterval: 60_000 }));
}

export function useFastStats() {
  return useQuery(orpc.fasts.stats.queryOptions({ input: { today: today(), tzOffsetMin: tzOffsetMin() } }));
}

export function useFastHistory(limit = 30) {
  return useQuery(orpc.fasts.history.queryOptions({ input: { limit } }));
}

function useInvalidateFasts() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.fasts.key() });
    qc.invalidateQueries({ queryKey: orpc.suggestions.key() });
  };
}

export function useStartFast() {
  const inv = useInvalidateFasts();
  return useMutation(orpc.fasts.start.mutationOptions({ onSuccess: inv }));
}
export function useEndFast() {
  const inv = useInvalidateFasts();
  return useMutation(orpc.fasts.end.mutationOptions({ onSuccess: inv }));
}
export function useExtendFast() {
  const inv = useInvalidateFasts();
  return useMutation(orpc.fasts.extend.mutationOptions({ onSuccess: inv }));
}
export function useEditFastStart() {
  const inv = useInvalidateFasts();
  return useMutation(orpc.fasts.editStart.mutationOptions({ onSuccess: inv }));
}
export function useDeleteFast() {
  const inv = useInvalidateFasts();
  return useMutation(orpc.fasts.delete.mutationOptions({ onSuccess: inv }));
}
