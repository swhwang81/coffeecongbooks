import mammoth from "mammoth";
import sharp from "sharp";
import * as cheerio from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExtractedImage {
  key: string; // "image-001"
  buffer: Buffer;
  contentType: string;
}

const PLACEHOLDER_PREFIX = "docx-image://";

/** Mammoth image handler: buffers each embedded image and swaps in a placeholder src. */
export function createImageCollector(images: ExtractedImage[]) {
  let counter = 0;
  return mammoth.images.imgElement(async (image) => {
    counter += 1;
    const key = `image-${String(counter).padStart(3, "0")}`;
    const buffer = await image.readAsBuffer();
    images.push({ key, buffer, contentType: image.contentType });
    return { src: `${PLACEHOLDER_PREFIX}${key}` };
  });
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/webp": "webp",
};

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface UploadImagesResult {
  urlByKey: Map<string, string>;
  /** Intrinsic pixel size of the uploaded (post-conversion) image, so the
   * Reader's pagination (Phase 11) can reserve correct space before the
   * image has actually loaded, instead of reflowing once it does. */
  dimensionsByKey: Map<string, ImageDimensions>;
  warnings: string[];
}

/**
 * Uploads extracted images to `book-assets/{bookId}/{key}.<ext>` (spec §8
 * recommended path), converting to WebP where possible. Legacy formats
 * sharp can't decode (e.g. EMF/WMF, occasionally embedded by old Office
 * docs) fall back to their original bytes rather than failing the whole
 * conversion.
 */
export async function uploadDocxImages(
  supabase: SupabaseClient,
  bookId: string,
  images: ExtractedImage[]
): Promise<UploadImagesResult> {
  const urlByKey = new Map<string, string>();
  const dimensionsByKey = new Map<string, ImageDimensions>();
  const warnings: string[] = [];

  for (const image of images) {
    let outBuffer = image.buffer;
    let ext = "webp";
    let contentType = "image/webp";

    try {
      outBuffer = await sharp(image.buffer).webp({ quality: 82 }).toBuffer();
    } catch {
      ext = EXTENSION_BY_MIME[image.contentType] ?? "bin";
      contentType = image.contentType || "application/octet-stream";
      outBuffer = image.buffer;
    }

    try {
      const metadata = await sharp(outBuffer).metadata();
      if (metadata.width && metadata.height) {
        dimensionsByKey.set(image.key, { width: metadata.width, height: metadata.height });
      }
    } catch {
      // Dimensions are a pagination nicety, not required for the image to display.
    }

    const path = `${bookId}/${image.key}.${ext}`;
    const { error } = await supabase.storage.from("book-assets").upload(path, outBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      warnings.push(`이미지 ${image.key} 업로드 실패: ${error.message}`);
      continue;
    }

    const { data } = supabase.storage.from("book-assets").getPublicUrl(path);
    urlByKey.set(image.key, data.publicUrl);
  }

  return { urlByKey, dimensionsByKey, warnings };
}

/**
 * Replaces `docx-image://{key}` placeholders with their uploaded URLs and
 * stamps `width`/`height` attributes when known, so the Reader's
 * pagination (Phase 11) can reserve correct space before the image loads.
 */
export function resolveImagePlaceholders(
  html: string,
  urlByKey: Map<string, string>,
  dimensionsByKey: Map<string, ImageDimensions>
): string {
  const $ = cheerio.load(html, null, false);

  $("img").each((_, el) => {
    const img = $(el);
    const src = img.attr("src") ?? "";
    const match = /^docx-image:\/\/(image-\d+)$/.exec(src);
    if (!match) return;

    const key = match[1];
    const url = urlByKey.get(key);
    if (url) img.attr("src", url);

    const dimensions = dimensionsByKey.get(key);
    if (dimensions) {
      img.attr("width", String(dimensions.width));
      img.attr("height", String(dimensions.height));
    }
  });

  return $.root().html() ?? html;
}
