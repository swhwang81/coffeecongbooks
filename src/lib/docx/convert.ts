import mammoth from "mammoth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCX_STYLE_MAP } from "./style-map";
import { normalizeDocxStyles } from "./style-normalize";
import { createImageCollector, uploadDocxImages, resolveImagePlaceholders, type ExtractedImage } from "./images";
import { sanitizeDocxHtml } from "./sanitize";
import { buildBlocks, type Block, type TocEntry } from "./blocks";

export interface DocxConversionResult {
  html: string;
  blocks: Block[];
  toc: TocEntry[];
  warnings: string[];
}

export type DocxConversionErrorCode = "encrypted" | "corrupted" | "conversion_failed";

export class DocxConversionError extends Error {
  code: DocxConversionErrorCode;

  constructor(code: DocxConversionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DocxConversionError";
  }
}

const CONVERSION_ERROR_MESSAGES: Record<DocxConversionErrorCode, string> = {
  encrypted: "암호화되었거나 지원하지 않는 문서 형식입니다.",
  corrupted: "손상된 DOCX 파일입니다.",
  conversion_failed: "DOCX 변환에 실패했습니다.",
};

// Old .doc / encrypted .docx files are OLE Compound File Binary containers,
// not zips — mammoth (via JSZip) can't open either, but this signature lets
// us give a more specific error than a generic parse failure.
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function classifyConversionError(err: unknown): DocxConversionError {
  const message = err instanceof Error ? err.message : String(err);
  if (/central directory|zip|end of data/i.test(message)) {
    return new DocxConversionError("corrupted", CONVERSION_ERROR_MESSAGES.corrupted);
  }
  return new DocxConversionError("conversion_failed", CONVERSION_ERROR_MESSAGES.conversion_failed);
}

/**
 * Full DOCX → HTML pipeline (spec §10): Mammoth conversion with the
 * EN/KR style map, image extraction + Storage upload, allow-list HTML
 * sanitization, then block-ID assignment + block JSON + TOC generation.
 *
 * `supabase` must be a service-role client — image upload writes to the
 * public `book-assets` bucket and needs to bypass RLS.
 */
export async function convertDocxToBookContent(
  buffer: Buffer,
  bookId: string,
  supabase: SupabaseClient
): Promise<DocxConversionResult> {
  if (buffer.subarray(0, 8).equals(OLE_SIGNATURE)) {
    throw new DocxConversionError("encrypted", CONVERSION_ERROR_MESSAGES.encrypted);
  }

  const images: ExtractedImage[] = [];
  const warnings: string[] = [];

  let rawHtml: string;
  try {
    const result = await mammoth.convertToHtml(
      { buffer },
      { styleMap: DOCX_STYLE_MAP, convertImage: createImageCollector(images), transformDocument: normalizeDocxStyles }
    );
    rawHtml = result.value;
    warnings.push(...result.messages.filter((m) => m.type === "warning").map((m) => m.message));
  } catch (err) {
    throw classifyConversionError(err);
  }

  if (!rawHtml.trim()) {
    throw new DocxConversionError("conversion_failed", CONVERSION_ERROR_MESSAGES.conversion_failed);
  }

  const { urlByKey, dimensionsByKey, warnings: uploadWarnings } = await uploadDocxImages(supabase, bookId, images);
  warnings.push(...uploadWarnings);

  const htmlWithImageUrls = resolveImagePlaceholders(rawHtml, urlByKey, dimensionsByKey);
  const { html: sanitizedHtml, removedTags } = sanitizeDocxHtml(htmlWithImageUrls);
  if (removedTags.length > 0) {
    warnings.push(`허용되지 않는 태그를 제거했습니다: ${removedTags.join(", ")}`);
  }

  const { html, blocks, toc } = buildBlocks(sanitizedHtml);

  return { html, blocks, toc, warnings };
}
