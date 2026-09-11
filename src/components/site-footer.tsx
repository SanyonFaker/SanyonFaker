import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Collection } from "@/lib/types";

/** Editorial footer: contact, navigation, and a colophon in the site's own voice. */
export function SiteFooter({ collections }: { collections: Collection[] }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-hairline bg-void">
      <div className="mx-auto max-w-[1800px] px-6 pb-10 pt-16 md:px-10 md:pb-14 md:pt-24">
        <div className="grid gap-14 md:grid-cols-12">
          {/* Identity + contact */}
          <div className="md:col-span-5">
            <p className="text-[13px] font-medium tracking-[0.42em] text-chalk">ENPEI</p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-silver">
              Photography of land, people and the built world. Commissions, editorial and
              documentary work worldwide.
            </p>

            <a
              href="mailto:2211046629@qq.com"
              className="group mt-8 inline-flex items-center gap-2 text-sm text-chalk transition-colors duration-300 hover:text-brass"
            >
              2211046629@qq.com
              <ArrowUpRight
                size={14}
                strokeWidth={1.5}
                className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </div>

          {/* Collections */}
          <nav className="md:col-span-4" aria-label="Collections">
            <p className="text-micro text-mist">Collections</p>
            <ul className="mt-6 space-y-3">
              {collections.map((collection) => (
                <li key={collection.slug}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="group inline-flex items-baseline gap-3 text-sm text-silver transition-colors duration-300 hover:text-chalk"
                  >
                    <span>{collection.title}</span>
                    <span className="text-[11px] text-ash tnum">
                      {String(collection.photoCount).padStart(2, "0")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Elsewhere */}
          <div className="md:col-span-3">
            <p className="text-micro text-mist">Elsewhere</p>
            <ul className="mt-6 space-y-3">
              {[
                { label: "Instagram", href: "https://www.instagram.com/sanyoonlee/" },
                // Add more as you like — each entry renders a row here.
                // { label: "Behance", href: "https://behance.net/your-handle" },
                // { label: "小红书", href: "https://www.xiaohongshu.com/user/profile/..." },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-silver transition-colors duration-300 hover:text-chalk"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-hairline pt-8 text-[11px] text-ash sm:flex-row sm:items-center sm:justify-between md:mt-24">
          <p>© {year} ENPEI Studio. All photographs are protected works.</p>
          <p className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-brass-dim" />
            Built with Next.js, Supabase &amp; Framer Motion
          </p>
        </div>
      </div>
    </footer>
  );
}
