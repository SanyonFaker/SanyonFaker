"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { useLenis } from "lenis/react";
import { ExifLine, ExifReadout } from "./exif-readout";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/types";

type LightboxProps = {
  photos: Photo[];
  /** Index into `photos`, or `null` when the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Shown in the top bar, e.g. the collection currently being browsed. */
  contextLabel?: string;
};

/**
 * Immersive full-screen viewer.
 *
 * Rendered through a portal so no ancestor `transform` (page-transition
 * wrappers, for instance) can capture its `position: fixed` containing block.
 *
 * Click targets are deliberate:
 *   · the photograph      → toggle the interface, for distraction-free viewing
 *   · anywhere around it  → close
 *   · ← / → / Esc / space → navigate, close, toggle
 */
export function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  contextLabel,
}: LightboxProps) {
  const reduceMotion = useReducedMotion();
  const lenis = useLenis();
  const isOpen = index !== null && index >= 0 && index < photos.length;

  const [chromeVisible, setChromeVisible] = useState(true);
  const [exifOpen, setExifOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState(1);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const photo = isOpen ? photos[index as number] : null;

  useEffect(() => setMounted(true), []);

  /* ------------------------------ navigation ----------------------------- */

  const goTo = useCallback(
    (next: number) => {
      if (photos.length === 0) return;
      // Wrap around: a gallery should never dead-end.
      const wrapped = (next + photos.length) % photos.length;
      setDirection(wrapped > (index ?? 0) ? 1 : -1);
      onIndexChange(wrapped);
    },
    [photos.length, index, onIndexChange],
  );

  const goNext = useCallback(() => goTo((index ?? 0) + 1), [goTo, index]);
  const goPrevious = useCallback(() => goTo((index ?? 0) - 1), [goTo, index]);

  /* --------------------------- keyboard control -------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        case "ArrowRight":
          event.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          goPrevious();
          break;
        case "i":
        case "I":
          setExifOpen((open) => !open);
          break;
        case " ":
          event.preventDefault();
          setChromeVisible((visible) => !visible);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, goNext, goPrevious]);

  /* ------------------ scroll locking while the viewer is open ------------------ */

  useEffect(() => {
    if (!isOpen) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;

    lenis?.stop();
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      lenis?.start();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
    };
  }, [isOpen, lenis]);

  /* ------------------------------- focus care ---------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 60);

    return () => {
      window.clearTimeout(timer);
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  /* -------------------------- neighbour preloading ----------------------- */

  useEffect(() => {
    if (!isOpen || index === null) return;

    for (const offset of [1, -1, 2]) {
      const neighbour = photos[(index + offset + photos.length) % photos.length];
      if (!neighbour) continue;
      const preload = new window.Image();
      preload.src = neighbour.src;
    }
  }, [isOpen, index, photos]);

  /* ---------------------- keep the filmstrip in view --------------------- */

  useEffect(() => {
    if (!isOpen || index === null || !chromeVisible) return;
    const strip = filmstripRef.current;
    if (!strip) return;

    const active = strip.querySelector<HTMLElement>(`[data-strip-index="${index}"]`);
    active?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [isOpen, index, chromeVisible, reduceMotion]);

  // Reset transient chrome each time the viewer opens.
  useEffect(() => {
    if (isOpen) {
      setChromeVisible(true);
      setExifOpen(false);
    }
  }, [isOpen]);

  if (!mounted) return null;

  const slide = reduceMotion ? 0 : 44;

  return createPortal(
    <AnimatePresence>
      {isOpen && photo ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${photo.title ?? "Photograph"} — image viewer`}
          className="fixed inset-0 z-[90] flex flex-col bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ------------------------------ Top bar ----------------------------- */}
          <AnimatePresence initial={false}>
            {chromeVisible ? (
              <motion.header
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-20 flex shrink-0 items-center justify-between px-5 py-4 md:px-8 md:py-5"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[11px] tracking-[0.14em] text-silver tnum">
                    {String((index ?? 0) + 1).padStart(2, "0")}
                    <span className="mx-1.5 text-ash">/</span>
                    {String(photos.length).padStart(2, "0")}
                  </span>
                  {contextLabel ? (
                    <span className="hidden text-[11px] uppercase tracking-[0.18em] text-mist sm:inline">
                      {contextLabel}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1">
                  <IconButton
                    label={exifOpen ? "Hide photograph details" : "Show photograph details"}
                    active={exifOpen}
                    onClick={() => setExifOpen((open) => !open)}
                    className="lg:hidden"
                  >
                    <Info size={16} strokeWidth={1.5} />
                  </IconButton>

                  <IconButton label="Previous photograph" onClick={goPrevious}>
                    <ChevronLeft size={18} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Next photograph" onClick={goNext}>
                    <ChevronRight size={18} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton ref={closeButtonRef} label="Close viewer" onClick={onClose}>
                    <X size={18} strokeWidth={1.5} />
                  </IconButton>
                </div>
              </motion.header>
            ) : null}
          </AnimatePresence>

          {/* ------------------------------- Stage ------------------------------ */}
          <div className="relative flex min-h-0 flex-1">
            {/* The photograph, cross-fading over its neighbour while sliding. */}
            <div className="relative z-10 min-h-0 min-w-0 flex-1">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={photo.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * slide, scale: reduceMotion ? 1 : 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction * -slide, scale: reduceMotion ? 1 : 0.985 }}
                  transition={{ duration: reduceMotion ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                  drag={reduceMotion ? false : "x"}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.14}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -70 || info.velocity.x < -420) goNext();
                    else if (info.offset.x > 70 || info.velocity.x > 420) goPrevious();
                  }}
                  onClick={(event) => {
                    // Only a click on the surround closes; the photograph itself
                    // is handled by the button inside.
                    if (event.target === event.currentTarget) onClose();
                  }}
                  className={cn(
                    "absolute inset-0 flex touch-pan-y items-center justify-center",
                    chromeVisible ? "p-4 pb-2 md:p-10" : "p-0",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setChromeVisible((visible) => !visible)}
                    className="flex h-full max-h-full w-full max-w-full cursor-zoom-out items-center justify-center focus:outline-none"
                    aria-label={chromeVisible ? "Hide interface" : "Show interface"}
                  >
                    <Image
                      key={photo.id}
                      src={photo.src}
                      alt={photo.title ?? photo.caption ?? "Photograph"}
                      width={photo.width}
                      height={photo.height}
                      sizes="100vw"
                      quality={90}
                      priority
                      placeholder={photo.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={photo.blurDataUrl ?? undefined}
                      className="pointer-events-none h-auto w-auto max-h-full max-w-full select-none object-contain"
                      draggable={false}
                    />
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* --------------------- EXIF, small screens ---------------------- */}
            <AnimatePresence initial={false}>
              {exifOpen ? (
                <motion.aside
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-0 bottom-0 z-30 max-h-[62vh] overflow-y-auto border-t border-line bg-ink/97 backdrop-blur-xl lg:hidden"
                  data-lenis-prevent
                >
                  <ExifReadout photo={photo} />
                </motion.aside>
              ) : null}
            </AnimatePresence>

            {/* --------------------- EXIF, desktop rail ---------------------- */}
            <aside
              className="relative z-20 hidden w-[300px] shrink-0 overflow-y-auto border-l border-hairline bg-ink/60 lg:block xl:w-[340px]"
              data-lenis-prevent
            >
              <ExifReadout photo={photo} />
            </aside>
          </div>

          {/* ----------------------------- Filmstrip ---------------------------- */}
          <AnimatePresence initial={false}>
            {chromeVisible && photos.length > 1 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-20 shrink-0 border-t border-hairline px-5 py-3 md:px-8 md:py-4"
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <ExifLine photo={photo} />
                  <p className="hidden shrink-0 text-[10px] uppercase tracking-[0.16em] text-ash sm:block">
                    ← → navigate · space hides ui · esc closes
                  </p>
                </div>

                <div
                  ref={filmstripRef}
                  className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  data-lenis-prevent
                >
                  {photos.map((item, itemIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      data-strip-index={itemIndex}
                      onClick={() => goTo(itemIndex)}
                      aria-label={`View ${item.title ?? "photograph"}`}
                      aria-current={itemIndex === index}
                      className={cn(
                        "relative h-12 w-16 shrink-0 overflow-hidden rounded-[3px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:h-14 md:w-20",
                        itemIndex === index
                          ? "opacity-100 ring-1 ring-brass"
                          : "opacity-40 hover:opacity-80",
                      )}
                    >
                      <Image
                        src={item.src}
                        alt=""
                        fill
                        sizes="80px"
                        quality={60}
                        className="object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */

function IconButton({
  ref,
  label,
  onClick,
  active,
  className,
  children,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300",
        active ? "bg-raised text-chalk" : "text-silver hover:bg-raised hover:text-chalk",
        className,
      )}
    >
      {children}
    </button>
  );
}
