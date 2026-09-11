import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "./globals.css";

import { SITE_URL } from "@/lib/env";

/**
 * Root shell only.
 *
 * Public chrome lives in `(site)/layout.tsx` and the studio chrome in
 * `admin/layout.tsx`, so neither bleeds into the other.
 */

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LUMEN — Photography",
    template: "%s — LUMEN",
  },
  description:
    "Selected photography of land, people and the built world. A personal archive of landscapes, documentary events, portraits and architecture.",
  keywords: ["photography", "portfolio", "landscape", "documentary", "fine art", "摄影作品"],
  authors: [{ name: "LUMEN Studio" }],
  openGraph: {
    type: "website",
    siteName: "LUMEN",
    title: "LUMEN — Photography",
    description:
      "Selected photography of land, people and the built world. Landscapes, events, portraits and architecture.",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="grain min-h-dvh bg-void antialiased">{children}</body>
    </html>
  );
}
