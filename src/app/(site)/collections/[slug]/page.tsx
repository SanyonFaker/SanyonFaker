import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MasonryGallery } from "@/components/gallery/masonry-gallery";
import { GallerySkeleton } from "@/components/gallery/photo-tile";
import { Reveal, RevealRule } from "@/components/ui/reveal";
import { getCollection, getCollections, getPhotos } from "@/lib/photos";

export const revalidate = 300;

/** Pre-render every collection; unknown slugs still resolve on demand. */
export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) return { title: "Collection not found" };

  return {
    title: collection.title,
    description:
      collection.description ??
      `${collection.title} — a collection of ${collection.photoCount} photographs.`,
    openGraph: {
      title: `${collection.title} — ENPEI`,
      description: collection.description ?? undefined,
      images: collection.coverSrc ? [collection.coverSrc] : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Resolved before anything streams, so an unknown slug yields a real 404
  // rather than a 200 with a "not found" body.
  const [collection, collections] = await Promise.all([getCollection(slug), getCollections()]);
  if (!collection) notFound();

  const currentIndex = collections.findIndex((item) => item.slug === slug);
  const previous = currentIndex > 0 ? collections[currentIndex - 1] : collections.at(-1);
  const next =
    currentIndex >= 0 && currentIndex < collections.length - 1
      ? collections[currentIndex + 1]
      : collections[0];

  return (
    <>
      {/* ------------------------------- Masthead ------------------------------ */}
      <header className="mx-auto max-w-[1800px] px-6 pb-14 pt-32 md:px-10 md:pb-20 md:pt-44">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <Reveal>
              <p className="text-micro text-brass">Collection</p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-5 text-[clamp(2.4rem,7vw,5.2rem)] font-light leading-[0.98] tracking-[-0.035em] text-chalk">
                {collection.title}
              </h1>
            </Reveal>

            {collection.titleZh ? (
              <Reveal delay={0.1}>
                <p className="mt-4 text-[15px] tracking-[0.14em] text-mist">{collection.titleZh}</p>
              </Reveal>
            ) : null}
          </div>

          <div className="md:col-span-5 md:pt-2">
            <Reveal delay={0.14}>
              <p className="max-w-md text-[15px] leading-[1.8] text-silver">
                {collection.description}
              </p>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.16em] text-ash tnum">
                {String(collection.photoCount).padStart(2, "0")} photographs
              </p>
            </Reveal>
          </div>
        </div>
      </header>

      {/* -------------------------------- Wall -------------------------------- */}
      <section className="mx-auto max-w-[1800px] px-6 pb-24 md:px-10 md:pb-32">
        <RevealRule />
        <div className="h-8" />
        <Suspense fallback={<GallerySkeleton count={9} />}>
          <CollectionWall slug={slug} title={collection.title} />
        </Suspense>
      </section>

      {/* ------------------------------ Pager -------------------------------- */}
      {collections.length > 1 ? (
        <nav
          className="mx-auto max-w-[1800px] px-6 pb-28 md:px-10 md:pb-40"
          aria-label="Collection navigation"
        >
          <RevealRule />
          <div className="grid gap-px pt-8 sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/collections/${previous.slug}`}
                className="group flex flex-col gap-2 py-6 sm:pr-10"
              >
                <span className="flex items-center gap-2 text-micro text-mist">
                  <ArrowLeft
                    size={12}
                    strokeWidth={1.5}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-1"
                  />
                  Previous
                </span>
                <span className="text-[clamp(1.3rem,2.6vw,1.9rem)] font-light tracking-[-0.02em] text-silver transition-colors duration-300 group-hover:text-chalk">
                  {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}

            {next && next.slug !== collection.slug ? (
              <Link
                href={`/collections/${next.slug}`}
                className="group flex flex-col gap-2 py-6 sm:items-end sm:border-l sm:border-hairline sm:pl-10"
              >
                <span className="flex items-center gap-2 text-micro text-mist">
                  Next
                  <ArrowRight
                    size={12}
                    strokeWidth={1.5}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                  />
                </span>
                <span className="text-[clamp(1.3rem,2.6vw,1.9rem)] font-light tracking-[-0.02em] text-silver transition-colors duration-300 group-hover:text-chalk">
                  {next.title}
                </span>
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}

/** Streams the wall in behind the header rather than blocking the whole route. */
async function CollectionWall({ slug, title }: { slug: string; title: string }) {
  const photos = await getPhotos({ collection: slug });

  return (
    <MasonryGallery
      photos={photos}
      contextLabel={title}
      emptyTitle={`${title} is empty`}
      emptyBody="Photographs will appear here as soon as they are added to this collection."
    />
  );
}
