/**
 * Public environment access.
 *
 * Everything in this module is safe to import from client components: only
 * `NEXT_PUBLIC_*` values are read, and Next.js inlines them at build time.
 * Server-only secrets live in `src/lib/auth.ts`.
 */

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");

/**
 * Supabase renamed `anon` to `publishable` for new projects. Accept either so a
 * fresh dashboard copy/paste always works.
 */
export const SUPABASE_ANON_KEY =
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const SUPABASE_BUCKET = clean(process.env.NEXT_PUBLIC_SUPABASE_BUCKET) || "photos";

export const SITE_URL =
  clean(process.env.NEXT_PUBLIC_SITE_URL).replace(/\/+$/, "") || "http://localhost:3000";

/**
 * When false the whole site transparently serves curated demo content instead
 * of querying Supabase, so the project is presentable before any cloud setup.
 */
export const isSupabaseConfigured: boolean =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
