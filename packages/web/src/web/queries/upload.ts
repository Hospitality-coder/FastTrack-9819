import { useMutation } from "@tanstack/react-query";
import { client } from "../lib/api";

/** Downscale to max `maxWidth`px wide JPEG via canvas (falls back to the original file). */
export async function compressImage(file: File, maxWidth = 1024): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Presign → PUT bytes → return public URL. */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (input: { blob: Blob; contentType?: string; kind?: "food" | "avatar" | "gallery" }) => {
      const contentType = input.contentType ?? "image/jpeg";
      const ext = contentType.split("/")[1] ?? "jpg";
      const kind = input.kind ?? "food";
      const { url, publicUrl } = await client.upload.presign({ filename: `${kind}.${ext}`, contentType, kind });
      const res = await fetch(url, {
        method: "PUT",
        body: input.blob,
        headers: { "Content-Type": contentType, "x-amz-acl": "public-read" },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      return publicUrl;
    },
  });
}
