import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/api";

export function useProfile() {
  return useQuery(orpc.profile.get.queryOptions({ staleTime: 60_000 }));
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const key = orpc.profile.get.queryOptions().queryKey;
  return useMutation(
    orpc.profile.update.mutationOptions({
      onMutate: async (input) => {
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData(key);
        qc.setQueryData(key, (old) => (old ? { ...old, ...input } : old));
        return { prev };
      },
      onError: (_e, _i, ctx) => qc.setQueryData(key, ctx?.prev),
      onSettled: () => qc.invalidateQueries(),
    }),
  );
}

export function useResetData() {
  const qc = useQueryClient();
  return useMutation(orpc.profile.reset.mutationOptions({ onSuccess: () => qc.invalidateQueries() }));
}
