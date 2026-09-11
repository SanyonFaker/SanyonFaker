import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { MasonryGallery } from "@/components/gallery/masonry-gallery";
import { CollectionGridSkeleton, GallerySkeleton } from "@/components/gallery/photo-tile";
import { Reveal, RevealRule } from "@/components/ui/reveal";
import { getCollections, getPhotos, getSiteSettings, pickSettingsPhoto } from "@/lib/photos";

/** Gallery pages are regenerated on an interval rather than on every request. */
export const revalidate = 300;

/**
 * Each section resolves its own data behind its own Suspense boundary.
 *
 * That keeps the shell — and the statement copy — on screen immediately, and it
 * avoids the trap of a route-level `loading.tsx`, which flushes an HTTP 200
 * before the route has decided whether it exists.
 */
export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <HomeHero />
      </Suspense>

      {/* ------------------------------ Statement ----------------------------- */}
      <section className="mx-auto max-w-[1800px] px-6 py-24 md:px-10 md:py-36">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-3">
            <Reveal>
              <p className="text-micro text-mist">Statement</p>
            </Reveal>
          </div>

          <div className="md:col-span-8 md:col-start-5">
            <Reveal>
              <p className="text-[clamp(1.15rem,2.2vw,1.75rem)] font-light leading-[1.5] tracking-[-0.012em] text-chalk">
                I work slowly and in few places. Most of these frames come from standing in the same
                spot for an hour, waiting for the light to agree with what I had in mind.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <p className="mt-9 max-w-2xl text-[15px] leading-[1.8] text-silver">
                The archive is organised into five bodies of work — landscapes, event documentary,
                portraits, street and architecture. Every photograph carries its full capture data,
                because how a frame was made is part of what it means. Open any image to read it.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <Link
                href="/about"
                className="group mt-10 inline-flex items-center gap-2 text-[13px] text-chalk transition-colors duration-300 hover:text-brass"
              >
                About the studio
                <ArrowRight
                  size={14}
                  strokeWidth={1.5}
                  className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* -------------------------------- Index ------------------------------- */}
      <section id="index" className="mx-auto max-w-[1800px] px-6 pb-24 md:px-10 md:pb-32">
        <RevealRule />
        <Suspense fallback={<GallerySkeleton count={9} />}>
          <HomeIndex />
        </Suspense>
      </section>

      {/* ----------------------------- Collections ---------------------------- */}
      <section className="mx-auto max-w-[1800px] px-6 pb-28 md:px-10 md:pb-40">
        <RevealRule />
        <Suspense fallback={<CollectionGridSkeleton count={3} />}>
          <HomeCollections />
        </Suspense>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */

async function HomeHero() {
  const [photos, collections, settings] = await Promise.all([
    getPhotos(),
    getCollections(),
    getSiteSettings(),
  ]);

  // The studio can pin an explicit hero; otherwise the featured photograph
  // wins, then the newest.
  const heroPhoto = pickSettingsPhoto(photos, settings.heroPhotoId);
  const total = collections.reduce((sum, collection) => sum + collection.photoCount, 0);

  return (
    <Hero
      photo={heroPhoto}
      eyebrow="Enpei · Selected work 2019 — 2026"
      headline="Photography of land, people and the built world."
      meta={[
        `${String(total).padStart(2, "0")} photographs`,
        `${collections.length} collections`,
        "Available for commission",
      ]}
    />
  );
}

async function HomeIndex() {
  const photos = await getPhotos();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 py-8">
        <Reveal>
          <h2 className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-light tracking-[-0.02em] text-chalk">
            Index
          </h2>
        </Reveal>

        <Reveal delay={0.06}>
          <p className="text-label text-mist tnum">
            {String(photos.length).padStart(2, "0")} photographs
          </p>
        </Reveal>
      </div>

      <MasonryGallery photos={photos} contextLabel="Index" />
    </>
  );
}

async function HomeCollections() {
  const collections = await getCollections();

  if (collections.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6 py-8">
        <Reveal>
          <h2 className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-light tracking-[-0.02em] text-chalk">
            Collections
          </h2>
        </Reveal>
        <Reveal delay={0.06}>
          <p className="text-label text-mist tnum">
            {String(collections.length).padStart(2, "0")} bodies of work
          </p>
        </Reveal>
      </div>

      <div className="grid gap-x-4 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection, index) => (
          <Reveal key={collection.slug} delay={Math.min(index, 5) * 0.06}>
            <Link href={`/collections/${collection.slug}`} className="group block">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
                {collection.coverSrc ? (
                  <Image
                    src={collection.coverSrc}
                    alt={`${collection.title} — collection cover`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    quality={75}
                    placeholder={collection.coverBlurDataUrl ? "blur" : "empty"}
                    blurDataURL={collection.coverBlurDataUrl ?? undefined}
                    className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-raised to-ink" />
                )}

                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100"
                />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                  <div>
                    <p className="text-[15px] text-white">{collection.title}</p>
                    {collection.titleZh ? (
                      <p className="mt-1 text-[11px] tracking-[0.1em] text-white/55">
                        {collection.titleZh}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-mono text-[11px] text-white/70 tnum">
                    {String(collection.photoCount).padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-start justify-between gap-4">
                <p className="max-w-[38ch] text-[13px] leading-relaxed text-mist">
                  {collection.description}
                </p>
                <ArrowUpRight
                  size={15}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-ash transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brass"
                />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </>
  );
}

/** Occupies the hero's exact box so the swap to content causes no layout shift. */
function HeroSkeleton() {
  return (
    <div className="relative h-[86svh] min-h-[540px] w-full overflow-hidden bg-ink">
      <div className="absolute inset-0 bg-gradient-to-br from-surface via-ink to-void" />
      <div className="relative mx-auto flex h-full max-w-[1800px] flex-col justify-end px-6 pb-16 md:px-10 md:pb-20">
        <div className="shimmer h-3 w-44" />
        <div className="shimmer mt-6 h-12 w-full max-w-2xl" />
        <div className="shimmer mt-3 h-12 w-full max-w-xl" />
        <div className="shimmer mt-8 h-3 w-72" />
      </div>
    </div>
  );
}
