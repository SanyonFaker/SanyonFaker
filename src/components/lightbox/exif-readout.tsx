"use client";

import { motion } from "framer-motion";
import { formatMonthYear } from "@/lib/utils";
import { hasDisplayableExif } from "@/lib/exif";
import type { Photo } from "@/lib/types";

/**
 * The floating EXIF readout.
 *
 * Deliberately typographic rather than graphical: hairline rules, micro-caps
 * labels on the left, tabular monospace values on the right. Focal length leads
 * because that is the number photographers actually look for.
 */
export function ExifReadout({ photo, compact = false }: { photo: Photo; compact?: boolean }) {
  const { exif } = photo;
  const captured = formatMonthYear(photo.takenAt ?? exif.dateTaken);

  const capture: Array<[string, string | null | undefined]> = [
    ["Focal", exif.focalLength],
    ["Aperture", exif.aperture],
    ["Shutter", exif.shutter],
    ["ISO", exif.iso != null ? String(exif.iso) : null],
    ["Exposure", exif.exposureCompensation],
    ["White bal.", exif.whiteBalance],
  ];

  const equipment: Array<[string, string | null | undefined]> = [
    ["Body", exif.camera],
    ["Lens", exif.lens],
  ];

  const rows = compact
    ? capture.filter(([, value]) => value)
    : [...capture, ...equipment].filter(([, value]) => value);

  return (
    <div className="w-full">
      {/* Caption block */}
      <div className="px-5 pt-5 md:px-6 md:pt-6">
        <p className="text-[15px] leading-snug text-chalk">{photo.title ?? "Untitled"}</p>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mist">
          {photo.location ? <span>{photo.location}</span> : null}
          {photo.location && captured ? <span className="text-ash">·</span> : null}
          {captured ? <span>{captured}</span> : null}
        </p>

        {photo.caption ? (
          <p className="mt-4 text-[13px] leading-relaxed text-silver">{photo.caption}</p>
        ) : null}
      </div>

      {/* Metadata block */}
      {hasDisplayableExif(exif) && rows.length > 0 ? (
        <div className="mt-6 border-t border-hairline px-5 py-5 md:px-6">
          <p className="text-micro text-ash">Capture</p>
          <dl className="mt-3.5 space-y-2">
            {rows.map(([label, value], index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.12 + index * 0.035,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex items-baseline justify-between gap-6"
              >
                <dt className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-mist">
                  {label}
                </dt>
                <dd className="truncate text-right font-mono text-[12px] tracking-tight text-chalk tnum">
                  {value}
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      ) : null}

      {photo.tags.length > 0 ? (
        <div className="border-t border-hairline px-5 py-5 md:px-6">
          <p className="text-micro text-ash">Tags</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {photo.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-silver"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Single-line EXIF strip for the lightbox footer on narrow screens. */
export function ExifLine({ photo }: { photo: Photo }) {
  const parts = [
    photo.exif.focalLength,
    photo.exif.aperture,
    photo.exif.shutter,
    photo.exif.iso != null ? `ISO ${photo.exif.iso}` : null,
  ].filter((value): value is string => Boolean(value));

  if (parts.length === 0) return null;

  return (
    <p className="font-mono text-[11px] tracking-tight text-silver tnum">{parts.join("  ·  ")}</p>
  );
}
