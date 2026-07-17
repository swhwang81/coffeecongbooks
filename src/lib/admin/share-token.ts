import { randomBytes } from "node:crypto";

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Random base62 token for `books.share_token` (unlisted-book links) —
 * URL-safe with no padding/separator characters to escape. */
export function generateShareToken(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => BASE62[b % BASE62.length]).join("");
}
