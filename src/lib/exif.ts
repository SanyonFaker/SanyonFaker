import type { Exif } from "./types";

/**
 * EXIF presentation helpers.
 *
 * Cameras store raw numerics (`FNumber: 1.8`, `ExposureTime: 0.004`). A
 * photography site has to speak the language photographers read, so every
 * value is normalised into its conventional notation before it is stored.
 */

/** `1.8` → `f/1.8` */
export function formatAperture(fNumber: number | null | undefined): string | null {
  if (fNumber == null || !Number.isFinite(fNumber) || fNumber <= 0) return null;
  const rounded = Number(fNumber.toFixed(1));
  return `f/${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}`;
}

/** `0.004` → `1/250s`, `2.5` → `2.5s` */
export function formatShutter(exposureTime: number | null | undefined): string | null {
  if (exposureTime == null || !Number.isFinite(exposureTime) || exposureTime <= 0) return null;

  if (exposureTime >= 1) {
    const rounded = Number(exposureTime.toFixed(1));
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}s`;
  }

  const denominator = Math.round(1 / exposureTime);
  // Cameras report 1/3-stop values such as 1/320; snap to the nearest sane
  // shutter speed if floating point drift produced something like 1/319.
  const standard = [
    2, 4, 8, 15, 30, 60, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000,
  ];
  const nearest = standard.reduce((best, value) =>
    Math.abs(value - denominator) < Math.abs(best - denominator) ? value : best,
  );
  return `1/${nearest}s`;
}

/**
 * Display guard for shutter values.
 *
 * `formatShutter` is the single source of truth, but rows written by an earlier
 * build stored a bare `1/1000` with no unit. Normalising on the way to the
 * screen keeps the viewer correct without forcing a data migration.
 */
export function displayShutter(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already carries a unit: "1/250s", "2s", "0.5s".
  if (/s$/i.test(trimmed)) return trimmed;
  // Reciprocal form without the unit: "1/1000" → "1/1000s".
  if (/^1\/\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}s`;
  // Plain seconds without the unit: "2.5" → "2.5s".
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}s`;
  return trimmed;
}

/** `-0.333` → `-0.3 EV` */
export function formatExposureCompensation(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value === 0) return null;
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded} EV`;
}

/**
 * Extract a focal-length *range* from a lens designation when the lens is a
 * zoom: `FE 24-70mm F2.8 GM II` → `24-70mm`.
 *
 * EXIF only ever records the single focal length that was used, so the zoom
 * range has to be recovered from the lens string to display `24-70mm`.
 */
export function focalRangeFromLens(lens: string | null | undefined): string | null {
  if (!lens) return null;
  const match = lens.match(/(\d{1,3}(?:\.\d)?)\s*-\s*(\d{1,3}(?:\.\d)?)\s*mm/i);
  if (!match) return null;
  return `${match[1]}-${match[2]}mm`;
}

/**
 * Display-ready focal length.
 *
 * When a zoom range can be recovered from the lens the range wins, because
 * that is how a photographer describes the lens; otherwise the actual
 * focal length used is shown (`35mm`).
 */
export function formatFocalLength(
  focalLength: number | null | undefined,
  lens?: string | null,
): string | null {
  const range = focalRangeFromLens(lens);
  if (range) return range;

  if (focalLength == null || !Number.isFinite(focalLength) || focalLength <= 0) return null;
  const rounded = Number(focalLength.toFixed(1));
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}mm`;
}

/** `1` → `Manual`, `2` → `Auto`. */
export function formatWhiteBalance(value: number | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value === 1 ? "Manual" : "Auto";
}

/** `2` → `Center-weighted`, `5` → `Pattern`. */
export function formatMeteringMode(value: number | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;

  const modes: Record<number, string> = {
    0: "Unknown",
    1: "Average",
    2: "Center-weighted",
    3: "Spot",
    4: "Multi-spot",
    5: "Pattern",
    6: "Partial",
  };
  return modes[value] ?? null;
}

/** `1` → `sRGB`, `65535` → `Uncalibrated`. */
export function formatColorSpace(value: number | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value === 1) return "sRGB";
  if (value === 65535) return "Adobe RGB";
  return null;
}

/** Tidy a camera body name: `NIKON CORPORATION NIKON Z 8` → `Nikon Z 8`. */
export function formatCamera(
  make: string | null | undefined,
  model: string | null | undefined,
): string | null {
  const cleanModel = (model ?? "").trim();
  const cleanMake = (make ?? "").trim();
  if (!cleanModel && !cleanMake) return null;
  if (!cleanModel) return titleCase(cleanMake);

  const normalisedMake = cleanMake.split(/\s+/)[0] ?? "";
  // Drop a duplicated manufacturer prefix: "Canon Canon EOS R5" → "Canon EOS R5".
  const stripped = normalisedMake
    ? cleanModel.replace(new RegExp(`^${escapeRegExp(normalisedMake)}\\s+`, "i"), "")
    : cleanModel;

  const prefix = normalisedMake ? `${titleCase(normalisedMake)} ` : "";
  return `${prefix}${stripped}`.trim();
}

/** Clean up a lens designation for display. */
export function formatLens(lens: string | null | undefined): string | null {
  const value = (lens ?? "").trim();
  if (!value) return null;
  // Some bodies pad the field with trailing spaces or null characters.
  return value.replace(/\0/g, "").replace(/\s+/g, " ").trim() || null;
}

/** Read the EXIF orientation flag; 5–8 mean the stored bitmap is rotated 90°. */
export function isRotatedOrientation(orientation: number | null | undefined): boolean {
  return orientation != null && orientation >= 5 && orientation <= 8;
}

/** True when every meaningful field is empty — used to hide an empty EXIF panel. */
export function hasDisplayableExif(exif: Exif | null | undefined): boolean {
  if (!exif) return false;
  return Boolean(
    exif.camera ||
      exif.lens ||
      exif.focalLength ||
      exif.aperture ||
      exif.shutter ||
      exif.iso ||
      exif.dateTaken,
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
