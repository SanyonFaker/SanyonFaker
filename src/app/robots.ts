import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

/**
 * `/admin` is disallowed here as defence in depth; the admin route group also
 * sends `X-Robots-Tag: noindex` headers (see `next.config.ts`).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
