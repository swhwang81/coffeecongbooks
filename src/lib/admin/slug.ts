/** Slugifies a title for `books.slug` — Korean/ASCII alphanumerics kept,
 * everything else collapsed to a single hyphen, trimmed of leading/trailing
 * hyphens. Falls back to a timestamp-based slug for titles with no
 * slug-safe characters at all (e.g. pure emoji/punctuation titles). */
export function buildSlug(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^가-힣a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || `book-${Date.now()}`;
}
