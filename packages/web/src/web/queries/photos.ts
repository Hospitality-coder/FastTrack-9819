import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

function useInvalidatePhotos() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: orpc.photos.key() });
    qc.invalidateQueries({ queryKey: orpc.calendar.key() });
  };
}

export function usePhotos() {
  return useQuery(orpc.photos.list.queryOptions({ staleTime: 30_000 }));
}

export function useAddPhoto() {
  const invalidate = useInvalidatePhotos();
  return useMutation(orpc.photos.create.mutationOptions({ onSuccess: invalidate }));
}

export function useUpdatePhoto() {
  const invalidate = useInvalidatePhotos();
  return useMutation(orpc.photos.update.mutationOptions({ onSuccess: invalidate }));
}

export function useDeletePhoto() {
  const invalidate = useInvalidatePhotos();
  return useMutation(orpc.photos.delete.mutationOptions({ onSuccess: invalidate }));
}
