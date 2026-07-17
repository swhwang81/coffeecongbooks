// Shared client/server validation for cover image uploads (Phase 7).

export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches the book-covers bucket limit
export const COVER_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const COVER_ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export type CoverValidationError = "extension" | "mime" | "size" | "empty";

export function validateCoverFile(file: { name: string; type: string; size: number }): CoverValidationError | null {
  if (file.size === 0) return "empty";
  if (file.size > MAX_COVER_SIZE_BYTES) return "size";
  if (!COVER_ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) return "extension";
  if (file.type && !COVER_ALLOWED_MIME_TYPES.includes(file.type)) return "mime";
  return null;
}

export const COVER_VALIDATION_MESSAGES: Record<CoverValidationError, string> = {
  empty: "빈 파일은 업로드할 수 없습니다.",
  size: "표지 이미지 용량이 5MB를 초과했습니다.",
  extension: "PNG, JPG, WEBP 이미지만 업로드할 수 있습니다.",
  mime: "PNG, JPG, WEBP 이미지만 업로드할 수 있습니다.",
};
