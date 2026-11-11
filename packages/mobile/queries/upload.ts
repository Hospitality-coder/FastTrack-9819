import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/api";

/** Presign → PUT bytes → return public URL. */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (input: { uri: string; contentType?: string }) => {
      const contentType = input.contentType ?? "image/jpeg";
      const ext = contentType.split("/")[1] ?? "jpg";
      const { url, publicUrl } = await client.upload.presign({ filename: `scan.${ext}`, contentType });
      const blob = await (await fetch(input.uri)).blob();
      const res = await fetch(url, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": contentType, "x-amz-acl": "public-read" },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      return publicUrl;
    },
  });
}
