"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { Photo } from "@/lib/types";

/**
 * Full-bleed opening frame.
 *
 * A single featured photograph, slowly settling from 1.06 to 1.0 — enough
 * movement to feel alive, not enough to distract. The type arrives underneath it
 * on a short stagger.
 */
export function Hero({
  photo,
  eyebrow,
  headline,
  meta,
}: {
  photo: Photo | null;
  eyebrow: string;
  headline: string;
  meta: string[];
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate h-[86svh] min-h-[540px] w-full overflow-hidden">
      {/* ---------------------------- Background ---------------------------- */}
      {photo ? (
        <>
          <motion.div
            className="absolute inset-0 -z-10"
            initial={{ scale: reduceMotion ? 1 : 1.07 }}
            animate={{ scale: 1 }}
            transition={{ duration: 14, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={photo.src}
              alt={photo.title ?? "Featured photograph"}
              fill
              sizes="100vw"
              quality={90}
              priority
              placeholder={photo.blurDataUrl ? "blur" : "empty"}
              blurDataURL={photo.blurDataUrl ?? undefined}
              className="object-cover"
            />
          </motion.div>

          {/* Two-axis scrim: keeps the masthead and the caption legible without
              flattening the photograph. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-void via-void/45 to-void/25"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-void via-void/70 to-transparent"
          />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-surface via-ink to-void"
        />
      )}

      {/* ------------------------------ Content ----------------------------- */}
      <div className="relative mx-auto flex h-full max-w-[1800px] flex-col justify-end px-6 pb-16 md:px-10 md:pb-20">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-micro text-brass"
        >
          {eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-[19ch] text-[clamp(2.1rem,6.2vw,4.6rem)] font-light leading-[1.04] tracking-[-0.028em] text-chalk"
        >
          {headline}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          {meta.map((item, index) => (
            <span key={item} className="flex items-center gap-5">
              {index > 0 ? <span className="h-3 w-px bg-line" aria-hidden /> : null}
              <span className="text-label text-silver">{item}</span>
            </span>
          ))}
        </motion.div>

        {photo?.exif.focalLength || photo?.exif.camera ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-6 font-mono text-[11px] tracking-tight text-mist tnum"
          >
            {[
              photo.exif.camera,
              photo.exif.lens,
              photo.exif.focalLength,
              photo.exif.aperture,
              photo.exif.shutter,
              photo.exif.iso != null ? `ISO ${photo.exif.iso}` : null,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </motion.p>
        ) : null}
      </div>

      {/* ---------------------------- Scroll cue ---------------------------- */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-16 right-6 hidden flex-col items-center gap-3 md:right-10 md:flex"
      >
        <span className="text-micro rotate-180 text-ash [writing-mode:vertical-rl]">Scroll</span>
        <span className="relative block h-16 w-px overflow-hidden bg-line">
          <motion.span
            className="absolute inset-x-0 top-0 block h-5 bg-brass"
            animate={reduceMotion ? { y: 0 } : { y: [-20, 64] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
