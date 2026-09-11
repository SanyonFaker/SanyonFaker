/**
 * Domain types shared by the public gallery, the admin CMS and the data layer.
 *
 * The database stores snake_case columns; `PhotoRow` mirrors the table exactly
 * while `Photo` is the camelCase shape the UI consumes.
 */

/** Normalised EXIF block. All values are pre-formatted for display. */
export type Exif = {
  /** Camera body, e.g. `Sony α7R V` */
  camera?: string | null;
  /** Lens designation, e.g. `FE 24-70mm F2.8 GM II` */
  lens?: string | null;
  /** Display-ready focal length covering both primes and zooms: `35mm`, `24-70mm` */
  focalLength?: string | null;
  /** Numeric focal length in millimetres, useful for sorting and filtering. */
  focalLengthMm?: number | null;
  /** 35mm-equivalent focal length when the sensor is smaller than full frame. */
  focalLength35mm?: number | null;
  /** `f/1.8` */
  aperture?: string | null;
  /** `1/250s` */
  shutter?: string | null;
  /** `100` */
  iso?: number | null;
  /** `-0.3 EV` */
  exposureCompensation?: string | null;
  whiteBalance?: string | null;
  meteringMode?: string | null;
  colorSpace?: string | null;
  software?: string | null;
  artist?: string | null;
  copyright?: string | null;
  /** Original capture timestamp as reported by the camera. */
  dateTaken?: string | null;
};

/** A single photograph as rendered by the site. */
export type Photo = {
  id: string;
  /** Path inside the Supabase Storage bucket, or an absolute URL in demo mode. */
  storagePath: string;
  /** Archival original, when a web-sized derivative is being served instead. */
  originalPath: string | null;
  /** Fully resolved, browser-loadable image URL. */
  src: string;
  fileName: string | null;
  width: number;
  height: number;
  /** Tiny base64 preview used as `next/image` blur placeholder. */
  blurDataUrl: string | null;
  /** Fallback swatch shown before the image decodes. */
  dominantColor: string | null;
  title: string | null;
  caption: string | null;
  location: string | null;
  collection: string | null;
  tags: string[];
  exif: Exif;
  featured: boolean;
  sortOrder: number;
  takenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A curated grouping of photographs, e.g. Landscapes or Events. */
export type Collection = {
  slug: string;
  title: string;
  titleZh: string | null;
  description: string | null;
  sortOrder: number;
  photoCount: number;
  /** First photograph in the collection — used as the index thumbnail. */
  coverSrc: string | null;
  coverBlurDataUrl: string | null;
};

/** Exact mirror of a row in `public.photos`. */
export type PhotoRow = {
  id: string;
  storage_path: string;
  original_path?: string | null;
  file_name: string | null;
  width: number | null;
  height: number | null;
  blur_data_url: string | null;
  dominant_color: string | null;
  title: string | null;
  caption: string | null;
  location: string | null;
  collection_slug: string | null;
  tags: string[] | null;
  exif: Exif | null;
  featured: boolean | null;
  sort_order: number | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Exact mirror of a row in `public.collections`. */
export type CollectionRow = {
  slug: string;
  title: string;
  title_zh: string | null;
  description: string | null;
  sort_order: number | null;
};

/**
 * Editable site content — the singleton row in `public.site_settings`.
 *
 * These are the choices about the *site* rather than about any one photograph:
 * which image opens the homepage, which image sits beside the statement, and
 * what equipment is listed.
 */
export type SiteSettings = {
  /** Homepage hero. Falls back to the featured photograph, then the newest. */
  heroPhotoId: string | null;
  /** Image beside the About / Statement text. Falls back to the newest photo. */
  statementPhotoId: string | null;
  /** Equipment list, one line per entry. */
  equipment: string[];
};

/** Exact mirror of a row in `public.site_settings`. */
export type SiteSettingsRow = {
  id: number;
  hero_photo_id: string | null;
  statement_photo_id: string | null;
  equipment: string[] | null;
};

/** Payload accepted by the settings Server Action. */
export type SiteSettingsInput = {
  hero_photo_id?: string | null;
  statement_photo_id?: string | null;
  equipment?: string[];
};

/** Fields an administrator may write when creating or editing a photograph. */
export type PhotoInput = {
  storage_path: string;
  original_path?: string | null;
  file_name?: string | null;
  width?: number | null;
  height?: number | null;
  blur_data_url?: string | null;
  dominant_color?: string | null;
  title?: string | null;
  caption?: string | null;
  location?: string | null;
  collection_slug?: string | null;
  tags?: string[];
  exif?: Exif;
  featured?: boolean;
  sort_order?: number;
  taken_at?: string | null;
};

/** Result envelope for every server action so the client never sees a raw throw. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
