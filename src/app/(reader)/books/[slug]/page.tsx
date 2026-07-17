import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Reader, type ReaderBookData } from "@/components/reader/reader";
import type { Block, TocEntry } from "@/lib/docx/blocks";
import { buildBookMetadata } from "@/lib/reader/book-metadata";

async function getBook(slug: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  // RLS ("Public books are readable") scopes this to status=published,
  // visibility=public — never widen with a service-role client here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("books")
    .select("id,slug,title,author,summary,cover_url,content_json,toc_json,allow_share")
    .eq("slug", slug)
    .maybeSingle();

  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return buildBookMetadata({
    book,
    url: siteUrl ? `${siteUrl}/books/${slug}` : null,
    // RLS already scopes `getBook` to published+public — every book that
    // resolves here is meant to be discoverable.
    indexable: true,
  });
}

export default async function BookReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBook(slug);

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
    shareUrl: siteUrl ? `${siteUrl}/books/${book.slug}` : null,
    allowShare: book.allow_share ?? true,
  };

  return <Reader book={bookData} />;
}
