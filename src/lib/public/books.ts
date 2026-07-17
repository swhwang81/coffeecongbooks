import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PublicBookCardData } from "@/components/public/book-card";

export interface GetPublicBooksOptions {
  q?: string;
  categorySlug?: string;
  limit?: number;
}

/**
 * Published + public books only. Relies on the `books` RLS policy
 * ("status = 'published' and visibility = 'public'") via the anon-key
 * cookie-bound client — never the service-role client — so a bug here
 * can't leak draft/private/unlisted content (spec §9).
 */
export async function getPublicBooks({ q, categorySlug, limit }: GetPublicBooksOptions = {}): Promise<
  PublicBookCardData[]
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  let query = db
    .from("books")
    .select("id,slug,title,author,cover_url,created_at")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (q) {
    const escaped = q.replace(/[%,]/g, "");
    query = query.or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%`);
  }

  if (categorySlug && categorySlug !== "all") {
    const { data: category } = await db.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
    if (!category) return [];

    const { data: links } = await db.from("book_categories").select("book_id").eq("category_id", category.id);
    const ids = (links ?? []).map((l: { book_id: string }) => l.book_id);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  if (limit) query = query.limit(limit);

  const { data: books } = await query;
  const rows: Array<{ id: string; slug: string; title: string; author: string | null; cover_url: string | null; created_at: string }> =
    books ?? [];

  if (rows.length === 0) return [];

  const bookIds = rows.map((b) => b.id);
  const [{ data: categoryLinks }, { data: allCategories }] = await Promise.all([
    db.from("book_categories").select("book_id,category_id").in("book_id", bookIds),
    db.from("categories").select("id,name"),
  ]);

  const categoryNameById = new Map<string, string>(
    (allCategories ?? []).map((c: { id: string; name: string }) => [c.id, c.name])
  );
  const firstCategoryByBook = new Map<string, string>();
  for (const link of (categoryLinks ?? []) as { book_id: string; category_id: string }[]) {
    if (firstCategoryByBook.has(link.book_id)) continue;
    const name = categoryNameById.get(link.category_id);
    if (name) firstCategoryByBook.set(link.book_id, name);
  }

  return rows.map((book) => ({
    slug: book.slug,
    title: book.title,
    author: book.author,
    cover_url: book.cover_url,
    created_at: book.created_at,
    category: firstCategoryByBook.get(book.id) ?? null,
  }));
}
