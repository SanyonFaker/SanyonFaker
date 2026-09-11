import type { NextConfig } from "next";

/**
 * Supabase Storage serves public objects from `<project-ref>.supabase.co`.
 * We derive the concrete host at build time when the env var is present, and
 * always allow the wildcard so a freshly configured deployment does not need a
 * config change before its images resolve.
 */
const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    // Next 16 reduced the default generated sizes/qualities; a photography site
    // needs wider art direction control than the new defaults allow.
    qualities: [60, 75, 90],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2048, 2560, 3840],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // Supabase Storage (public buckets)
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
      // Demo-mode placeholder photography (see src/lib/demo-data.ts)
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },

  async headers() {
    return [
      {
        // The admin surface must never be indexed or cached by intermediaries.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
