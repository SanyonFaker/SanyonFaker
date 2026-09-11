import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and de-duplicate conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Build a public URL for an object in the Supabase Storage bucket. */
export function publicStorageUrl(supabaseUrl: string, bucket: string, path: string): string {
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encoded}`;
}

/** Human-friendly byte size, e.g. `18.4 MB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Turn an arbitrary file name into a URL/storage-safe slug while keeping it
 * recognisable. Preserves the extension.
 */
export function slugifyFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : "";
  const slug = base
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 64);
  return ext ? `${slug || "photo"}.${ext}` : slug || "photo";
}

/** Format a date as `March 2025` — the register used in editorial photo credits. */
export function formatMonthYear(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

/** Deterministic short id — used for React keys in optimistic UI. */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Translate raw database and storage errors into something an operator can act
 * on. Supabase surfaces Postgres verbatim, which is precise but assumes you
 * already know the schema.
 */
export function describeDatabaseError(raw: string): string {
  if (/row-level security|violates row-level/i.test(raw)) {
    return "The database refused this write. Row Level Security only lets accounts on the administrator allow-list (public.admins) publish — if the studio is showing a SQL snippet at the top of the page, run it once and try again.";
  }
  if (/bucket not found/i.test(raw)) {
    return "The storage bucket does not exist. Run supabase/schema.sql in the Supabase SQL Editor — it creates the bucket and its policies.";
  }
  if (/exceeded the maximum allowed size|payload too large|entity too large/i.test(raw)) {
    return "That file is larger than the bucket's 50 MB limit. Export a smaller version and upload that instead.";
  }
  if (/mime type .* is not supported|invalid mime/i.test(raw)) {
    return "The bucket does not accept this file type. Allowed: JPEG, PNG, WebP, AVIF, TIFF, HEIC.";
  }
  if (/duplicate key value|already exists/i.test(raw)) {
    return "An object already exists at that storage path. Try the upload again.";
  }
  if (/jwt|not authenticated|invalid claim|session/i.test(raw)) {
    return "Your session expired. Sign out and sign in again.";
  }
  return raw;
}
