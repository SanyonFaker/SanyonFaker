import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal, RevealRule } from "@/components/ui/reveal";
import { getPhotos } from "@/lib/photos";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description:
    "An independent photographer working across landscape, documentary and portrait commissions worldwide.",
};

const SERVICES = [
  {
    title: "Editorial & Commission",
    body: "Assigned features, brand campaigns and annual reports. Full-day and multi-day rates, worldwide.",
  },
  {
    title: "Events & Documentary",
    body: "Weddings, ceremonies, performances and conferences covered unobtrusively, delivered as a complete edit.",
  },
  {
    title: "Prints & Licensing",
    body: "Archival pigment prints on cotton rag, editioned and signed. Image licensing available on request.",
  },
];

const KIT = [
  "Sony α7R V · α7 IV · α7S III",
  "FE 16-35mm F2.8 GM · FE 24-70mm F2.8 GM II",
  "FE 35mm F1.4 GM · FE 85mm F1.4 GM II · FE 135mm F1.8 GM",
  "FE 70-200mm F2.8 GM OSS II",
  "Leica Q3 · Leica M11 Monochrom",
  "DJI Mavic 3 Pro",
];

export default async function AboutPage() {
  const photos = await getPhotos({ limit: 6 });
  const portrait = photos[0] ?? null;

  return (
    <>
      {/* -------------------------------- Header ------------------------------- */}
      <header className="mx-auto max-w-[1800px] px-6 pb-16 pt-32 md:px-10 md:pb-24 md:pt-44">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-6">
            <Reveal>
              <p className="text-micro text-brass">About</p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-5 text-[clamp(2.1rem,5.6vw,4.2rem)] font-light leading-[1.03] tracking-[-0.032em] text-chalk">
                An independent photographer, working slowly and on foot.
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="mt-10 space-y-6 text-[15px] leading-[1.85] text-silver">
                <p>
                  I started carrying a camera to remember places I had walked to. Fifteen years
                  later the reason is largely unchanged — the work is still an attempt to hold on
                  to a specific quality of light in a specific place, and to do it without
                  flattering the subject.
                </p>
                <p>
                  Most of the landscape work happens on multi-day trips with a small kit and no
                  assistant. The documentary and event work is the opposite: fast, close, and
                  entirely dependent on being unnoticed. Both are edited the same way — no
                  composites, no invented skies, colour graded by hand.
                </p>
                <p>
                  I am based in Shanghai and travel for commissions year-round. If you have a
                  project that needs photographs rather than pictures, I would like to hear about
                  it.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <a
                href="mailto:studio@example.com"
                className="group mt-11 inline-flex items-center gap-2 border-b border-line pb-2 text-[13px] text-chalk transition-colors duration-300 hover:border-brass hover:text-brass"
              >
                studio@example.com
                <ArrowUpRight
                  size={14}
                  strokeWidth={1.5}
                  className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
            </Reveal>
          </div>

          {portrait ? (
            <Reveal delay={0.1} className="md:col-span-5 md:col-start-8">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
                <Image
                  src={portrait.src}
                  alt={portrait.title ?? "Photograph from the archive"}
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  quality={75}
                  placeholder={portrait.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={portrait.blurDataUrl ?? undefined}
                  className="object-cover"
                />
              </div>
              {portrait.exif.camera ? (
                <p className="mt-4 font-mono text-[11px] tracking-tight text-ash tnum">
                  {[portrait.exif.camera, portrait.exif.lens, portrait.exif.focalLength]
                    .filter(Boolean)
                    .join("  ·  ")}
                </p>
              ) : null}
            </Reveal>
          ) : null}
        </div>
      </header>

      {/* -------------------------------- Services ----------------------------- */}
      <section className="mx-auto max-w-[1800px] px-6 pb-24 md:px-10 md:pb-32">
        <RevealRule />
        <div className="grid gap-x-6 gap-y-12 py-12 md:grid-cols-3">
          {SERVICES.map((service, index) => (
            <Reveal key={service.title} delay={index * 0.07}>
              <p className="font-mono text-[11px] text-ash tnum">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-5 text-lg font-normal tracking-[-0.01em] text-chalk">
                {service.title}
              </h2>
              <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-mist">{service.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------- Kit -------------------------------- */}
      <section className="mx-auto max-w-[1800px] px-6 pb-32 md:px-10 md:pb-44">
        <RevealRule />
        <div className="grid gap-10 py-12 md:grid-cols-12">
          <div className="md:col-span-3">
            <Reveal>
              <p className="text-micro text-mist">Equipment</p>
            </Reveal>
          </div>
          <div className="md:col-span-8 md:col-start-5">
            <ul className="space-y-4">
              {KIT.map((item, index) => (
                <Reveal key={item} delay={index * 0.04}>
                  <li className="flex items-baseline gap-5 border-b border-hairline pb-4 text-[14px] text-silver">
                    <span className="font-mono text-[10px] text-ash tnum">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item}
                  </li>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.2}>
              <Link
                href="/"
                className="group mt-10 inline-flex items-center gap-2 text-[13px] text-chalk transition-colors duration-300 hover:text-brass"
              >
                View the index
                <ArrowUpRight
                  size={14}
                  strokeWidth={1.5}
                  className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
