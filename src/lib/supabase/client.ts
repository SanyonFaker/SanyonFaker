"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserSupabaseClient | null = null;

/**
 * Cookie-backed Supabase client for the browser.
 *
 * Memoised because `createBrowserClient` attaches auth listeners; creating a
 * new instance per render would leak subscriptions and duplicate token refreshes.
 */
export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  if (!cached) {
    cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return cached;
}
