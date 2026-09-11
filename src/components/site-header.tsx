"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/types";

/**
 * Fixed masthead.
 *
 * Transparent over the hero, then a hairline + blur once the page moves, so the
 * chrome never competes with the photograph underneath it.
 */
export function SiteHeader({ collections }: { collections: Collection[] }) {
  const pathname = usePathname();
  const [lifted, setLifted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation dismisses every open surface.
  useEffect(() => {
    setMenuOpen(false);
    setCollectionsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          lifted || menuOpen
            ? "border-b border-hairline bg-void/72 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between px-6 md:h-20 md:px-10">
          <Link
            href="/"
            className="group relative z-10 flex items-baseline gap-2"
            aria-label="LUMEN — home"
          >
            <span className="text-[13px] font-medium tracking-[0.42em] text-chalk transition-opacity duration-300 group-hover:opacity-70">
              LUMEN
            </span>
            <span className="hidden text-micro text-mist sm:inline">Studio</span>
          </Link>

          {/* ---------------------------- Desktop ---------------------------- */}
          <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
            <HeaderLink href="/" active={isActive("/")}>
              Index
            </HeaderLink>

            <div
              className="relative"
              onMouseEnter={() => setCollectionsOpen(true)}
              onMouseLeave={() => setCollectionsOpen(false)}
            >
              <button
                type="button"
                className={cn(
                  "group flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-300",
                  pathname.startsWith("/collections") ? "text-chalk" : "text-silver hover:text-chalk",
                )}
                aria-expanded={collectionsOpen}
                aria-haspopup="true"
                onClick={() => setCollectionsOpen((open) => !open)}
              >
                Collections
                <ChevronDown
                  size={12}
                  strokeWidth={1.5}
                  className={cn(
                    "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    collectionsOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {collectionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full w-64 pt-4"
                  >
                    <div className="overflow-hidden rounded-lg border border-line bg-ink/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
                      <CollectionLink href="/" label="All work" count={totalCount(collections)} />
                      {collections.map((collection) => (
                        <CollectionLink
                          key={collection.slug}
                          href={`/collections/${collection.slug}`}
                          label={collection.title}
                          meta={collection.titleZh}
                          count={collection.photoCount}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <HeaderLink href="/about" active={isActive("/about")}>
              About
            </HeaderLink>
          </nav>

          {/* ---------------------------- Mobile ----------------------------- */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="relative z-10 -mr-2 flex h-10 w-10 items-center justify-center md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="relative block h-3 w-6">
              <motion.span
                animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-x-0 top-0 block h-px bg-chalk"
              />
              <motion.span
                animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-x-0 bottom-0 block h-px bg-chalk"
              />
            </span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-void/97 backdrop-blur-2xl md:hidden"
          >
            <nav
              className="flex h-full flex-col justify-center gap-1 px-8 pb-24 pt-24"
              aria-label="Mobile"
            >
              <MobileLink href="/" index={0} active={isActive("/")}>
                Index
              </MobileLink>

              <div className="mt-8 pl-1 text-micro text-mist">Collections</div>
              {collections.map((collection, index) => (
                <MobileLink
                  key={collection.slug}
                  href={`/collections/${collection.slug}`}
                  index={index + 1}
                  active={isActive(`/collections/${collection.slug}`)}
                >
                  {collection.title}
                </MobileLink>
              ))}

              <div className="mt-8" />
              <MobileLink href="/about" index={collections.length + 1} active={isActive("/about")}>
                About
              </MobileLink>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function HeaderLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative text-[11px] uppercase tracking-[0.18em] transition-colors duration-300",
        active ? "text-chalk" : "text-silver hover:text-chalk",
      )}
    >
      {children}
      <span
        className={cn(
          "absolute -bottom-1.5 left-0 h-px w-full origin-left bg-brass transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
      />
    </Link>
  );
}

function CollectionLink({
  href,
  label,
  meta,
  count,
}: {
  href: string;
  label: string;
  meta?: string | null;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors duration-200 hover:bg-raised"
    >
      <span className="flex items-baseline gap-2.5">
        <span className="text-[13px] text-chalk">{label}</span>
        {meta ? <span className="text-[11px] text-mist">{meta}</span> : null}
      </span>
      <span className="text-micro text-ash tnum">{String(count).padStart(2, "0")}</span>
    </Link>
  );
}

function MobileLink({
  href,
  index,
  active,
  children,
}: {
  href: string;
  index: number;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.06 + index * 0.045, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className={cn(
          "block py-2 text-3xl font-light tracking-tight transition-colors duration-300",
          active ? "text-brass" : "text-chalk hover:text-silver",
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}

function totalCount(collections: Collection[]): number {
  return collections.reduce((sum, collection) => sum + collection.photoCount, 0);
}
