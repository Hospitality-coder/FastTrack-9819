import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/layout";
import { Card, Chip, Confirm, Empty, Eyebrow, FadeUp, Field, IconButton, Muted, NumberField, Pill, Pixel, SectionTitle, Sheet, Spinner } from "../components/ui";
import { useAddPhoto, useDeletePhoto, usePhotos } from "../queries/photos";
import { compressImage, useUploadImage } from "../queries/upload";
import { useWeightSummary } from "../queries/weight";
import { prettyDate, today } from "../lib/dates";
import { cn } from "../lib/utils";

type Photo = NonNullable<ReturnType<typeof usePhotos>["data"]>[number];
type Label = Photo["label"];

const LABELS: { value: Label; label: string; color: string }[] = [
  { value: "before", label: "Before", color: "var(--warning)" },
  { value: "progress", label: "Progress", color: "var(--water)" },
  { value: "after", label: "After", color: "var(--primary)" },
];

function labelMeta(l: Label) {
  return LABELS.find((x) => x.value === l) ?? LABELS[1]!;
}

export default function GalleryPage() {
  const [, navigate] = useLocation();
  const photos = usePhotos();
  const weight = useWeightSummary();
  const add = useAddPhoto();
  const del = useDeletePhoto();
  const upload = useUploadImage();

  const [filter, setFilter] = useState<Label | "all">("all");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState<Label>("progress");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [kg, setKg] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Photo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = photos.data ?? [];
  const visible = filter === "all" ? all : all.filter((p) => p.label === filter);
  const sorted = useMemo(() => [...visible].reverse(), [visible]); // newest first

  // Before/after pair: explicit labels when present, otherwise oldest + newest.
  const before = all.find((p) => p.label === "before") ?? all[0];
  const after = [...all].reverse().find((p) => p.label === "after") ?? (all.length > 1 ? all[all.length - 1] : undefined);
  const pair = before && after && before.id !== after.id ? { before, after } : null;
  const pairDelta = pair && pair.before.weightKg !== null && pair.after.weightKg !== null ? Math.round((pair.after.weightKg - pair.before.weightKg) * 10) / 10 : null;

  const openSheet = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setLabel(all.length === 0 ? "before" : "progress");
    setDate(today());
    setNote("");
    setKg(weight.data?.latest?.weightKg ?? null);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async () => {
    if (!file) return;
    const blob = await compressImage(file, 1400);
    const url = await upload.mutateAsync({ blob, kind: "gallery" });
    add.mutate({ date, url, label, note: note.trim() ? note.trim() : null, weightKg: kg }, { onSuccess: closeSheet });
  };

  const saving = upload.isPending || add.isPending;

  return (
    <div className="flex flex-col gap-5">
      <FadeUp>
        <PageHeader
          eyebrow="Progress gallery"
          title="Before & after"
          color="var(--accent)"
          right={
            <>
              <IconButton onClick={() => navigate("/")} aria-label="Back home">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </IconButton>
              <Pill label="Add photo" size="sm" icon={<ImagePlus className="h-4 w-4" />} onClick={() => inputRef.current?.click()} />
            </>
          }
        />
      </FadeUp>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Upload progress photo"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) openSheet(f);
        }}
      />

      {photos.isLoading ? (
        <Card className="flex items-center justify-center py-16">
          <Spinner />
        </Card>
      ) : all.length === 0 ? (
        <FadeUp delay={0.08}>
          <Card className="flex flex-col items-center gap-4 py-10">
            <Empty title="No photos yet" body="Add a “before” shot today. Future you will want to see it." art={<Camera className="h-10 w-10 text-accent" />} />
            <Pill label="Take the first photo" icon={<Camera className="h-4 w-4" />} onClick={() => inputRef.current?.click()} />
          </Card>
        </FadeUp>
      ) : (
        <>
          {pair && (
            <FadeUp delay={0.08}>
              <Card glass className="flex flex-col gap-4">
                <SectionTitle
                  title="Transformation"
                  className="mb-0"
                  action={
                    pairDelta !== null ? (
                      <Pixel className="text-[10px]" color={pairDelta <= 0 ? "var(--primary)" : "var(--warning)"}>
                        {pairDelta > 0 ? "+" : ""}
                        {pairDelta} kg
                      </Pixel>
                    ) : undefined
                  }
                />
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <CompareTile photo={pair.before} onClick={() => setViewing(pair.before)} />
                  <ArrowRight className="h-5 w-5 text-primary" />
                  <CompareTile photo={pair.after} onClick={() => setViewing(pair.after)} />
                </div>
              </Card>
            </FadeUp>
          )}

          <FadeUp delay={0.14} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip label={`All · ${all.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
              {LABELS.map((l) => {
                const n = all.filter((p) => p.label === l.value).length;
                return <Chip key={l.value} label={`${l.label} · ${n}`} active={filter === l.value} onClick={() => setFilter(l.value)} color={l.color} className={filter === l.value ? "text-primary-foreground" : ""} />;
              })}
            </div>

            {sorted.length === 0 ? (
              <Card>
                <Empty title="Nothing with that label" body="Switch the filter or add a new photo." />
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {sorted.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setViewing(p)}
                    className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-deeper text-left transition hover:border-primary/60"
                  >
                    <img src={p.url} alt={`${labelMeta(p.label).label}, ${prettyDate(p.date)}`} className="h-full w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
                    <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8">
                      <span className="flex items-center justify-between">
                        <Pixel className="text-[9px]" color={labelMeta(p.label).color}>
                          {labelMeta(p.label).label}
                        </Pixel>
                        {p.weightKg !== null && <span className="text-[12px] font-bold text-foreground">{p.weightKg.toFixed(1)} kg</span>}
                      </span>
                      <span className="text-[11px] font-semibold text-foreground/80">{prettyDate(p.date)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </FadeUp>
        </>
      )}

      {/* Upload sheet */}
      <Sheet open={open} onClose={closeSheet} title="Add progress photo" subtitle="Stored privately to your device profile.">
        <div className="flex flex-col gap-4">
          {preview && (
            <div className="mx-auto aspect-[3/4] w-[180px] overflow-hidden rounded-lg border border-border">
              <img src={preview} alt="Selected preview" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Label</Eyebrow>
            <div className="flex gap-1.5">
              {LABELS.map((l) => (
                <Chip key={l.value} label={l.label} active={label === l.value} onClick={() => setLabel(l.value)} color={l.color} className={label === l.value ? "text-primary-foreground" : ""} />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Field label="Date" type="date" value={date} onChangeText={setDate} max={today()} />
            <NumberField label="Weight" suffix="kg" value={kg} onChange={setKg} placeholder="optional" />
          </div>
          <Field label="Note" placeholder="e.g. Week 4, feeling lighter" value={note} onChangeText={setNote} maxLength={140} />
          <Pill label="Save to gallery" size="lg" onClick={submit} loading={saving} disabled={!file || saving} icon={<ImagePlus className="h-[18px] w-[18px]" />} />
          {(upload.isError || add.isError) && <Muted className="text-center text-destructive">Upload failed. Try a smaller photo.</Muted>}
        </div>
      </Sheet>

      {/* Viewer */}
      <Sheet open={viewing !== null} onClose={() => setViewing(null)} title={viewing ? labelMeta(viewing.label).label : ""} subtitle={viewing ? prettyDate(viewing.date) : undefined}>
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="max-h-[60vh] overflow-hidden rounded-lg border border-border bg-black">
              <img src={viewing.url} alt={`${labelMeta(viewing.label).label}, ${prettyDate(viewing.date)}`} className="mx-auto max-h-[60vh] w-auto object-contain" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                {viewing.weightKg !== null && <span className="font-display text-[20px] font-bold text-foreground">{viewing.weightKg.toFixed(1)} kg</span>}
                {viewing.note && <Muted>{viewing.note}</Muted>}
              </div>
              <Pill
                label="Delete"
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => {
                  setConfirmDelete(viewing);
                  setViewing(null);
                }}
              />
            </div>
          </div>
        )}
      </Sheet>

      <Confirm
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && del.mutate({ id: confirmDelete.id }, { onSuccess: () => setConfirmDelete(null) })}
        title="Delete this photo?"
        body="It will be removed from your gallery permanently."
        confirmLabel="Delete"
        danger
        loading={del.isPending}
      />
    </div>
  );
}

function CompareTile({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const meta = labelMeta(photo.label);
  return (
    <button type="button" onClick={onClick} className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-deeper">
      <img src={photo.url} alt={`${meta.label}, ${prettyDate(photo.date)}`} className="h-full w-full object-cover" />
      <span className={cn("absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary-foreground")} style={{ backgroundColor: meta.color }}>
        {meta.label}
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8">
        <span className="text-[11px] font-semibold text-foreground/80">{prettyDate(photo.date)}</span>
        {photo.weightKg !== null && <span className="text-[13px] font-bold text-foreground">{photo.weightKg.toFixed(1)} kg</span>}
      </span>
    </button>
  );
}

