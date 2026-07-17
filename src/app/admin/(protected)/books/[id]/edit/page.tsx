import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookForm, type BookFormInitial } from "@/components/admin/book-form";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "도서 수정",
};

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) notFound();

  const [{ data: book }, { data: bookCategories }, { data: bookTags }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("books").select("*").eq("id", id).maybeSingle(),
    supabase.from("book_categories").select("category_id").eq("book_id", id),
    supabase.from("book_tags").select("tag_id").eq("book_id", id),
  ]);

  if (!book) notFound();

  const initial: BookFormInitial = {
    id: book.id,
    title: book.title,
    author: book.author,
    summary: book.summary,
    slug: book.slug,
    status: book.status,
    visibility: book.visibility,
    allow_share: book.allow_share ?? true,
    allow_download: book.allow_download ?? true,
    published_at: book.published_at,
    cover_url: book.cover_url,
    content_html: book.content_html,
    category_ids: (bookCategories ?? []).map((c: { category_id: string }) => c.category_id),
    tag_ids: (bookTags ?? []).map((t: { tag_id: string }) => t.tag_id),
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">도서 수정</h1>
      <BookForm mode="edit" initial={initial} />
    </div>
  );
}
