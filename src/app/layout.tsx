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
    default: "ENPEI — Photography",
    template: "%s — ENPEI",
  },
  description:
    "Photography by Enpei — landscapes, documentary events, portraits, street and architecture. An ongoing personal archive.",
  keywords: [
    "Enpei",
    "photography",
    "portfolio",
    "landscape",
    "documentary",
    "fine art",
    "摄影作品",
    "摄影",
  ],
  authors: [{ name: "Enpei", url: "https://www.instagram.com/sanyoonlee/" }],
  creator: "Enpei",
  openGraph: {
    type: "website",
    siteName: "ENPEI",
    title: "ENPEI — Photography",
    description:
      "Photography by Enpei — landscapes, documentary events, portraits, street and architecture.",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ENPEI — Photography",
    description:
      "Photography by Enpei — landscapes, documentary events, portraits, street and architecture.",
  },
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
