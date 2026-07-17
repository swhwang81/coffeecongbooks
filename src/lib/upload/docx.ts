// Shared client/server validation for the DOCX upload step (Phase 5).
// Mammoth.js (Phase 6) only understands .docx, so this is the one format
// actually supported end-to-end — see spec §18's "DOCX가 아닌 파일" error case.

export const MAX_DOCX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB, matches the book-originals bucket limit
export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocxValidationError = "extension" | "mime" | "size" | "empty";

export function validateDocxFile(file: { name: string; type: string; size: number }): DocxValidationError | null {
  if (file.size === 0) return "empty";
  if (file.size > MAX_DOCX_SIZE_BYTES) return "size";
  if (!file.name.toLowerCase().endsWith(".docx")) return "extension";
  // Some browsers/OSes report an empty MIME type for .docx; only reject when
  // a type IS present and it's wrong, so extension remains the source of truth.
  if (file.type && file.type !== DOCX_MIME_TYPE) return "mime";
  return null;
}

export const DOCX_VALIDATION_MESSAGES: Record<DocxValidationError, string> = {
  empty: "빈 파일은 업로드할 수 없습니다.",
  size: "파일 용량이 20MB를 초과했습니다.",
  extension: "DOCX 파일만 업로드할 수 있습니다.",
  mime: "DOCX 파일만 업로드할 수 있습니다.",
};
