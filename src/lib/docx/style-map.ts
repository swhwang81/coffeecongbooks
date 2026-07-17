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

  "p[style-name='제목'] => h1.book-title:fresh",
  "p[style-name='제목 1'] => h2.chapter-title:fresh",
  "p[style-name='제목 2'] => h3.section-title:fresh",
  "p[style-name='제목 3'] => h4.subsection-title:fresh",
  "p[style-name='인용'] => blockquote:fresh",
  "p[style-name='강조 인용'] => blockquote:fresh",
];
