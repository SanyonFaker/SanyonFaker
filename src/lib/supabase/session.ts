import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/**
 * Refreshes the Supabase auth cookies on every admin request and reports the
 * signed-in identity.
 *
 * This is an *optimistic* check — it keeps the proxy fast and never performs
 * authorisation on its own. The authoritative check lives in the dashboard
 * Server Component, which calls `getUser()` and validates the admin allow-list.
 * See https://nextjs.org/docs/app/guides/authentication
 */
export async function refreshAdminSession(
  request: NextRequest,
): Promise<{ response: NextResponse; email: string | null }> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return { response, email: null };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  try {
    // Reading the user also rotates an expiring session, which is what writes
    // the refreshed cookies onto `response` above.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return { response, email: null };
    }
    return { response, email: user.email ?? null };
  } catch {
    // Never let an auth hiccup take the whole route down; the Server Component
    // will re-verify and redirect if the session is genuinely invalid.
    return { response, email: null };
  }
}
