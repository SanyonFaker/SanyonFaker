"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Collection, Photo } from "@/lib/types";

/**
 * Pick one photograph out of the archive.
 *
 * Rendered as an overlay rather than a nested modal: the studio already uses
 * slide-overs for editing, and stacking two of them is a reliable way to lose
 * track of what is on top of what.
 */
export function PhotoPicker({
  open,
  title,
  photos,
  collections,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  photos: Photo[];
  collections: Collection[];
  selectedId: string | null;
  onSelect: (photoId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");

  // Reset the filters each time the picker reopens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setCollectionFilter("all");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return photos.filter((photo) => {
      if (collectionFilter !== "all" && (photo.collection ?? "") !== collectionFilter) return false;
      if (!needle) return true;

      return [photo.title, photo.location, photo.fileName, ...photo.tags]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [photos, query, collectionFilter]);

  const usedCollections = useMemo(
    () => collections.filter((item) => item.photoCount > 0),
    [collections],
  );

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[95] flex flex-col bg-void/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* --------------------------------- Head -------------------------------- */}
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-hairline px-5 py-4 md:px-8">
            <div className="min-w-0">
              <p className="text-micro text-mist">Choose a photograph</p>
              <p className="mt-1.5 truncate text-[13px] text-chalk">{title}</p>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="relative w-full max-w-xs">
                <Search
                  size={13}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search titles, places, tags…"
                  autoFocus
                  className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-[13px] text-chalk outline-none transition-colors placeholder:text-mist focus:border-brass"
                />
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close picker"
                className="rounded-full p-2 text-silver transition-colors hover:bg-raised hover:text-chalk"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </header>

          {/* -------------------------------- Filters ------------------------------- */}
          {usedCollections.length > 1 ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline px-5 py-3 md:px-8">
              <FilterChip
                active={collectionFilter === "all"}
                onClick={() => setCollectionFilter("all")}
              >
                All ({photos.length})
              </FilterChip>
              {usedCollections.map((item) => (
                <FilterChip
                  key={item.slug}
                  active={collectionFilter === item.slug}
                  onClick={() => setCollectionFilter(item.slug)}
                >
                  {item.title} ({item.photoCount})
                </FilterChip>
              ))}
            </div>
          ) : null}

          {/* --------------------------------- Grid --------------------------------- */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8">
            {visible.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-[13px] text-chalk">Nothing matches.</p>
                <p className="mt-2 text-[12px] text-mist">
                  {photos.length === 0
                    ? "The archive is empty — publish a photograph first."
                    : "Try a different search term."}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visible.map((photo) => {
                  const isSelected = photo.id === selectedId;

                  return (
                    <li key={photo.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(photo.id);
                          onClose();
                        }}
                        aria-pressed={isSelected}
                        className={cn(
                          "group relative block w-full overflow-hidden rounded-md bg-surface text-left transition-all duration-300",
                          isSelected ? "ring-2 ring-brass" : "hover:opacity-90",
                        )}
                        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                      >
                        <Image
                          src={photo.src}
                          alt={photo.title ?? "Photograph"}
                          fill
                          sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
                          quality={60}
                          placeholder={photo.blurDataUrl ? "blur" : "empty"}
                          blurDataURL={photo.blurDataUrl ?? undefined}
                          className="object-cover"
                        />

                        <span
                          aria-hidden
                          className={cn(
                            "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300",
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                          )}
                        />

                        <span className="absolute inset-x-0 bottom-0 truncate p-2.5 text-[11px] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          {photo.title ?? "Untitled"}
                        </span>

                        {isSelected ? (
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brass text-void">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* -------------------------------- Footer -------------------------------- */}
          <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-hairline px-5 py-3 md:px-8">
            <p className="text-[11px] text-ash tnum">
              {visible.length} of {photos.length}
            </p>

            {selectedId ? (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className="text-[11px] uppercase tracking-[0.14em] text-mist transition-colors hover:text-brass"
              >
                Clear selection
              </button>
            ) : null}
          </footer>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] transition-colors duration-200",
        active
          ? "border-brass-dim bg-brass-dim/15 text-brass"
          : "border-line text-mist hover:border-ash hover:text-chalk",
      )}
    >
      {children}
    </button>
  );
}
