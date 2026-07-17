import type { MetadataRoute } from "next";
import { createAnonSupabaseClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/books`, changeFrequency: "daily", priority: 0.8 },
  ];

  const supabase = createAnonSupabaseClient();
  if (!supabase) return staticEntries;

  // RLS ("Public books are readable") scopes this to status=published,
  // visibility=public — unlisted/private books must never appear in the
  // sitemap (spec §16 "unlisted 도서 noindex 처리").
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: books } = await (supabase as any).from("books").select("slug,updated_at");

  const bookEntries: MetadataRoute.Sitemap = (books ?? []).map((book: { slug: string; updated_at: string }) => ({
    url: `${siteUrl}/books/${book.slug}`,
    lastModified: book.updated_at,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...bookEntries];
}
