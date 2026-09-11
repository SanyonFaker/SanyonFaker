import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Cookie-bound client for Server Components, Server Actions and Route Handlers.
 *
 * Row Level Security runs as the signed-in user, which is exactly what the
 * admin CMS wants: the same policies protect the API no matter which surface
 * issues the query.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate cookies. The `proxy.ts` session
          // refresher performs the write instead, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Anonymous, cookie-free client used for public reads.
 *
 * Because it never touches `cookies()`, gallery pages stay statically
 * renderable and can be regenerated on an interval instead of being forced
 * dynamic on every request.
 */
export function createPublicSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "enpei-public" } },
  });
}
