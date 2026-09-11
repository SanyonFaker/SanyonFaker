"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { deleteCollectionAction, saveCollectionAction } from "@/app/admin/actions";
import type { Collection } from "@/lib/types";
import {
  GhostButton,
  Label,
  Notice,
  Panel,
  PrimaryButton,
  StatusPill,
  TextArea,
  TextInput,
} from "./controls";

type Draft = {
  slug: string;
  title: string;
  titleZh: string;
  description: string;
  sortOrder: string;
};

const EMPTY: Draft = { slug: "", title: "", titleZh: "", description: "", sortOrder: "0" };

/**
 * Collection management.
 *
 * Slugs are the public URL segment, so they are treated as the identity of a
 * collection: renaming a title is free, renaming a slug moves the page.
 */
export function CollectionManager({
  collections,
  canWrite,
  blockedReason,
}: {
  collections: Collection[];
  canWrite: boolean;
  blockedReason: string | null;
}) {
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);

  const startCreate = () => {
    setError(null);
    setDraft({ ...EMPTY, sortOrder: String(collections.length + 1) });
  };

  const startEdit = (collection: Collection) => {
    setError(null);
    setDraft({
      slug: collection.slug,
      title: collection.title,
      titleZh: collection.titleZh ?? "",
      description: collection.description ?? "",
      sortOrder: String(collection.sortOrder ?? 0),
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);

    const result = await saveCollectionAction({
      slug: draft.slug.trim() || draft.title.trim(),
      title: draft.title.trim(),
      title_zh: draft.titleZh.trim() || null,
      description: draft.description.trim() || null,
      sort_order: Number(draft.sortOrder) || 0,
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(null);
    router.refresh();
  };

  const remove = async (slug: string) => {
    setError(null);
    const result = await deleteCollectionAction(slug);
    setConfirmSlug(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {!canWrite && blockedReason ? <Notice tone="warn">{blockedReason}</Notice> : null}
      {error ? <Notice tone="warn">{error}</Notice> : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-mist tnum">
          {collections.length} collections
        </p>
        <PrimaryButton onClick={startCreate} disabled={!canWrite}>
          <Plus size={13} strokeWidth={2} />
          New collection
        </PrimaryButton>
      </div>

      <AnimatePresence>
        {draft ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Panel
              title={collections.some((item) => item.slug === draft.slug) ? "Edit collection" : "New collection"}
              actions={
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  aria-label="Discard"
                  className="rounded-full p-1.5 text-ash transition-colors hover:text-chalk"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              }
            >
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-1">
                    <Label htmlFor="col-slug" hint="url segment">
                      Slug
                    </Label>
                    <TextInput
                      id="col-slug"
                      value={draft.slug}
                      onChange={(slug) => setDraft({ ...draft, slug })}
                      placeholder="landscapes"
                    />
                  </div>
                  <div>
                    <Label htmlFor="col-title">Title</Label>
                    <TextInput
                      id="col-title"
                      value={draft.title}
                      onChange={(title) => setDraft({ ...draft, title })}
                      placeholder="Landscapes"
                    />
                  </div>
                  <div>
                    <Label htmlFor="col-title-zh" hint="optional">
                      中文标题
                    </Label>
                    <TextInput
                      id="col-title-zh"
                      value={draft.titleZh}
                      onChange={(titleZh) => setDraft({ ...draft, titleZh })}
                      placeholder="风景"
                    />
                  </div>
                  <div>
                    <Label htmlFor="col-sort" hint="lower first">
                      Sort order
                    </Label>
                    <TextInput
                      id="col-sort"
                      value={draft.sortOrder}
                      onChange={(sortOrder) => setDraft({ ...draft, sortOrder })}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="col-description">Description</Label>
                  <TextArea
                    id="col-description"
                    value={draft.description}
                    onChange={(description) => setDraft({ ...draft, description })}
                    rows={3}
                    placeholder="A sentence describing this body of work."
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <GhostButton onClick={() => setDraft(null)}>Cancel</GhostButton>
                  <PrimaryButton
                    onClick={save}
                    pending={saving}
                    disabled={!draft.title.trim() && !draft.slug.trim()}
                  >
                    Save collection
                  </PrimaryButton>
                </div>
              </div>
            </Panel>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {collections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
          <p className="text-[13px] text-chalk">No collections yet.</p>
          <p className="mt-2 text-[12px] text-mist">
            Create one to group photographs — Landscapes, Events, Portraits, and so on.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-hairline)] overflow-hidden rounded-lg border border-hairline">
          {collections.map((collection) => (
            <li
              key={collection.slug}
              className="flex flex-col gap-4 bg-ink/40 p-4 transition-colors duration-200 hover:bg-ink/70 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="text-[13px] text-chalk">{collection.title}</p>
                  {collection.titleZh ? (
                    <span className="text-[12px] text-mist">{collection.titleZh}</span>
                  ) : null}
                  <span className="font-mono text-[11px] text-ash tnum">
                    /{collection.slug}
                  </span>
                </div>
                {collection.description ? (
                  <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-mist">
                    {collection.description}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <StatusPill tone="idle">{collection.photoCount} photos</StatusPill>

                {confirmSlug === collection.slug ? (
                  <>
                    <GhostButton danger onClick={() => remove(collection.slug)}>
                      Confirm
                    </GhostButton>
                    <GhostButton onClick={() => setConfirmSlug(null)}>Cancel</GhostButton>
                  </>
                ) : (
                  <>
                    <GhostButton onClick={() => startEdit(collection)} disabled={!canWrite}>
                      <Pencil size={12} strokeWidth={1.5} />
                      Edit
                    </GhostButton>
                    <GhostButton
                      danger
                      disabled={!canWrite}
                      onClick={() => setConfirmSlug(collection.slug)}
                      title="Photographs are kept and become unsorted"
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

      <Notice>
        Deleting a collection never deletes photographs — they fall back to{" "}
        <span className="text-silver">Unsorted</span> and can be reassigned at any time.
      </Notice>
    </div>
  );
}
