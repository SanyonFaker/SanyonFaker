import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * Returns `null` when the key is absent so privileged code paths can degrade
 * gracefully instead of throwing at import time. Never import this module from
 * a client component.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!serviceRoleKey || !SUPABASE_URL) return null;

  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "enpei-service" } },
  });
}
