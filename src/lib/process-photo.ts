"use client";

import exifr from "exifr";
import {
  formatAperture,
  formatCamera,
  formatColorSpace,
  formatExposureCompensation,
  formatFocalLength,
  formatLens,
  formatMeteringMode,
  formatShutter,
  formatWhiteBalance,
  isRotatedOrientation,
} from "./exif";
import type { Exif } from "./types";

/**
 * Browser-side ingest pipeline.
 *
 * Three jobs run against every dropped file, all of them before a single byte
 * reaches the network:
 *
 *  1. Read EXIF and normalise it into display-ready strings.
 *  2. Measure the real pixel dimensions and synthesise a blur placeholder.
 *  3. Build a web-sized derivative so the gallery never serves a 40 MP
 *     original to a browser.
 */

/** Longest edge of the derivative that the public site actually serves. */
const DERIVATIVE_MAX_EDGE = 2560;
/** Longest edge of the miniature used as the `next/image` blur placeholder. */
const PLACEHOLDER_EDGE = 24;

export type ProcessedPhoto = {
  exif: Exif;
  /**
   * Dimensions of the file that will actually be served — the derivative when
   * one was produced, otherwise the original. These are what the catalogue
   * records, because `next/image` uses them to build its srcset: storing the
   * original's dimensions would advertise widths the stored file cannot honour.
   */
  width: number;
  height: number;
  /** Size of the untouched upload, before any downscaling. */
  originalWidth: number;
  originalHeight: number;
  blurDataUrl: string | null;
  dominantColor: string | null;
  takenAt: string | null;
  /** Web-sized replacement for the original, when one could be produced. */
  derivative: Blob | null;
  derivativeExtension: string;
  /** Non-fatal problems worth surfacing in the uploader, e.g. HEIC decode. */
  warnings: string[];
};

/** True when the browser can hand a File to `<canvas>` / `createImageBitmap`. */
export function isBrowserDecodable(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) {
    // Chrome, Edge and Firefox cannot decode HEIC/HEIF even though the MIME
    // type looks like an ordinary image.
    return !/(heic|heif)/.test(type) && !/\.(heic|heif)$/i.test(file.name);
  }
  return /\.(jpe?g|png|webp|avif|gif|bmp|tiff?)$/i.test(file.name);
}

/** Every file type the admin uploader accepts. */
export const ACCEPTED_IMAGE_TYPES =
  "image/jpeg,image/png,image/webp,image/avif,image/tiff,image/heic,image/heif";

export async function processPhotoFile(file: File): Promise<ProcessedPhoto> {
  const warnings: string[] = [];

  const [exif, bitmapInfo] = await Promise.all([
    readExif(file).catch(() => ({ exif: {} as Exif, rawWidth: null, rawHeight: null, takenAt: null })),
    analysePixels(file).catch((error: unknown) => {
      warnings.push(
        isBrowserDecodable(file)
          ? "Could not decode this file's pixels for a preview."
          : "This format cannot be decoded in the browser — dimensions were read from EXIF and no preview was generated.",
      );
      void error;
      return null;
    }),
  ]);

  const width = bitmapInfo?.width ?? exif.rawWidth ?? 0;
  const height = bitmapInfo?.height ?? exif.rawHeight ?? 0;

  return {
    exif: exif.exif,
    width,
    height,
    originalWidth: bitmapInfo?.originalWidth ?? width,
    originalHeight: bitmapInfo?.originalHeight ?? height,
    blurDataUrl: bitmapInfo?.blurDataUrl ?? null,
    dominantColor: bitmapInfo?.dominantColor ?? null,
    takenAt: exif.takenAt,
    derivative: bitmapInfo?.derivative ?? null,
    derivativeExtension: bitmapInfo?.derivativeExtension ?? extensionFor(file),
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* EXIF                                                                        */
/* -------------------------------------------------------------------------- */

const EXIF_PICK = [
  "Make",
  "Model",
  "LensModel",
  "LensInfo",
  "FNumber",
  "ApertureValue",
  "ExposureTime",
  "ISO",
  "FocalLength",
  "FocalLengthIn35mmFormat",
  "DateTimeOriginal",
  "CreateDate",
  "ExposureCompensation",
  "WhiteBalance",
  "MeteringMode",
  "ColorSpace",
  "Software",
  "Artist",
  "Copyright",
  "Orientation",
  "ExifImageWidth",
  "ExifImageHeight",
] as const;

type ExifrOutput = Record<string, unknown>;

async function readExif(file: File): Promise<{
  exif: Exif;
  rawWidth: number | null;
  rawHeight: number | null;
  takenAt: string | null;
}> {
  const raw = (await exifr.parse(file, {
    pick: [...EXIF_PICK],
    translateValues: true,
    reviveValues: true,
    sanitize: true,
  })) as ExifrOutput | undefined;

  if (!raw) return { exif: {}, rawWidth: null, rawHeight: null, takenAt: null };

  const make = asString(raw.Make);
  const model = asString(raw.Model);
  const lens =
    formatLens(asString(raw.LensModel)) ??
    formatLens(Array.isArray(raw.LensInfo) ? describeLensInfo(raw.LensInfo) : null);

  const focalLengthMm = asNumber(raw.FocalLength);
  const orientation = asNumber(raw.Orientation);
  const dateTaken = toIsoDate(raw.DateTimeOriginal ?? raw.CreateDate);

  let rawWidth = asNumber(raw.ExifImageWidth);
  let rawHeight = asNumber(raw.ExifImageHeight);

  // A portrait frame shot on a rotated body stores landscape dimensions plus an
  // orientation flag; report the dimensions the viewer will actually see.
  if (rawWidth && rawHeight && isRotatedOrientation(orientation)) {
    [rawWidth, rawHeight] = [rawHeight, rawWidth];
  }

  const exif: Exif = {
    camera: formatCamera(make, model),
    lens,
    focalLength: formatFocalLength(focalLengthMm, lens),
    focalLengthMm,
    focalLength35mm: asNumber(raw.FocalLengthIn35mmFormat),
    aperture: formatAperture(asNumber(raw.FNumber) ?? asNumber(raw.ApertureValue)),
    shutter: formatShutter(asNumber(raw.ExposureTime)),
    iso: asNumber(raw.ISO),
    exposureCompensation: formatExposureCompensation(asNumber(raw.ExposureCompensation)),
    whiteBalance: formatWhiteBalance(raw.WhiteBalance as number | string | undefined),
    meteringMode: formatMeteringMode(raw.MeteringMode as number | string | undefined),
    colorSpace: formatColorSpace(raw.ColorSpace as number | string | undefined),
    software: asString(raw.Software),
    artist: asString(raw.Artist),
    copyright: asString(raw.Copyright),
    dateTaken,
  };

  return { exif, rawWidth, rawHeight, takenAt: dateTaken };
}

/** `[24, 70, 2.8, 2.8]` → `24-70mm f/2.8` */
function describeLensInfo(info: unknown[]): string | null {
  const numbers = info.map((value) => asNumber(value));
  const [min, max, apertureMin, apertureMax] = numbers;
  if (min == null || max == null) return null;

  const range = min === max ? `${min}mm` : `${min}-${max}mm`;
  const fastest = apertureMin ?? apertureMax;
  return fastest ? `${range} f/${fastest}` : range;
}

/* -------------------------------------------------------------------------- */
/* Pixels                                                                      */
/* -------------------------------------------------------------------------- */

type PixelAnalysis = {
  /** Dimensions of the served file (derivative when one exists). */
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  blurDataUrl: string | null;
  dominantColor: string | null;
  derivative: Blob | null;
  derivativeExtension: string;
};

async function analysePixels(file: File): Promise<PixelAnalysis> {
  const bitmap = await decode(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  const placeholder = await renderPlaceholder(bitmap);
  const derivative = await renderDerivative(bitmap, file.type);

  // Free GPU/CPU memory promptly — batches can hold dozens of large bitmaps.
  bitmap.close?.();

  return {
    // The catalogue must describe the file it points at, not the upload.
    width: derivative.blob ? derivative.width : originalWidth,
    height: derivative.blob ? derivative.height : originalHeight,
    originalWidth,
    originalHeight,
    blurDataUrl: placeholder.blurDataUrl,
    dominantColor: placeholder.dominantColor,
    derivative: derivative.blob,
    derivativeExtension: derivative.extension,
  };
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari < 17 ignores the options bag; retry without it.
    return await createImageBitmap(file);
  }
}

function scaledSize(width: number, height: number, maxEdge: number): [number, number] {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return [canvas, context];
}

async function renderPlaceholder(
  bitmap: ImageBitmap,
): Promise<{ blurDataUrl: string | null; dominantColor: string | null }> {
  try {
    const [width, height] = scaledSize(bitmap.width, bitmap.height, PLACEHOLDER_EDGE);
    const [canvas, context] = makeCanvas(width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);

    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }

    const dominantColor =
      count > 0
        ? `#${[r / count, g / count, b / count]
            .map((channel) =>
              Math.round(channel).toString(16).padStart(2, "0"),
            )
            .join("")}`
        : null;

    return { blurDataUrl: canvas.toDataURL("image/jpeg", 0.55), dominantColor };
  } catch {
    return { blurDataUrl: null, dominantColor: null };
  }
}

async function renderDerivative(
  bitmap: ImageBitmap,
  sourceType: string,
): Promise<{ blob: Blob | null; extension: string; width: number; height: number }> {
  const [targetWidth, targetHeight] = scaledSize(bitmap.width, bitmap.height, DERIVATIVE_MAX_EDGE);
  const asIs = {
    blob: null,
    extension: extensionForType(sourceType),
    width: bitmap.width,
    height: bitmap.height,
  };

  // Already small enough and already a web format — reuse the original bytes.
  if (targetWidth === bitmap.width && targetHeight === bitmap.height && isWebFormat(sourceType)) {
    return asIs;
  }

  try {
    const [canvas, context] = makeCanvas(targetWidth, targetHeight);
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    // WebP first; fall back to JPEG. A very large source can exhaust the
    // encoder, and silently serving a multi-megabyte original instead is a far
    // worse outcome than a marginally larger JPEG derivative.
    const blob =
      (await toBlob(canvas, "image/webp", 0.86)) ?? (await toBlob(canvas, "image/jpeg", 0.88));

    if (!blob) return asIs;

    return {
      blob,
      extension: blob.type === "image/webp" ? "webp" : "jpg",
      width: targetWidth,
      height: targetHeight,
    };
  } catch {
    return asIs;
  }
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

function isWebFormat(type: string): boolean {
  return /image\/(webp|avif|jpeg|png)/.test(type.toLowerCase());
}

function extensionForType(type: string): string {
  const normalised = type.toLowerCase();
  if (normalised.includes("png")) return "png";
  if (normalised.includes("avif")) return "avif";
  if (normalised.includes("webp")) return "webp";
  if (normalised.includes("tiff")) return "tif";
  return "jpg";
}

function extensionFor(file: File): string {
  const match = file.name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : extensionForType(file.type);
}

/* -------------------------------------------------------------------------- */
/* Coercion helpers                                                            */
/* -------------------------------------------------------------------------- */

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}
