"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, FolderOpen, Images, LogOut, Star, UploadCloud } from "lucide-react";

import { signOutAction } from "@/app/admin/actions";
import { CollectionManager } from "./collection-manager";
import { ContentManager } from "./content-manager";
import { PermissionBanner, type PermissionIssue } from "./permission-banner";
import { PhotoLibrary } from "./photo-library";
import { Uploader } from "./uploader";
import { formatMonthYear } from "@/lib/utils";
import type { Collection, Photo, SiteSettings } from "@/lib/types";

type Tab = "library" | "upload" | "collections" | "content";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "library", label: "Library" },
  { id: "upload", label: "Upload" },
  { id: "collections", label: "Collections" },
  { id: "content", label: "Content" },
];

/**
 * Studio dashboard.
 *
 * One client boundary, four panes. All writes are Server Actions; all reads
 * arrive already resolved from the Server Component that rendered this tree.
 */
export function AdminDashboard({
  email,
  mode,
  photos,
  collections,
  settings,
  settingsReady,
  canWrite,
  blockedReason,
  permissionIssue,
}: {
  email: string;
  mode: "supabase" | "demo";
  photos: Photo[];
  collections: Collection[];
  /** Editable site content: hero image, statement image, equipment list. */
  settings: SiteSettings;
  /** False until `supabase/add-site-settings.sql` has been applied. */
  settingsReady: boolean;
  canWrite: boolean;
  blockedReason: string | null;
  /** Set when the database's own allow-list rejects this account. */
  permissionIssue?: PermissionIssue | null;
}) {
  const [tab, setTab] = useState<Tab>("library");

  const stats = useMemo(() => {
    const featured = photos.filter((photo) => photo.featured).length;
    const unsorted = photos.filter((photo) => !photo.collection).length;

    const latest = photos
      .map((photo) => photo.takenAt ?? photo.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1);

    return [
      { label: "Photographs", value: String(photos.length).padStart(2, "0"), icon: Images },
      { label: "Collections", value: String(collections.length).padStart(2, "0"), icon: FolderOpen },
      { label: "Featured", value: String(featured).padStart(2, "0"), icon: Star },
      { label: "Latest capture", value: formatMonthYear(latest ?? null) ?? "—", icon: null },
      { label: "Unsorted", value: String(unsorted).padStart(2, "0"), icon: null },
    ];
  }, [photos, collections]);

  return (
    <div className="min-h-dvh">
      {/* --------------------------------- Chrome -------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-void/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-5">
            <Link href="/admin/dashboard" className="flex items-baseline gap-2">
              <span className="text-[12px] font-medium tracking-[0.4em] text-chalk">ENPEI</span>
              <span className="text-micro text-mist">Studio</span>
            </Link>

            {mode === "demo" ? (
              <span className="rounded-full border border-brass-dim px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-brass">
                Demo preview
              </span>
            ) : null}
          </div>

          <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto" aria-label="Studio sections">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id}
                className={[
                  "relative rounded-md px-3.5 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors duration-300",
                  tab === item.id ? "text-void" : "text-silver hover:text-chalk",
                ].join(" ")}
              >
                {tab === item.id ? (
                  <motion.span
                    layoutId="studio-tab"
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 -z-10 rounded-md bg-chalk"
                  />
                ) : null}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-mist transition-colors hover:text-chalk sm:flex"
            >
              View site
              <ArrowUpRight size={12} strokeWidth={1.5} />
            </Link>

            <span className="hidden text-[11px] text-ash md:inline">{email}</span>

            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-silver transition-colors duration-200 hover:border-ash hover:text-chalk"
              >
                <LogOut size={12} strokeWidth={1.5} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ---------------------------------- Body --------------------------------- */}
      <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 md:py-10">
        {permissionIssue ? <PermissionBanner issue={permissionIssue} /> : null}

        {/* Stats — read-only context, so it never competes with the panes below. */}
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-ink px-5 py-4">
              <dt className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-mist">
                {stat.icon ? <stat.icon size={11} strokeWidth={1.5} /> : null}
                {stat.label}
              </dt>
              <dd className="mt-2 text-[19px] font-light tracking-tight text-chalk tnum">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-8">
          {/* Opacity-only swap: no transform, so the editor's fixed slide-over can
              never be captured by a containing block. */}
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "library" ? (
              <PhotoLibrary
                photos={photos}
                collections={collections}
                canWrite={canWrite}
                blockedReason={blockedReason}
              />
            ) : null}

            {tab === "upload" ? (
              <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center gap-2.5">
                  <UploadCloud size={15} strokeWidth={1.5} className="text-brass" />
                  <h1 className="text-[15px] text-chalk">Publish photographs</h1>
                </div>
                <Uploader
                  collections={collections}
                  canWrite={canWrite}
                  blockedReason={blockedReason}
                />
              </div>
            ) : null}

            {tab === "collections" ? (
              <div className="mx-auto max-w-4xl">
                <CollectionManager
                  collections={collections}
                  canWrite={canWrite}
                  blockedReason={blockedReason}
                />
              </div>
            ) : null}

            {tab === "content" ? (
              <ContentManager
                settings={settings}
                photos={photos}
                collections={collections}
                canWrite={canWrite}
                blockedReason={blockedReason}
                tableReady={settingsReady}
              />
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
