"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DEMO_ADMIN_COOKIE,
  checkDemoAdminPassword,
  demoAdminCookieValue,
  getAdminEmails,
  getAdminIdentity,
  isDemoAdminEnabled,
} from "@/lib/auth";
import { SUPABASE_BUCKET } from "@/lib/env";
import { DEMO_MODE } from "@/lib/photos";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult, Exif, PhotoInput } from "@/lib/types";

/**
 * Every mutation the CMS performs.
 *
 * All of them re-derive the administrator identity on the server; a client can
 * never assert its own privileges. Failures are returned as data rather than
 * thrown so the dashboard can render a precise, non-fatal message.
 */

const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 32;
const MAX_TEXT = 2000;

/* -------------------------------------------------------------------------- */
/* Authentication                                                              */
/* -------------------------------------------------------------------------- */

export type SignInState = { error: string | null };

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter both an e-mail address and a password." };
  }

  // --- Demo Mode preview ---------------------------------------------------
  if (DEMO_MODE) {
    if (!isDemoAdminEnabled()) {
      return {
        error:
          "Demo Mode is active, so Supabase Auth is unavailable. Set DEMO_ADMIN_PASSWORD in .env.local to preview the dashboard locally, or connect Supabase.",
      };
    }
    if (!checkDemoAdminPassword(password)) {
      return { error: "Incorrect password." };
    }
    const token = demoAdminCookieValue();
    if (!token) return { error: "Demo Mode preview is not configured correctly." };

    const cookieStore = await cookies();
    cookieStore.set(DEMO_ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    redirect("/admin/dashboard");
  }

  // --- Supabase Auth -------------------------------------------------------
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Deliberately vague: never reveal whether an address exists.
      return { error: "Those credentials were not accepted." };
    }

    const allowed = getAdminEmails();
    const userEmail = data.user?.email?.toLowerCase() ?? "";

    if (allowed.length === 0 || !allowed.includes(userEmail)) {
      // Authenticated but not an administrator — drop the session immediately.
      await supabase.auth.signOut();
      return { error: "This account is not authorised for the studio." };
    }
  } catch {
    return { error: "Could not reach the authentication service. Check your connection." };
  }

  redirect("/admin/dashboard");
}

export async function signOutAction(): Promise<void> {
  if (DEMO_MODE) {
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_ADMIN_COOKIE);
    redirect("/admin");
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin");
}

/* -------------------------------------------------------------------------- */
/* Photographs                                                                 */
/* -------------------------------------------------------------------------- */

export async function createPhotoAction(
  input: PhotoInput,
): Promise<ActionResult<{ id: string }>> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Not authorised." };
  if (DEMO_MODE) {
    return { ok: false, error: "Demo Mode is read-only. Connect Supabase to store photographs." };
  }

  const storagePath = typeof input.storage_path === "string" ? input.storage_path.trim() : "";
  if (!storagePath) return { ok: false, error: "The upload did not produce a storage path." };

  const row = {
    storage_path: storagePath,
    original_path: cleanText(input.original_path, 512),
    file_name: cleanText(input.file_name, 255),
    width: positiveInt(input.width),
    height: positiveInt(input.height),
    blur_data_url: cleanText(input.blur_data_url, 8000),
    dominant_color: cleanText(input.dominant_color, 16),
    title: cleanText(input.title, 200),
    caption: cleanText(input.caption, MAX_TEXT),
    location: cleanText(input.location, 200),
    collection_slug: cleanText(input.collection_slug, 64),
    tags: normaliseTags(input.tags),
    exif: sanitiseExif(input.exif),
    featured: Boolean(input.featured),
    sort_order: Number.isFinite(input.sort_order) ? Number(input.sort_order) : 0,
    taken_at: isoOrNull(input.taken_at),
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("photos").insert(row).select("id").single();

    if (error) return { ok: false, error: error.message };

    revalidateGallery();
    return { ok: true, data: { id: data.id as string } };
  } catch {
    return { ok: false, error: "Could not save this photograph." };
  }
}

export async function updatePhotoAction(
  id: string,
  patch: Partial<PhotoInput>,
): Promise<ActionResult<undefined>> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Not authorised." };
  if (DEMO_MODE) {
    return { ok: false, error: "Demo Mode is read-only. Connect Supabase to edit photographs." };
  }
  if (!id) return { ok: false, error: "Missing photograph id." };

  const update: Record<string, unknown> = {};

  if ("title" in patch) update.title = cleanText(patch.title, 200);
  if ("caption" in patch) update.caption = cleanText(patch.caption, MAX_TEXT);
  if ("location" in patch) update.location = cleanText(patch.location, 200);
  if ("collection_slug" in patch) update.collection_slug = cleanText(patch.collection_slug, 64);
  if ("tags" in patch) update.tags = normaliseTags(patch.tags);
  if ("featured" in patch) update.featured = Boolean(patch.featured);
  if ("sort_order" in patch) update.sort_order = Number(patch.sort_order) || 0;
  if ("taken_at" in patch) update.taken_at = isoOrNull(patch.taken_at);
  if ("exif" in patch) update.exif = sanitiseExif(patch.exif);
  if ("width" in patch) update.width = positiveInt(patch.width);
  if ("height" in patch) update.height = positiveInt(patch.height);

  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("photos").update(update).eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidateGallery();
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Could not save your changes." };
  }
}

export async function deletePhotoAction(
  id: string,
  storagePath: string,
  originalPath?: string | null,
): Promise<ActionResult<undefined>> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Not authorised." };
  if (DEMO_MODE) {
    return { ok: false, error: "Demo Mode is read-only. Connect Supabase to delete photographs." };
  }
  if (!id) return { ok: false, error: "Missing photograph id." };

  try {
    const supabase = await createServerSupabaseClient();

    // Remove the bytes first. If this fails we keep the row, so the catalogue
    // never ends up referencing an object that no longer exists.
    const objects = [storagePath, originalPath].filter(
      (path): path is string => typeof path === "string" && path.length > 0 && !/^https?:/i.test(path),
    );

    if (objects.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove(objects);

      // A missing object is not a reason to block deleting the record.
      if (storageError && !/not found/i.test(storageError.message)) {
        return { ok: false, error: `Storage refused the delete: ${storageError.message}` };
      }
    }

    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidateGallery();
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Could not delete this photograph." };
  }
}

/* -------------------------------------------------------------------------- */
/* Collections                                                                 */
/* -------------------------------------------------------------------------- */

export async function saveCollectionAction(input: {
  slug: string;
  title: string;
  title_zh?: string | null;
  description?: string | null;
  sort_order?: number;
}): Promise<ActionResult<undefined>> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Not authorised." };
  if (DEMO_MODE) {
    return { ok: false, error: "Demo Mode is read-only. Connect Supabase to edit collections." };
  }

  const slug = slugify(input.slug || input.title);
  if (!slug) return { ok: false, error: "A collection needs a name." };

  const title = cleanText(input.title, 120) ?? slug;
  const row = {
    slug,
    title,
    title_zh: cleanText(input.title_zh, 120),
    description: cleanText(input.description, MAX_TEXT),
    sort_order: Number.isFinite(input.sort_order) ? Number(input.sort_order) : 0,
  };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("collections").upsert(row, { onConflict: "slug" });
    if (error) return { ok: false, error: error.message };

    revalidateGallery();
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Could not save this collection." };
  }
}

export async function deleteCollectionAction(slug: string): Promise<ActionResult<undefined>> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Not authorised." };
  if (DEMO_MODE) {
    return { ok: false, error: "Demo Mode is read-only. Connect Supabase to delete collections." };
  }
  if (!slug) return { ok: false, error: "Missing collection slug." };

  try {
    const supabase = await createServerSupabaseClient();
    // `on delete set null` on photos.collection_slug keeps the photographs.
    const { error } = await supabase.from("collections").delete().eq("slug", slug);
    if (error) return { ok: false, error: error.message };

    revalidateGallery();
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Could not delete this collection." };
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Invalidate every surface that renders photography content. */
function revalidateGallery(): void {
  revalidatePath("/", "layout");
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\0/g, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Lower-case, de-duplicate, bound the count and the length of each tag. */
function normaliseTags(value: unknown): string[] {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  for (const entry of source) {
    if (typeof entry !== "string") continue;
    const tag = entry.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    if (tag) seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

/** Keep only known EXIF keys with primitive values so jsonb stays predictable. */
function sanitiseExif(value: unknown): Exif {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const allowed: Array<keyof Exif> = [
    "camera",
    "lens",
    "focalLength",
    "focalLengthMm",
    "focalLength35mm",
    "aperture",
    "shutter",
    "iso",
    "exposureCompensation",
    "whiteBalance",
    "meteringMode",
    "colorSpace",
    "software",
    "artist",
    "copyright",
    "dateTaken",
  ];

  const exif: Record<string, string | number> = {};

  for (const key of allowed) {
    const raw = source[key];
    if (raw == null) continue;

    if (typeof raw === "string") {
      const text = raw.trim().slice(0, 200);
      if (text) exif[key] = text;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      exif[key] = raw;
    }
  }

  return exif as Exif;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}
