// Mammoth style map (spec §10) — Word paragraph style names, English and
// Korean, mapped to semantic HTML. Mammoth layers this on top of its default
// style map (bold/italic/underline run formatting, default Heading 1-6),
// so we only need to list the paragraph styles the default map gets wrong
// or that the spec calls out explicitly.
export const DOCX_STYLE_MAP = [
  "p[style-name='Title'] => h1.book-title:fresh",
  "p[style-name='Heading 1'] => h2.chapter-title:fresh",
  "p[style-name='Heading 2'] => h3.section-title:fresh",
  "p[style-name='Heading 3'] => h4.subsection-title:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",

  // Korean style names — Word/한글(HWP)-derived templates are inconsistent
  // about whether there's a space between "제목" and the level number
  // (e.g. '제목 2' vs '제목2'), so both forms map to the same semantic tag.
  "p[style-name='제목'] => h1.book-title:fresh",
  "p[style-name='제목 1'] => h2.chapter-title:fresh",
  "p[style-name='제목1'] => h2.chapter-title:fresh",
  "p[style-name='제목 2'] => h3.section-title:fresh",
  "p[style-name='제목2'] => h3.section-title:fresh",
  "p[style-name='제목 3'] => h4.subsection-title:fresh",
  "p[style-name='제목3'] => h4.subsection-title:fresh",
  "p[style-name='인용'] => blockquote:fresh",
  "p[style-name='인용1'] => blockquote:fresh",
  "p[style-name='강조 인용'] => blockquote:fresh",

  // '기본' is a Word/한글 "Normal"-equivalent body style with no semantic
  // meaning beyond a plain paragraph — mapping it explicitly just silences
  // Mammoth's "unrecognised style" warning rather than changing output.
  "p[style-name='기본'] => p:fresh",
];
