import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { refreshAdminSession } from "@/lib/supabase/session";

/**
 * Next.js 16 renamed Middleware to Proxy; the file convention is now `proxy.ts`.
 * See https://nextjs.org/docs/app/getting-started/proxy
 *
 * Scope is deliberately narrow — only the studio is matched, so public gallery
 * traffic never pays for an auth round trip. The check here is *optimistic*
 * (it only establishes that a session exists); the dashboard Server Component
 * performs the authoritative verification and allow-list check.
 */
export async function proxy(request: NextRequest) {
  const { response, email } = await refreshAdminSession(request);
  const { pathname, search } = request.nextUrl;

  // Without Supabase there is no session to read, so the demo-preview cookie is
  // the only credential. Defer entirely to `requireAdmin()` in the dashboard.
  if (!isSupabaseConfigured) return response;

  const isDashboard = pathname.startsWith("/admin/dashboard");

  // Signed out, but asking for the studio → send to the sign-in page.
  if (isDashboard && !email) {
    const target = new URL("/admin", request.url);
    target.searchParams.set("reason", "auth");
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
