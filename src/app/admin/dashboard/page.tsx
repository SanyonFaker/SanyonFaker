import { AdminDashboard } from "@/components/admin/dashboard";
import { requireAdmin } from "@/lib/auth";
import { DEMO_MODE, getCollections, getPhotos } from "@/lib/photos";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Authoritative authorisation happens here.
 *
 * `proxy.ts` performs an optimistic cookie check to avoid a round trip for
 * anonymous traffic, but this Server Component re-verifies the session against
 * Supabase Auth and the `ADMIN_EMAILS` allow-list before a single photograph is
 * read. See https://nextjs.org/docs/app/guides/authentication
 */
export default async function StudioDashboardPage() {
  const identity = await requireAdmin();

  const [photos, collections, access] = await Promise.all([
    getPhotos(),
    getCollections(),
    checkDatabaseAccess(),
  ]);

  const canWrite = !DEMO_MODE && access.ok;
  const blockedReason = DEMO_MODE
    ? "Demo Mode is read-only. Publish, edit and delete stay disabled until NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured and supabase/schema.sql has been applied."
    : null;

  return (
    <AdminDashboard
      email={identity.email}
      mode={identity.mode}
      photos={photos}
      collections={collections}
      canWrite={canWrite}
      blockedReason={blockedReason}
      /**
       * Handing the studio the reason (and the identity e-mail) lets it print
       * the exact remedy, instead of leaving the operator to decode a raw
       * "new row violates row-level security policy" from Postgres.
       */
      permissionIssue={
        !DEMO_MODE && !access.ok
          ? { reason: access.reason, email: identity.email, detail: access.detail ?? null }
          : null
      }
    />
  );
}

type DatabaseAccess =
  | { ok: true }
  | { ok: false; reason: "not-listed" | "error"; detail?: string };

/**
 * Ask the database the same question its Row Level Security policies ask.
 *
 * The `admins read the allow-list` policy only exposes rows to accounts that
 * `is_admin()` already accepts, so an empty result means this account is not on
 * the list — and therefore that every write will be rejected. Reading the
 * policy's own table is the cheapest way to find that out before the operator
 * discovers it through a failed upload.
 *
 * A missing table or function is reported separately: that means `schema.sql`
 * was not applied, which needs a completely different remedy.
 */
async function checkDatabaseAccess(): Promise<DatabaseAccess> {
  if (DEMO_MODE) return { ok: false, reason: "not-listed" };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("admins").select("email").limit(1);

    if (error) return { ok: false, reason: "error", detail: error.message };
    return (data?.length ?? 0) > 0 ? { ok: true } : { ok: false, reason: "not-listed" };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      detail: error instanceof Error ? error.message : undefined,
    };
  }
}
