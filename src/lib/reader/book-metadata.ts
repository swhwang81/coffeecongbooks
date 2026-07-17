import type { Metadata } from "next";

export interface BookMetaSource {
  title: string;
  summary: string | null;
  cover_url: string | null;
  author: string | null;
}

const DEFAULT_DESCRIPTION = "Coffeecong Books에서 읽는 반응형 Ebook.";

/**
 * Shared OG/Twitter/canonical metadata builder for both public book routes
 * (`/books/[slug]`, `/share/[shareToken]`) — spec §16. `indexable` controls
 * `robots`: `/share/[shareToken]` always passes `false` (unlisted books opt
 * out of search-engine indexing by design, spec §6), `/books/[slug]` passes
 * `true` (RLS already scopes that route to `published + public` books).
 */
export function buildBookMetadata({
  book,
  url,
  indexable,
}: {
  book: BookMetaSource | null;
  url: string | null;
  indexable: boolean;
}): Metadata {
  if (!book) {
    return { title: "도서를 찾을 수 없습니다", robots: { index: false, follow: false } };
  }

  const description = book.summary?.trim() || DEFAULT_DESCRIPTION;
  const images = book.cover_url ? [book.cover_url] : undefined;

  return {
    title: book.title,
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "book",
      title: book.title,
      description,
      url: url ?? undefined,
      siteName: "Coffeecong Books",
      images,
      authors: book.author ? [book.author] : undefined,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: book.title,
      description,
      images,
    },
  };
}
