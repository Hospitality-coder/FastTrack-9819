import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { currentHour, today } from "../lib/dates";

export function useSuggestions() {
  return useQuery(
    orpc.suggestions.today.queryOptions({
      input: { date: today(), localHour: currentHour() },
      staleTime: 10 * 60_000,
      retry: 1,
    }),
  );
}

export function useRegenerateSuggestions() {
  const qc = useQueryClient();
  return useMutation(
    orpc.suggestions.regenerate.mutationOptions({
      onSuccess: (data) => {
        qc.setQueryData(
          orpc.suggestions.today.queryOptions({ input: { date: today(), localHour: currentHour() } }).queryKey,
          data,
        );
      },
    }),
  );
}
