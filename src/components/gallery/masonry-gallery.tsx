"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Images } from "lucide-react";
import { Lightbox } from "@/components/lightbox/lightbox";
import { PhotoTile } from "@/components/gallery/photo-tile";
import type { Photo } from "@/lib/types";

/**
 * The masonry wall plus the viewer it opens into.
 *
 * The wall is CSS multi-column (`columns-*` + `break-inside-avoid`) rather than
 * a JavaScript layout engine: it is genuinely irregular, it balances itself,
 * and it survives server rendering without a hydration flash. Because every
 * tile declares its aspect-ratio up front, column heights are correct before a
 * single image has decoded.
 */
export function MasonryGallery({
  photos,
  contextLabel,
  emptyTitle = "No photographs yet",
  emptyBody = "This collection is being edited. Please check back shortly.",
}: {
  photos: Photo[];
  contextLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleOpen = useCallback((index: number) => setOpenIndex(index), []);
  const handleClose = useCallback(() => setOpenIndex(null), []);

  if (photos.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4">
        {photos.map((photo, index) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            index={index}
            onOpen={handleOpen}
            priority={index < 2}
          />
        ))}
      </div>

      <Lightbox
        photos={photos}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={handleClose}
        contextLabel={contextLabel}
      />
    </>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-28 text-center"
    >
      <Images size={22} strokeWidth={1.25} className="text-ash" />
      <p className="mt-5 text-sm text-chalk">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-mist">{body}</p>
    </motion.div>
  );
}
