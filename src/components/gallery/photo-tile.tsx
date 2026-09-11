"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/types";

/**
 * One tile in the masonry wall.
 *
 * Load sequence, in order:
 *   1. A shimmer skeleton (or the photograph's dominant colour) holds the exact
 *      aspect-ratio box, so the column heights never reflow.
 *   2. On decode the photograph fades and un-blurs into place.
 *   3. Hover lifts it a hair — 1.02, never more.
 */
export function PhotoTile({
  photo,
  index,
  onOpen,
  priority = false,
}: {
  photo: Photo;
  index: number;
  onOpen: (index: number) => void;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  // The stored dimensions give the browser an aspect-ratio up front, which is
  // what keeps a CSS multi-column wall from rebalancing during load.
  const aspectRatio = `${photo.width} / ${photo.height}`;
  const label = photo.title ?? photo.caption ?? "Photograph";

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Open ${label} in the viewer`}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-4% 0px -6% 0px" }}
      transition={{
        duration: 0.75,
        delay: Math.min(index, 8) * 0.045,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ aspectRatio }}
      className={cn(
        "group relative mb-4 block w-full break-inside-avoid overflow-hidden bg-surface text-left",
        "focus-visible:outline-offset-4",
      )}
    >
      {/* 1 — skeleton / dominant colour */}
      <span
        aria-hidden
        className={cn("absolute inset-0 block", !loaded && "shimmer")}
        style={photo.dominantColor ? { backgroundColor: photo.dominantColor } : undefined}
      />

      {/* 2 — the photograph, blurred in */}
      <motion.span
        aria-hidden
        className="absolute inset-0 block"
        initial={false}
        animate={{
          opacity: loaded ? 1 : 0,
          filter: loaded ? "blur(0px)" : "blur(16px)",
        }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="absolute inset-0 block transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]">
          <Image
            src={photo.src}
            alt={label}
            fill
            sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            quality={75}
            priority={priority}
            placeholder={photo.blurDataUrl ? "blur" : "empty"}
            blurDataURL={photo.blurDataUrl ?? undefined}
            onLoad={() => setLoaded(true)}
            className="object-cover"
          />
        </span>
      </motion.span>

      {/* 3 — hover furniture: scrim, title, focal length */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-focus-visible:opacity-100"
      />

      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-between gap-4 p-4 opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-tight text-white">
            {photo.title ?? "Untitled"}
          </span>
          {photo.location ? (
            <span className="mt-1 block truncate text-[11px] text-white/60">{photo.location}</span>
          ) : null}
        </span>

        {photo.exif.focalLength ? (
          <span className="shrink-0 font-mono text-[11px] tracking-tight text-white/75 tnum">
            {photo.exif.focalLength}
          </span>
        ) : null}
      </span>
    </motion.button>
  );
}

/** A fixed sequence of ratios that reads as an irregular wall rather than a grid. */
const SKELETON_RATIOS = [
  "3 / 2",
  "2 / 3",
  "4 / 5",
  "16 / 9",
  "1 / 1",
  "3 / 2",
  "2 / 3",
  "5 / 4",
  "16 / 9",
  "3 / 4",
  "1 / 1",
  "4 / 3",
];

/**
 * Placeholder wall shown while the photographs resolve.
 *
 * Used as a Suspense fallback rather than a route-level `loading.tsx`: a segment
 * loading boundary flushes an HTTP 200 before the page has decided whether it
 * exists, which would turn an unknown collection URL into a soft 404.
 */
export function GallerySkeleton({ count = 9 }: { count?: number }) {
  return (
    <div
      className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4"
      aria-hidden
      role="presentation"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{ aspectRatio: SKELETON_RATIOS[index % SKELETON_RATIOS.length] }}
          className="shimmer mb-4 w-full break-inside-avoid"
        />
      ))}
    </div>
  );
}

/** Framed placeholder for the collection covers grid. */
export function CollectionGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-x-4 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <div className="shimmer aspect-[4/5] w-full" />
          <div className="shimmer mt-4 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
