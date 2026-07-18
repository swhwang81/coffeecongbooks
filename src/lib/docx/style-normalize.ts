// Word appends a numeric suffix ("인용1", "인용2", "제목3", ...) whenever a
// style name collides with one already in the document — routine when
// content gets copied/merged in from another DOCX, and effectively
// unbounded (there's no cap on how high the suffix can go). Enumerating
// every observed variant in the style map (spec §10) doesn't scale — this
// normalizes the paragraph's style name *before* the style map ever sees
// it, so any numbered variant of a known base name resolves the same way
// its un-suffixed form already does.
const QUOTE_STYLE_PATTERN = /^(강조\s*인용|인용)\s*\d*$/;
const NORMAL_STYLE_PATTERN = /^기본\s*\d*$/;
// "제목" (no digit) is the book-title style (spec §10) — a distinct,
// deliberately separate mapping from "제목 N" (chapter/section headings),
// so this pattern requires at least one digit to avoid colliding with it.
// Levels beyond 3 collapse to the deepest heading tag we map to (h4).
const HEADING_STYLE_PATTERN = /^제목\s*(\d+)$/;

export function normalizeDocxStyleName(name: string): string {
  if (QUOTE_STYLE_PATTERN.test(name)) {
    return name.startsWith("강조") ? "강조 인용" : "인용";
  }
  if (NORMAL_STYLE_PATTERN.test(name)) {
    return "기본";
  }
  const headingMatch = HEADING_STYLE_PATTERN.exec(name);
  if (headingMatch) {
    const level = Math.min(Number(headingMatch[1]), 3);
    return `제목 ${level}`;
  }
  return name;
}

// Walks the document tree exactly as mammoth's own `transforms.paragraph`
// helper does (see its README) — reimplemented directly rather than calling
// that helper because it isn't in mammoth's shipped `.d.ts` (only the
// generic `transformDocument?: (element: any) => any` option is), even
// though it exists at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mammoth's own document-transform API is untyped (its README calls the shape "unstable")
export function normalizeDocxStyles(element: any): any {
  if (element.children) {
    element = { ...element, children: element.children.map(normalizeDocxStyles) };
  }
  if (element.type === "paragraph" && element.styleName) {
    const normalized = normalizeDocxStyleName(element.styleName);
    if (normalized !== element.styleName) {
      element = { ...element, styleName: normalized };
    }
  }
  return element;
}
