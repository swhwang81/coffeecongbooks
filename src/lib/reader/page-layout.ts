// Shared between the real page render (reader.tsx) and the hidden
// measurement container (use-pagination.ts) so padding/line-height/footer
// space can never drift out of sync between what's measured and what's
// actually shown.
export const PAGE_PADDING_CLASS = "p-6 sm:p-8";
export const READER_CONTENT_CLASS = "reader-content flex-1 overflow-hidden";
export const PAGE_FOOTER_CLASS = "pt-2 text-center text-xs opacity-50";
