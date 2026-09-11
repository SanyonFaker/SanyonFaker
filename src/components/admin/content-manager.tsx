"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ImageIcon, Plus, Trash2 } from "lucide-react";

import { saveSiteSettingsAction } from "@/app/admin/actions";
import { describeDatabaseError } from "@/lib/utils";
import type { Collection, Photo, SiteSettings } from "@/lib/types";
import { GhostButton, Label, Notice, Panel, PrimaryButton } from "./controls";
import { PhotoPicker } from "./photo-picker";

const MIGRATION_SQL = `-- Run once in Supabase -> SQL Editor
-- (the full file also lives at supabase/add-site-settings.sql)`;

/**
 * Site content the studio can edit: the two featured images and the equipment
 * list. Everything else on the public pages is derived from the archive.
 */
export function ContentManager({
  settings,
  photos,
  collections,
  canWrite,
  blockedReason,
  tableReady,
}: {
  settings: SiteSettings;
  photos: Photo[];
  collections: Collection[];
  canWrite: boolean;
  blockedReason: string | null;
  tableReady: boolean;
}) {
  const router = useRouter();

  const [heroId, setHeroId] = useState<string | null>(settings.heroPhotoId);
  const [statementId, setStatementId] = useState<string | null>(settings.statementPhotoId);
  const [equipment, setEquipment] = useState<string[]>(
    settings.equipment.length > 0 ? settings.equipment : [""],
  );

  const [picker, setPicker] = useState<"hero" | "statement" | null>(null);
  const [photoBusy, setPhotoBusy] = useState<"hero" | "statement" | null>(null);
  const [savingList, setSavingList] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(photos.map((photo) => [photo.id, photo])), [photos]);
  const automatic = useMemo(
    () => photos.find((photo) => photo.featured) ?? photos[0] ?? null,
    [photos],
  );

  const heroPreview = (heroId ? byId.get(heroId) : null) ?? automatic;
  const statementPreview = (statementId ? byId.get(statementId) : null) ?? automatic;

  const listDirty =
    equipment.map((line) => line.trim()).filter(Boolean).join("\n") !==
    settings.equipment.join("\n");

  /* ------------------------------ photo choices ----------------------------- */

  const choosePhoto = async (slot: "hero" | "statement", photoId: string | null) => {
    if (!canWrite) return;

    const previous = slot === "hero" ? heroId : statementId;
    // Optimistic: the picker already closed, so reflect the choice immediately.
    if (slot === "hero") setHeroId(photoId);
    else setStatementId(photoId);

    setPhotoBusy(slot);
    setError(null);

    const result = await saveSiteSettingsAction(
      slot === "hero" ? { hero_photo_id: photoId } : { statement_photo_id: photoId },
    );

    setPhotoBusy(null);

    if (!result.ok) {
      if (slot === "hero") setHeroId(previous);
      else setStatementId(previous);
      setError(describeDatabaseError(result.error));
      return;
    }

    setSavedAt(Date.now());
    router.refresh();
  };

  /* -------------------------------- equipment ------------------------------- */

  const setLine = (index: number, value: string) => {
    setEquipment((current) => current.map((line, i) => (i === index ? value : line)));
  };

  const moveLine = (index: number, direction: -1 | 1) => {
    setEquipment((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeLine = (index: number) => {
    setEquipment((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  const saveEquipment = async () => {
    setSavingList(true);
    setError(null);

    const result = await saveSiteSettingsAction({
      equipment: equipment.map((line) => line.trim()).filter(Boolean),
    });

    setSavingList(false);

    if (!result.ok) {
      setError(describeDatabaseError(result.error));
      return;
    }

    setSavedAt(Date.now());
    router.refresh();
  };

  /* ---------------------------------- view ---------------------------------- */

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-2.5">
        <ImageIcon size={15} strokeWidth={1.5} className="text-brass" />
        <h1 className="text-[15px] text-chalk">Site content</h1>
      </header>

      {!tableReady ? (
        <Notice tone="warn">
          The <code className="font-mono">site_settings</code> table does not exist yet, so these
          controls cannot be saved. Run{" "}
          <span className="text-chalk">supabase/add-site-settings.sql</span> in the Supabase SQL
          Editor, then reload this page. Until then the public pages fall back to sensible
          defaults.
        </Notice>
      ) : null}

      {!canWrite && blockedReason ? <Notice tone="warn">{blockedReason}</Notice> : null}
      {error ? <Notice tone="warn">{error}</Notice> : null}

      <AnimatePresence>
        {savedAt && !error ? (
          <motion.p
            key={savedAt}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-brass"
          >
            <Check size={12} strokeWidth={2.5} />
            Saved — the public pages update within a few seconds
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* ------------------------------ Photo slots ----------------------------- */}
      <div className="grid gap-6 md:grid-cols-2">
        <PhotoSlot
          title="Homepage hero"
          description="The full-bleed image at the top of the homepage. Leave it automatic to use the photograph marked as featured."
          preview={heroPreview}
          explicit={Boolean(heroId && byId.has(heroId))}
          busy={photoBusy === "hero"}
          disabled={!canWrite || !tableReady}
          onChoose={() => setPicker("hero")}
          onClear={() => choosePhoto("hero", null)}
        />

        <PhotoSlot
          title="Statement photo"
          description="The portrait beside the statement text on the About page. Leave it automatic to use the featured photograph."
          preview={statementPreview}
          explicit={Boolean(statementId && byId.has(statementId))}
          busy={photoBusy === "statement"}
          disabled={!canWrite || !tableReady}
          onChoose={() => setPicker("statement")}
          onClear={() => choosePhoto("statement", null)}
        />
      </div>

      {/* -------------------------------- Equipment ----------------------------- */}
      <Panel
        title="Equipment"
        subtitle="Shown as a numbered list on the About page. One line per entry — put related bodies or lenses on the same line, separated by a middle dot."
        actions={
          <div className="flex items-center gap-2">
            <GhostButton
              onClick={() => setEquipment((current) => [...current, ""])}
              disabled={!canWrite || !tableReady || equipment.length >= 24}
            >
              <Plus size={12} strokeWidth={2} />
              Add line
            </GhostButton>
            <PrimaryButton
              onClick={saveEquipment}
              pending={savingList}
              disabled={!canWrite || !tableReady || !listDirty}
            >
              Save list
            </PrimaryButton>
          </div>
        }
      >
        <ul className="space-y-2">
          {equipment.map((line, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-6 shrink-0 font-mono text-[11px] text-ash tnum">
                {String(index + 1).padStart(2, "0")}
              </span>

              <input
                value={line}
                onChange={(event) => setLine(index, event.target.value)}
                placeholder={
                  index === 0 ? "Sony α7R V · α7 IV" : "FE 24-70mm F2.8 GM II"
                }
                disabled={!canWrite || !tableReady}
                className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-chalk outline-none transition-colors placeholder:text-mist focus:border-brass disabled:opacity-50"
              />

              <IconAction
                label="Move up"
                onClick={() => moveLine(index, -1)}
                disabled={!canWrite || !tableReady || index === 0}
              >
                <ArrowUp size={13} strokeWidth={1.75} />
              </IconAction>
              <IconAction
                label="Move down"
                onClick={() => moveLine(index, 1)}
                disabled={!canWrite || !tableReady || index === equipment.length - 1}
              >
                <ArrowDown size={13} strokeWidth={1.75} />
              </IconAction>
              <IconAction
                label="Remove line"
                onClick={() => removeLine(index)}
                disabled={!canWrite || !tableReady}
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </IconAction>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] leading-relaxed text-mist">
          {listDirty
            ? "You have unsaved changes."
            : "An empty list falls back to the default equipment shown on a fresh install."}
        </p>
      </Panel>

      <Notice>{MIGRATION_SQL}</Notice>

      <PhotoPicker
        open={picker !== null}
        title={picker === "hero" ? "Homepage hero" : "Statement photo"}
        photos={photos}
        collections={collections}
        selectedId={picker === "hero" ? heroId : statementId}
        onSelect={(photoId) => {
          if (picker) void choosePhoto(picker, photoId);
        }}
        onClose={() => setPicker(null)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PhotoSlot({
  title,
  description,
  preview,
  explicit,
  busy,
  disabled,
  onChoose,
  onClear,
}: {
  title: string;
  description: string;
  preview: Photo | null;
  explicit: boolean;
  busy: boolean;
  disabled: boolean;
  onChoose: () => void;
  onClear: () => void;
}) {
  return (
    <Panel title={title}>
      <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-md bg-surface">
        {preview ? (
          <Image
            src={preview.src}
            alt=""
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            quality={60}
            placeholder={preview.blurDataUrl ? "blur" : "empty"}
            blurDataURL={preview.blurDataUrl ?? undefined}
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-raised to-ink">
            <ImageIcon size={18} strokeWidth={1.25} className="text-ash" />
          </div>
        )}

        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-void/60 backdrop-blur-sm">
            <span className="text-[10px] uppercase tracking-[0.16em] text-chalk">Saving…</span>
          </div>
        ) : null}

        <span className="absolute left-3 top-3 rounded-full border border-line bg-void/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-mist backdrop-blur">
          {explicit ? <span className="text-brass">Chosen</span> : "Automatic"}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-mist">{description}</p>

      {preview ? (
        <p className="mt-2 truncate text-[11px] text-ash">
          {preview.title ?? preview.fileName ?? "Untitled"}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <PrimaryButton onClick={onChoose} disabled={disabled}>
          Choose photo
        </PrimaryButton>
        {explicit ? (
          <GhostButton onClick={onClear} disabled={disabled}>
            Use automatic
          </GhostButton>
        ) : null}
      </div>
    </Panel>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="shrink-0 rounded-md border border-line p-2 text-mist transition-colors duration-200 hover:border-ash hover:text-chalk disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
