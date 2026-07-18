import * as cheerio from "cheerio";

// Allow-list per spec §10 "HTML 정제". Anything not listed here is either
// stripped entirely (dangerous containers) or unwrapped (harmless but
// unrecognized tags lose their wrapper, not their content).
const ALLOWED_TAGS = new Set([
  "article",
  "section",
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "span",
  "strong",
  "em",
  "u",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "br",
  "hr",
]);

// Removed with their contents — these are dangerous containers, not just
// unrecognized markup (spec §10 "제거").
const STRIP_ENTIRELY_TAGS = new Set(["script", "iframe", "object", "embed", "form", "input", "button", "style"]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height"],
  table: [],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
  // `class` on headings is the *only* way the Reader's heading-emphasis
  // styling (globals.css's .book-title/.chapter-title/.section-title/
  // .subsection-title rules) ever reaches real content — the style-map
  // (spec §10) is what assigns these, always one of exactly those four
  // literal values, never anything derived from the document itself, so
  // there's no injection surface here to worry about.
  h1: ["class"],
  h2: ["class"],
  h3: ["class"],
  h4: ["class"],
};

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith("javascript:")) return false;
  if (trimmed.startsWith("data:") && !trimmed.startsWith("data:image/")) return false;
  return true;
}

export interface SanitizeResult {
  html: string;
  removedTags: string[];
}

/**
 * Allow-list HTML sanitizer for Mammoth's conversion output (spec §10).
 * Not a general-purpose sanitizer — input is our own DOCX conversion
 * pipeline's output, not arbitrary user HTML, but we still strip anything
 * dangerous defensively since DOCX content itself is admin-supplied, not
 * fully trusted.
 */
export function sanitizeDocxHtml(html: string): SanitizeResult {
  const $ = cheerio.load(html, null, false);
  const removedTags = new Set<string>();

  // Strip dangerous containers (and their contents) first.
  STRIP_ENTIRELY_TAGS.forEach((tag) => {
    $(tag).each(() => {
      removedTags.add(tag);
    });
    $(tag).remove();
  });

  // Walk every remaining element depth-first (children before parents) so
  // unwrapping a parent doesn't invalidate child element references.
  const all = $("*").toArray();
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const el = all[i];
    if (el.type !== "tag") continue;
    const tagName = el.tagName.toLowerCase();
    const node = $(el);

    if (!ALLOWED_TAGS.has(tagName)) {
      removedTags.add(tagName);
      node.replaceWith(node.contents());
      continue;
    }

    const allowedAttrs = ALLOWED_ATTRS[tagName] ?? [];
    const attribs = { ...el.attribs };
    for (const attrName of Object.keys(attribs)) {
      if (!allowedAttrs.includes(attrName)) {
        node.removeAttr(attrName);
        continue;
      }
      const value = attribs[attrName];
      if ((attrName === "href" || attrName === "src") && !isSafeUrl(value)) {
        node.removeAttr(attrName);
      }
    }
  }

  return { html: $.root().html() ?? "", removedTags: Array.from(removedTags) };
}
