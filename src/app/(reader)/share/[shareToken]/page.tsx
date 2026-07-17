import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Reader, type ReaderBookData } from "@/components/reader/reader";
import type { Block, TocEntry } from "@/lib/docx/blocks";
import { buildBookMetadata } from "@/lib/reader/book-metadata";

async function getBookByToken(token: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  // `get_book_by_share_token` is a SECURITY DEFINER function (migration
  // 008) — it's the only path to an `unlisted` book's row for the anon
  // key. It returns at most the one row whose token matches exactly, so
  // there's no way to enumerate unlisted books through it, unlike a plain
  // RLS policy scoped to `visibility = 'unlisted'` would allow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc("get_book_by_share_token", { p_token: token });

  return data?.[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ shareToken: string }> }): Promise<Metadata> {
  const { shareToken } = await params;
  const book = await getBookByToken(shareToken);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return buildBookMetadata({
    book,
    url: siteUrl ? `${siteUrl}/share/${shareToken}` : null,
    // Unlisted books opt out of search-engine indexing by design (spec §6)
    // — the share link itself is the only intended way in.
    indexable: false,
  });
}

export default async function SharedBookReaderPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  const book = await getBookByToken(shareToken);

  if (!book) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const bookData: ReaderBookData = {
    id: book.id,
    slug: book.slug,
    title: book.title,
    author: book.author,
    coverUrl: book.cover_url,
    blocks: (book.content_json as Block[] | null) ?? [],
    toc: (book.toc_json as TocEntry[] | null) ?? [],
    shareUrl: siteUrl ? `${siteUrl}/share/${shareToken}` : null,
    allowShare: book.allow_share ?? true,
  };

  return <Reader book={bookData} />;
}
