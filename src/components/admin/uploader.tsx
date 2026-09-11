"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, CloudUpload, Trash2, X } from "lucide-react";

import { createPhotoAction } from "@/app/admin/actions";
import { ACCEPTED_IMAGE_TYPES, processPhotoFile, type ProcessedPhoto } from "@/lib/process-photo";
import { SUPABASE_BUCKET } from "@/lib/env";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatBytes, describeDatabaseError, shortId, slugifyFileName } from "@/lib/utils";
import type { Collection } from "@/lib/types";
import {
  GhostButton,
  Label,
  Notice,
  Panel,
  PrimaryButton,
  Select,
  StatusPill,
  TextInput,
} from "./controls";

type Phase = "reading" | "ready" | "uploading" | "saving" | "done" | "error";

type Draft = {
  id: string;
  file: File;
  phase: Phase;
  error: string | null;
  warnings: string[];
  title: string;
  previewUrl: string;
  processed: ProcessedPhoto | null;
};

const PHASE_LABEL: Record<Phase, string> = {
  reading: "Reading metadata",
  ready: "Ready",
  uploading: "Uploading",
  saving: "Saving record",
  done: "Published",
  error: "Failed",
};

const PHASE_TONE: Record<Phase, "idle" | "busy" | "done" | "error"> = {
  reading: "busy",
  ready: "idle",
  uploading: "busy",
  saving: "busy",
  done: "done",
  error: "error",
};

/**
 * Batch uploader.
 *
 * Files are read locally first — EXIF, dimensions, blur placeholder and a
 * web-sized derivative are all produced in the browser before anything is sent.
 * That keeps originals off the public render path and means the person
 * uploading sees exactly what will be published.
 */
export function Uploader({
  collections,
  canWrite,
  blockedReason,
}: {
  collections: Collection[];
  canWrite: boolean;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const [batchCollection, setBatchCollection] = useState(collections[0]?.slug ?? "");
  const [batchLocation, setBatchLocation] = useState("");
  const [batchTags, setBatchTags] = useState("");
  const [featured, setFeatured] = useState(false);

  /* ------------------------------- lifecycle ------------------------------ */

  const urlsRef = useRef<string[]>([]);

  useEffect(
    () => () => {
      // Revoke every object URL we handed to the DOM.
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
      urlsRef.current = [];
    },
    [],
  );

  const patch = useCallback((id: string, changes: Partial<Draft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...changes } : draft)),
    );
  }, []);

  /* -------------------------------- ingestion ----------------------------- */

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList).filter(isImageFile);
      if (incoming.length === 0) return;

      const created: Draft[] = incoming.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        urlsRef.current.push(previewUrl);
        return {
          id: shortId(),
          file,
          phase: "reading",
          error: null,
          warnings: [],
          title: prettifyFileName(file.name),
          previewUrl,
          processed: null,
        };
      });

      setDrafts((current) => [...current, ...created]);

      // Two at a time: enough parallelism to feel instant, low enough that a
      // hundred 40 MP files cannot exhaust memory.
      void runPool(created, 2, async (draft) => {
        try {
          const processed = await processPhotoFile(draft.file);
          patch(draft.id, {
            phase: "ready",
            processed,
            warnings: processed.warnings,
          });
        } catch (error) {
          patch(draft.id, { phase: "error", error: describe(error) });
        }
      });
    },
    [patch],
  );

  /* --------------------------------- upload ------------------------------- */

  const pending = useMemo(
    () => drafts.filter((draft) => draft.phase === "ready" || draft.phase === "error"),
    [drafts],
  );

  const totalBytes = useMemo(
    () => pending.reduce((sum, draft) => sum + draft.file.size, 0),
    [pending],
  );

  const completed = drafts.filter((draft) => draft.phase === "done").length;

  const upload = async () => {
    if (!canWrite || pending.length === 0) return;
    setBusy(true);

    const tags = batchTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const supabase = createBrowserSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setBusy(false);
      for (const draft of pending) {
        patch(draft.id, { phase: "error", error: "Your session expired. Please sign in again." });
      }
      return;
    }

    for (const draft of pending) {
      const processed = draft.processed;
      if (!processed) {
        patch(draft.id, { phase: "error", error: "Metadata analysis did not complete." });
        continue;
      }

      try {
        patch(draft.id, { phase: "uploading", error: null });

        const folder = batchCollection || "unsorted";
        const base = slugifyFileName(draft.file.name).replace(/\.[^.]+$/, "") || "photo";
        const stamp = shortId();

        // 1 — what the public site will actually serve.
        const derivative = processed.derivative;
        const displayBlob: Blob = derivative ?? draft.file;
        const displayType = derivative
          ? derivative.type || "image/webp"
          : draft.file.type || "image/jpeg";
        const displayPath = `${folder}/${base}-${stamp}.${
          derivative ? processed.derivativeExtension : extensionOf(draft.file.name)
        }`;

        const { error: displayError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(displayPath, displayBlob, {
            contentType: displayType,
            cacheControl: "31536000",
            upsert: false,
          });

        if (displayError) throw new Error(displayError.message);

        // 2 — the untouched original, kept for archival. Failure here is not
        //     fatal: the site works from the derivative alone.
        let originalPath: string | null = null;
        if (derivative) {
          const candidate = `originals/${folder}/${base}-${stamp}.${extensionOf(draft.file.name)}`;
          const { error: originalError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(candidate, draft.file, {
              contentType: draft.file.type || "application/octet-stream",
              cacheControl: "31536000",
              upsert: false,
            });
          if (!originalError) originalPath = candidate;
        }

        // 3 — the catalogue row.
        patch(draft.id, { phase: "saving" });

        const result = await createPhotoAction({
          storage_path: displayPath,
          original_path: originalPath,
          file_name: draft.file.name,
          width: processed.width || undefined,
          height: processed.height || undefined,
          blur_data_url: processed.blurDataUrl,
          dominant_color: processed.dominantColor,
          title: draft.title || null,
          location: batchLocation || null,
          collection_slug: batchCollection || null,
          tags,
          exif: processed.exif,
          featured,
          taken_at: processed.takenAt,
        });

        if (!result.ok) {
          // Roll the orphaned object back so storage does not drift.
          await supabase.storage.from(SUPABASE_BUCKET).remove([displayPath]);
          throw new Error(result.error);
        }

        patch(draft.id, { phase: "done", error: null });
      } catch (error) {
        patch(draft.id, { phase: "error", error: describe(error) });
      }
    }

    setBusy(false);
    router.refresh();
  };

  const remove = (id: string) => {
    setDrafts((current) => {
      const target = current.find((draft) => draft.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((draft) => draft.id !== id);
    });
  };

  const clearFinished = () => {
    setDrafts((current) => {
      for (const draft of current) {
        if (draft.phase === "done") URL.revokeObjectURL(draft.previewUrl);
      }
      return current.filter((draft) => draft.phase !== "done");
    });
  };

  /* ---------------------------------- view -------------------------------- */

  return (
    <div className="space-y-6">
      {!canWrite && blockedReason ? <Notice tone="warn">{blockedReason}</Notice> : null}

      {/* ------------------------------ Dropzone ------------------------------ */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (canWrite) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (canWrite) addFiles(event.dataTransfer.files);
        }}
        className={[
          "relative flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center transition-colors duration-300",
          dragging ? "border-brass bg-brass-dim/5" : "border-line bg-ink/40",
          canWrite ? "" : "opacity-60",
        ].join(" ")}
      >
        <CloudUpload
          size={22}
          strokeWidth={1.25}
          className={dragging ? "text-brass" : "text-ash"}
        />

        <p className="mt-5 text-[13px] text-chalk">
          Drop photographs here, or{" "}
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => inputRef.current?.click()}
            className="text-brass underline underline-offset-4 transition-opacity hover:opacity-80 disabled:no-underline disabled:opacity-50"
          >
            choose files
          </button>
        </p>

        <p className="mt-2 max-w-md text-[11px] leading-relaxed text-mist">
          JPEG, PNG, WebP, AVIF, TIFF and HEIC. EXIF is read locally, a blur placeholder is
          generated, and a web-sized derivative is produced automatically — the original is archived
          alongside it.
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES}
          disabled={!canWrite}
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
          className="sr-only"
        />
      </div>

      {/* ------------------------- Batch metadata ---------------------------- */}
      {drafts.length > 0 ? (
        <Panel
          title="Applied to this batch"
          subtitle="Set once, then fine-tune any photograph afterwards in the library."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="batch-collection">Collection</Label>
              <Select
                id="batch-collection"
                value={batchCollection}
                onChange={setBatchCollection}
                disabled={!canWrite}
              >
                <option value="">Unsorted</option>
                {collections.map((collection) => (
                  <option key={collection.slug} value={collection.slug}>
                    {collection.title}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="batch-location">Location</Label>
              <TextInput
                id="batch-location"
                value={batchLocation}
                onChange={setBatchLocation}
                placeholder="e.g. Lofoten, Norway"
                disabled={!canWrite}
              />
            </div>

            <div>
              <Label htmlFor="batch-tags" hint="comma separated">
                Tags
              </Label>
              <TextInput
                id="batch-tags"
                value={batchTags}
                onChange={setBatchTags}
                placeholder="mountain, fog, dawn"
                disabled={!canWrite}
              />
            </div>
          </div>

          <label className="mt-5 flex w-fit cursor-pointer select-none items-center gap-3 text-[12px] text-silver">
            <input
              type="checkbox"
              checked={featured}
              disabled={!canWrite}
              onChange={(event) => setFeatured(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-brass)]"
            />
            Feature these on the homepage hero
          </label>
        </Panel>
      ) : null}

      {/* ------------------------------ Queue -------------------------------- */}
      {drafts.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-mist">
              {drafts.length} in queue
              {completed > 0 ? ` · ${completed} published` : ""}
              {pending.length > 0 ? ` · ${formatBytes(totalBytes)} to send` : ""}
            </p>

            <div className="flex items-center gap-2">
              {completed > 0 ? (
                <GhostButton onClick={clearFinished}>Clear published</GhostButton>
              ) : null}
              <GhostButton onClick={() => setDrafts([])} disabled={busy}>
                Clear all
              </GhostButton>
              <PrimaryButton
                onClick={upload}
                pending={busy}
                disabled={!canWrite || pending.length === 0}
              >
                Publish {pending.length > 0 ? pending.length : ""}
              </PrimaryButton>
            </div>
          </div>

          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {drafts.map((draft) => (
                <DraftRow
                  key={draft.id}
                  draft={draft}
                  disabled={!canWrite || busy}
                  onTitleChange={(title) => patch(draft.id, { title })}
                  onRemove={() => remove(draft.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DraftRow({
  draft,
  disabled,
  onTitleChange,
  onRemove,
}: {
  draft: Draft;
  disabled: boolean;
  onTitleChange: (title: string) => void;
  onRemove: () => void;
}) {
  const { processed } = draft;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4 rounded-lg border border-hairline bg-ink/60 p-3 sm:flex-row sm:items-start"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-surface">
        {/* Blob preview — a plain img is correct here; the bytes are local. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={draft.previewUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={PHASE_TONE[draft.phase]}>
            {draft.phase === "done" ? <Check size={10} strokeWidth={2.5} /> : null}
            {PHASE_LABEL[draft.phase]}
          </StatusPill>

          <span className="truncate text-[11px] text-ash">{draft.file.name}</span>
          <span className="text-[11px] text-ash tnum">{formatBytes(draft.file.size)}</span>
          {processed && processed.width > 0 ? (
            <span className="font-mono text-[11px] text-ash tnum">
              {processed.width}×{processed.height}
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          <TextInput
            value={draft.title}
            onChange={onTitleChange}
            placeholder="Title"
            disabled={disabled || draft.phase === "done"}
          />
        </div>

        {processed ? <ExifSummary processed={processed} /> : null}

        {draft.error ? (
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-brass">
            <AlertTriangle size={12} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            {draft.error}
          </p>
        ) : null}

        {draft.warnings.map((warning) => (
          <p key={warning} className="mt-2 text-[11px] leading-relaxed text-mist">
            {warning}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled && draft.phase !== "error"}
        aria-label="Remove from queue"
        className="self-start rounded p-2 text-ash transition-colors duration-200 hover:text-brass disabled:opacity-40"
      >
        {draft.phase === "error" ? <X size={14} strokeWidth={1.5} /> : <Trash2 size={14} strokeWidth={1.5} />}
      </button>
    </motion.li>
  );
}

function ExifSummary({ processed }: { processed: ProcessedPhoto }) {
  const { exif } = processed;
  const parts = [
    exif.camera,
    exif.lens,
    exif.focalLength,
    exif.aperture,
    exif.shutter,
    exif.iso != null ? `ISO ${exif.iso}` : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return (
      <p className="mt-3 text-[11px] text-mist">
        No EXIF found in this file — you can enter the capture data by hand from the library.
      </p>
    );
  }

  return (
    <p className="mt-3 font-mono text-[11px] leading-relaxed tracking-tight text-mist tnum">
      {parts.join("  ·  ")}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|avif|gif|bmp|tiff?|heic|heif)$/i.test(file.name);
}

function extensionOf(name: string): string {
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "jpg";
}

/** `DSC_04821.NEF` → `Dsc 04821` */
function prettifyFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "Untitled";
  return base
    .split(/\s+/)
    .map((word) =>
      word.length > 3 && word === word.toUpperCase()
        ? word.charAt(0) + word.slice(1).toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function describe(error: unknown): string {
  const raw =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "string" && error
        ? error
        : "Something went wrong.";
  return describeDatabaseError(raw);
}
