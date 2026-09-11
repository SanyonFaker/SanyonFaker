import type { Metadata } from "next";

/**
 * Studio chrome.
 *
 * Deliberately excludes the public masthead, footer and Lenis: a dashboard
 * wants native scrolling and no decorative motion competing with the work.
 * `force-dynamic` guarantees no admin surface is ever prerendered or cached.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh bg-void">
      {children}
    </main>
  );
}
