import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useProfile, useUpdateProfile } from "../queries/profile";
import { compressImage, useUploadImage } from "../queries/upload";

/**
 * Circular profile selfie. Click to pick a new photo — it is downscaled,
 * uploaded to storage and saved to the profile.
 */
export function Avatar({ size = 56, editable = true, className }: { size?: number; editable?: boolean; className?: string }) {
  const profile = useProfile();
  const update = useUpdateProfile();
  const upload = useUploadImage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = upload.isPending || update.isPending;
  const url = profile.data?.avatarUrl;

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const blob = await compressImage(file, 512);
      const publicUrl = await upload.mutateAsync({ blob, kind: "avatar" });
      await update.mutateAsync({ avatarUrl: publicUrl });
    } catch {
      setError("Upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <button
        type="button"
        disabled={!editable || busy}
        onClick={() => inputRef.current?.click()}
        aria-label={url ? "Change profile photo" : "Add profile photo"}
        title={error ?? undefined}
        className={cn(
          "group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 bg-deeper transition",
          url ? "border-primary/60" : "border-dashed border-primary/40",
          editable && "hover:border-primary",
          error && "border-destructive",
        )}
      >
        {profile.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : url ? (
          <img src={url} alt="Your selfie" className="h-full w-full object-cover" />
        ) : (
          <img src="/images/ninja.png" alt="" className="h-[70%] w-[70%] object-contain opacity-80" />
        )}
        {editable && (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/55 text-primary transition",
              busy ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </span>
        )}
      </button>
      {editable && !url && !busy && (
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
          <Camera className="h-3 w-3" />
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Upload profile photo"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
