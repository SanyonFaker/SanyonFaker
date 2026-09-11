import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_MODE } from "./photos";
import { createServerSupabaseClient } from "./supabase/server";

/**
 * Server-only administrator authorisation.
 *
 * Two independent gates must both pass:
 *   1. Supabase Auth confirms the identity (`getUser`, verified against the
 *      Auth server — never the cookie payload alone).
 *   2. The verified e-mail appears in the `ADMIN_EMAILS` allow-list.
 *
 * This module imports `node:crypto`, so it must never be pulled into the Proxy
 * (edge) bundle — `proxy.ts` deliberately stays on the optimistic cookie check.
 */

export const DEMO_ADMIN_COOKIE = "lumen_demo_admin";

export type AdminIdentity = {
  email: string;
  mode: "supabase" | "demo";
};

/** Comma-separated allow-list, lower-cased. Empty list means "nobody". */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Allow-list check. Deny-by-default: an unset `ADMIN_EMAILS` grants nobody
 * access, so a forgotten environment variable can never open the CMS.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getAdminEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

/* -------------------------------------------------------------------------- */
/* Demo Mode preview                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A local-only preview of the CMS, available exclusively when Supabase is not
 * configured *and* `DEMO_ADMIN_PASSWORD` is explicitly set (minimum 8 chars).
 * It exists so the dashboard can be reviewed before the backend is provisioned.
 * It is off unless deliberately switched on, and it can never activate on a
 * deployment that has Supabase credentials.
 */
export function isDemoAdminEnabled(): boolean {
  return DEMO_MODE && (process.env.DEMO_ADMIN_PASSWORD ?? "").length >= 8;
}

function demoAdminToken(): string | null {
  const password = process.env.DEMO_ADMIN_PASSWORD ?? "";
  if (!isDemoAdminEnabled()) return null;
  return createHmac("sha256", password).update("lumen::demo-admin::v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function checkDemoAdminPassword(candidate: string): boolean {
  const expected = process.env.DEMO_ADMIN_PASSWORD ?? "";
  if (!isDemoAdminEnabled()) return false;
  return safeEqual(candidate, expected);
}

export function demoAdminCookieValue(): string | null {
  return demoAdminToken();
}

export function isValidDemoAdminCookie(value: string | undefined): boolean {
  const expected = demoAdminToken();
  if (!expected || !value) return false;
  return safeEqual(value, expected);
}

/* -------------------------------------------------------------------------- */
/* Session resolution                                                          */
/* -------------------------------------------------------------------------- */

/** The signed-in administrator, or `null` for anonymous visitors. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  if (DEMO_MODE) {
    const cookieStore = await cookies();
    const value = cookieStore.get(DEMO_ADMIN_COOKIE)?.value;
    if (isValidDemoAdminCookie(value)) {
      return { email: getAdminEmails()[0] ?? "demo@localhost", mode: "demo" };
    }
    return null;
  }

  try {
    const supabase = await createServerSupabaseClient();

    // `getUser` validates the access token against the Auth server. The cookie
    // alone is never trusted for an authorisation decision.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !isAdminEmail(user.email)) return null;
    return { email: user.email ?? "", mode: "supabase" };
  } catch {
    return null;
  }
}

/**
 * Guard for admin Server Components and Server Actions.
 *
 * Redirects to the sign-in page when the visitor is not an allow-listed
 * administrator. Redirects use the same response shape as a successful load, so
 * an unauthorised visitor cannot distinguish "no such page" from "not allowed".
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin?reason=auth");
  return identity;
}
