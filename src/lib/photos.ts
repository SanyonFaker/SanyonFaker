import { SUPABASE_BUCKET, SUPABASE_URL, isSupabaseConfigured } from "./env";
import { demoCollectionsWithCovers, demoPhotos } from "./demo-data";
import { createPublicSupabaseClient } from "./supabase/server";
import { publicStorageUrl } from "./utils";
import type { Collection, CollectionRow, Photo, PhotoRow } from "./types";

/**
 * The single read path for photography content.
 *
 * When Supabase is not configured every function transparently serves the Demo
 * Mode dataset, so pages, layouts and motion can be built and reviewed before
 * any backend exists. The branch is decided once, at module scope.
 */
export const DEMO_MODE = !isSupabaseConfigured;

/** Public reads are statically renderable; pages opt into ISR via `revalidate`. */
const PHOTO_COLUMNS =
  "id,storage_path,original_path,file_name,width,height,blur_data_url,dominant_color,title,caption,location,collection_slug,tags,exif,featured,sort_order,taken_at,created_at,updated_at";

type PhotoFilter = {
  collection?: string | null;
  limit?: number | null;
  featuredOnly?: boolean;
};

/** Resolve the browser-loadable URL for a stored photograph. */
function resolveSrc(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  return publicStorageUrl(SUPABASE_URL, SUPABASE_BUCKET, storagePath);
}

/** Map a database row onto the camelCase shape the UI consumes. */
export function mapPhotoRow(row: PhotoRow): Photo {
  const width = row.width ?? 1600;
  const height = row.height ?? 1067;

  return {
    id: row.id,
    storagePath: row.storage_path,
    originalPath: row.original_path ?? null,
    src: resolveSrc(row.storage_path),
    fileName: row.file_name,
    width,
    height,
    blurDataUrl: row.blur_data_url,
    dominantColor: row.dominant_color,
    title: row.title,
    caption: row.caption,
    location: row.location,
    collection: row.collection_slug,
    tags: Array.isArray(row.tags) ? row.tags : [],
    exif: row.exif ?? {},
    featured: row.featured ?? false,
    sortOrder: row.sort_order ?? 0,
    takenAt: row.taken_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List photographs, newest-first by capture date.
 *
 * Failures degrade to an empty list rather than a 500 — a portfolio should
 * never show a stack trace because a database blipped.
 */
export async function getPhotos(filter: PhotoFilter = {}): Promise<Photo[]> {
  const { collection, limit, featuredOnly } = filter;

  if (DEMO_MODE) {
    let photos = [...demoPhotos];
    if (collection) photos = photos.filter((photo) => photo.collection === collection);
    if (featuredOnly) photos = photos.filter((photo) => photo.featured);
    photos.sort(byRecency);
    return typeof limit === "number" ? photos.slice(0, limit) : photos;
  }

  try {
    const supabase = createPublicSupabaseClient();
    let query = supabase.from("photos").select(PHOTO_COLUMNS);

    if (collection) query = query.eq("collection_slug", collection);
    if (featuredOnly) query = query.eq("featured", true);

    query = query
      .order("sort_order", { ascending: true })
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (typeof limit === "number") query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return ((data ?? []) as unknown as PhotoRow[]).map(mapPhotoRow);
  } catch (error) {
    console.error("[enpei] getPhotos failed:", describe(error));
    return [];
  }
}

/** Fetch a single photograph by id. */
export async function getPhotoById(id: string): Promise<Photo | null> {
  if (DEMO_MODE) {
    return demoPhotos.find((photo) => photo.id === id) ?? null;
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("photos")
      .select(PHOTO_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapPhotoRow(data as unknown as PhotoRow) : null;
  } catch (error) {
    console.error("[enpei] getPhotoById failed:", describe(error));
    return null;
  }
}

/**
 * Collections with their photograph count and a cover image.
 *
 * Counts and covers are derived from a single lightweight projection of the
 * photos table rather than one count query per collection.
 */
export async function getCollections(): Promise<Collection[]> {
  if (DEMO_MODE) return demoCollectionsWithCovers;

  try {
    const supabase = createPublicSupabaseClient();

    const [collectionsResult, coversResult] = await Promise.all([
      supabase
        .from("collections")
        .select("slug,title,title_zh,description,sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("photos")
        .select("collection_slug,storage_path,blur_data_url")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (collectionsResult.error) throw collectionsResult.error;

    const covers = new Map<string, { src: string; blur: string | null; count: number }>();
    for (const row of (coversResult.data ?? []) as Array<{
      collection_slug: string | null;
      storage_path: string;
      blur_data_url: string | null;
    }>) {
      const slug = row.collection_slug;
      if (!slug) continue;
      const existing = covers.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        covers.set(slug, { src: resolveSrc(row.storage_path), blur: row.blur_data_url, count: 1 });
      }
    }

    return ((collectionsResult.data ?? []) as CollectionRow[]).map((row) => {
      const cover = covers.get(row.slug);
      return {
        slug: row.slug,
        title: row.title,
        titleZh: row.title_zh,
        description: row.description,
        sortOrder: row.sort_order ?? 0,
        photoCount: cover?.count ?? 0,
        coverSrc: cover?.src ?? null,
        coverBlurDataUrl: cover?.blur ?? null,
      };
    });
  } catch (error) {
    console.error("[enpei] getCollections failed:", describe(error));
    return [];
  }
}

/** Look up one collection, for `generateMetadata` and the category header. */
export async function getCollection(slug: string): Promise<Collection | null> {
  const collections = await getCollections();
  return collections.find((collection) => collection.slug === slug) ?? null;
}

/** Every distinct tag with its frequency, for the archive filter row. */
export async function getTags(): Promise<Array<{ tag: string; count: number }>> {
  const photos = await getPhotos();

  const counts = new Map<string, number>();
  for (const photo of photos) {
    for (const tag of photo.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Newest first, falling back to `createdAt` when the camera reported no date. */
function byRecency(a: Photo, b: Photo): number {
  const left = new Date(a.takenAt ?? a.createdAt).getTime();
  const right = new Date(b.takenAt ?? b.createdAt).getTime();
  return right - left;
}

function describe(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
