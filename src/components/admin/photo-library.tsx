"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Search, Star, Trash2, X } from "lucide-react";

import { deletePhotoAction, updatePhotoAction } from "@/app/admin/actions";
import { describeDatabaseError, formatMonthYear } from "@/lib/utils";
import type { Collection, Exif, Photo } from "@/lib/types";
import {
  GhostButton,
  Label,
  Notice,
  PrimaryButton,
  Select,
  StatusPill,
  TextArea,
  TextInput,
  Toggle,
} from "./controls";

/**
 * The catalogue.
 *
 * Filtering happens in memory — a personal archive is small enough that a round
 * trip per keystroke would be pure latency. Edits go through Server Actions, so
 * the same Row Level Security policies guard the API regardless of surface.
 */
export function PhotoLibrary({
  photos,
  collections,
  canWrite,
  blockedReason,
}: {
  photos: Photo[];
  collections: Collection[];
  canWrite: boolean;
  blockedReason: string | null;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [editing, setEditing] = useState<Photo | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return photos.filter((photo) => {
      if (collectionFilter !== "all" && (photo.collection ?? "") !== collectionFilter) return false;
      if (!needle) return true;

      const haystack = [
        photo.title,
        photo.caption,
        photo.location,
        photo.fileName,
        photo.exif.camera,
        photo.exif.lens,
        photo.exif.focalLength,
        ...photo.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [photos, query, collectionFilter]);

  const remove = async (photo: Photo) => {
    setPendingId(photo.id);
    setError(null);

    const result = await deletePhotoAction(photo.id, photo.storagePath, photo.originalPath);

    setPendingId(null);
    setConfirmingId(null);

    if (!result.ok) {
      setError(describeDatabaseError(result.error));
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {!canWrite && blockedReason ? <Notice tone="warn">{blockedReason}</Notice> : null}
      {error ? <Notice tone="warn">{error}</Notice> : null}

      {/* -------------------------------- Toolbar ------------------------------ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles, places, cameras, tags…"
            className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-[13px] text-chalk outline-none transition-colors placeholder:text-mist focus:border-brass"
          />
        </div>

        <div className="w-[190px]">
          <Select value={collectionFilter} onChange={setCollectionFilter}>
            <option value="all">All collections</option>
            <option value="">Unsorted</option>
            {collections.map((collection) => (
              <option key={collection.slug} value={collection.slug}>
                {collection.title}
              </option>
            ))}
          </Select>
        </div>

        <p className="text-[11px] uppercase tracking-[0.16em] text-mist tnum">
          {visible.length} / {photos.length}
        </p>
      </div>

      {/* --------------------------------- Rows -------------------------------- */}
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-20 text-center">
          <p className="text-[13px] text-chalk">Nothing matches that filter.</p>
          <p className="mt-2 text-[12px] text-mist">
            {photos.length === 0
              ? "The archive is empty — publish your first photographs from the Upload tab."
              : "Try a different search term or collection."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-hairline)] overflow-hidden rounded-lg border border-hairline">
          {visible.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-col gap-4 bg-ink/40 p-3 transition-colors duration-200 hover:bg-ink/70 sm:flex-row sm:items-center"
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-surface">
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="96px"
                  quality={60}
                  placeholder={photo.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={photo.blurDataUrl ?? undefined}
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="truncate text-[13px] text-chalk">{photo.title ?? "Untitled"}</p>
                  {photo.featured ? (
                    <Star size={11} strokeWidth={1.75} className="shrink-0 text-brass" />
                  ) : null}
                </div>

                <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-mist">
                  <span className="text-silver">
                    {collections.find((item) => item.slug === photo.collection)?.title ?? "Unsorted"}
                  </span>
                  {photo.location ? (
                    <>
                      <span className="text-ash">·</span>
                      <span>{photo.location}</span>
                    </>
                  ) : null}
                  {formatMonthYear(photo.takenAt) ? (
                    <>
                      <span className="text-ash">·</span>
                      <span>{formatMonthYear(photo.takenAt)}</span>
                    </>
                  ) : null}
                </p>

                {photo.exif.focalLength || photo.exif.aperture ? (
                  <p className="mt-1.5 font-mono text-[11px] tracking-tight text-ash tnum">
                    {[
                      photo.exif.focalLength,
                      photo.exif.aperture,
                      photo.exif.shutter,
                      photo.exif.iso != null ? `ISO ${photo.exif.iso}` : null,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {confirmingId === photo.id ? (
                  <>
                    <StatusPill tone="error">Delete permanently?</StatusPill>
                    <GhostButton
                      danger
                      disabled={pendingId === photo.id}
                      onClick={() => remove(photo)}
                    >
                      {pendingId === photo.id ? "Deleting…" : "Confirm"}
                    </GhostButton>
                    <GhostButton onClick={() => setConfirmingId(null)}>Cancel</GhostButton>
                  </>
                ) : (
                  <>
                    <GhostButton
                      onClick={() => setEditing(photo)}
                      disabled={!canWrite}
                      title={canWrite ? "Edit metadata" : "Read-only in Demo Mode"}
                    >
                      <Pencil size={12} strokeWidth={1.5} />
                      Edit
                    </GhostButton>
                    <GhostButton
                      danger
                      onClick={() => setConfirmingId(photo.id)}
                      disabled={!canWrite}
                      title={canWrite ? "Delete photograph" : "Read-only in Demo Mode"}
                    >
                      <Trash2 size={12} strokeWidth={1.5} />
                    </GhostButton>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing ? (
          <PhotoEditor
            key={editing.id}
            photo={editing}
            collections={collections}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide-over editor                                                           */
/* -------------------------------------------------------------------------- */

function PhotoEditor({
  photo,
  collections,
  onClose,
  onSaved,
}: {
  photo: Photo;
  collections: Collection[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(photo.title ?? "");
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [location, setLocation] = useState(photo.location ?? "");
  const [collection, setCollection] = useState(photo.collection ?? "");
  const [tags, setTags] = useState(photo.tags.join(", "));
  const [featured, setFeatured] = useState(photo.featured);
  const [sortOrder, setSortOrder] = useState(String(photo.sortOrder ?? 0));
  const [takenAt, setTakenAt] = useState(toDateInput(photo.takenAt));

  const [exif, setExif] = useState<Exif>({ ...photo.exif });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setExifField = (key: keyof Exif, value: string) => {
    setExif((current) => {
      const next: Record<string, string | number | null> = { ...current };
      if (value.trim() === "") {
        delete next[key];
      } else if (key === "iso" || key === "focalLengthMm" || key === "focalLength35mm") {
        next[key] = Number(value) || 0;
      } else {
        next[key] = value;
      }
      return next as Exif;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);

    const result = await updatePhotoAction(photo.id, {
      title: title.trim() || null,
      caption: caption.trim() || null,
      location: location.trim() || null,
      collection_slug: collection || null,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      featured,
      sort_order: Number(sortOrder) || 0,
      taken_at: takenAt ? new Date(`${takenAt}T12:00:00Z`).toISOString() : null,
      exif,
    });

    setSaving(false);

    if (!result.ok) {
      setError(describeDatabaseError(result.error));
      return;
    }
    onSaved();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
      />

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 right-0 z-[85] flex w-full max-w-[560px] flex-col border-l border-line bg-ink"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${photo.title ?? "photograph"}`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <p className="text-micro text-mist">Edit photograph</p>
            <p className="mt-1.5 truncate text-[13px] text-chalk">{photo.title ?? "Untitled"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="rounded-full p-2 text-silver transition-colors hover:bg-raised hover:text-chalk"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="relative mb-6 aspect-[3/2] w-full overflow-hidden rounded bg-surface">
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="560px"
              quality={75}
              placeholder={photo.blurDataUrl ? "blur" : "empty"}
              blurDataURL={photo.blurDataUrl ?? undefined}
              className="object-cover"
            />
          </div>

          {error ? (
            <div className="mb-6">
              <Notice tone="warn">{error}</Notice>
            </div>
          ) : null}

          <div className="space-y-5">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <TextInput id="edit-title" value={title} onChange={setTitle} placeholder="Untitled" />
            </div>

            <div>
              <Label htmlFor="edit-caption">Caption</Label>
              <TextArea
                id="edit-caption"
                value={caption}
                onChange={setCaption}
                rows={4}
                placeholder="A sentence about how this frame came about."
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-collection">Collection</Label>
                <Select id="edit-collection" value={collection} onChange={setCollection}>
                  <option value="">Unsorted</option>
                  {collections.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.title}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-taken">Date taken</Label>
                <input
                  id="edit-taken"
                  type="date"
                  value={takenAt}
                  onChange={(event) => setTakenAt(event.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-chalk outline-none transition-colors focus:border-brass [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-location">Location</Label>
              <TextInput
                id="edit-location"
                value={location}
                onChange={setLocation}
                placeholder="City, Country"
              />
            </div>

            <div>
              <Label htmlFor="edit-tags" hint="comma separated">
                Tags
              </Label>
              <TextInput
                id="edit-tags"
                value={tags}
                onChange={setTags}
                placeholder="mountain, fog, dawn"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-sort" hint="lower first">
                  Sort order
                </Label>
                <TextInput
                  id="edit-sort"
                  value={sortOrder}
                  onChange={setSortOrder}
                  inputMode="numeric"
                />
              </div>

              <div className="flex items-end pb-2">
                <Toggle
                  id="edit-featured"
                  checked={featured}
                  onChange={setFeatured}
                  label="Feature on the homepage"
                />
              </div>
            </div>

            {/* ------------------------------ EXIF ----------------------------- */}
            <div className="border-t border-hairline pt-6">
              <p className="text-micro text-mist">Capture data</p>
              <p className="mt-2 text-[11px] leading-relaxed text-ash">
                Focal length is shown at the edge of the viewer. Enter a range such as{" "}
                <span className="font-mono text-silver">24-70mm</span> for a zoom, or a single value
                such as <span className="font-mono text-silver">35mm</span>.
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="exif-focal">Focal length</Label>
                  <TextInput
                    id="exif-focal"
                    value={exif.focalLength ?? ""}
                    onChange={(value) => setExifField("focalLength", value)}
                    placeholder="35mm"
                  />
                </div>
                <div>
                  <Label htmlFor="exif-aperture">Aperture</Label>
                  <TextInput
                    id="exif-aperture"
                    value={exif.aperture ?? ""}
                    onChange={(value) => setExifField("aperture", value)}
                    placeholder="f/1.8"
                  />
                </div>
                <div>
                  <Label htmlFor="exif-shutter">Shutter</Label>
                  <TextInput
                    id="exif-shutter"
                    value={exif.shutter ?? ""}
                    onChange={(value) => setExifField("shutter", value)}
                    placeholder="1/250s"
                  />
                </div>
                <div>
                  <Label htmlFor="exif-iso">ISO</Label>
                  <TextInput
                    id="exif-iso"
                    value={exif.iso != null ? String(exif.iso) : ""}
                    onChange={(value) => setExifField("iso", value)}
                    placeholder="100"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <Label htmlFor="exif-camera">Camera body</Label>
                  <TextInput
                    id="exif-camera"
                    value={exif.camera ?? ""}
                    onChange={(value) => setExifField("camera", value)}
                    placeholder="Sony α7R V"
                  />
                </div>
                <div>
                  <Label htmlFor="exif-lens">Lens</Label>
                  <TextInput
                    id="exif-lens"
                    value={exif.lens ?? ""}
                    onChange={(value) => setExifField("lens", value)}
                    placeholder="FE 24-70mm F2.8 GM II"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-hairline px-5 py-4">
          <p className="text-[11px] text-ash">
            {photo.fileName ?? "—"}
            {photo.width ? ` · ${photo.width}×${photo.height}` : ""}
          </p>
          <div className="flex items-center gap-2">
            <GhostButton onClick={onClose}>Cancel</GhostButton>
            <PrimaryButton onClick={save} pending={saving}>
              Save changes
            </PrimaryButton>
          </div>
        </footer>
      </motion.aside>
    </>
  );
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
