import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { isSupabaseConfigured } from "@/lib/env";
import { getCollections } from "@/lib/photos";

/** Public pages are regenerated on an interval, not on every request. */
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const collections = await getCollections();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[100] focus:rounded focus:bg-chalk focus:px-4 focus:py-2 focus:text-sm focus:text-void"
      >
        Skip to content
      </a>

      <SmoothScroll>
        <SiteHeader collections={collections} />

        <main id="main" className="relative">
          {children}
        </main>

        <SiteFooter collections={collections} />
      </SmoothScroll>

      {!isSupabaseConfigured ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-line bg-ink/90 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-mist backdrop-blur-md">
          Demo mode · sample imagery
        </div>
      ) : null}
    </>
  );
}
