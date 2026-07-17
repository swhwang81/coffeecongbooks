import Link from "next/link";
import type { Metadata } from "next";
import { BookCard } from "@/components/public/book-card";
import { getPublicBooks } from "@/lib/public/books";
import { getPublicCategories } from "@/lib/public/categories";

export const metadata: Metadata = {
  title: "도서관",
};

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const [books, categories] = await Promise.all([
    getPublicBooks({ q, categorySlug: category }),
    getPublicCategories(),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink">도서관</h1>

      <form action="/books" method="GET" className="mt-6 flex flex-wrap gap-3">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="도서 제목, 저자 검색"
          className="w-full max-w-xs rounded-full border border-ink/15 bg-paper-card px-4 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-ink-light"
        >
          검색
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={q ? `/books?q=${encodeURIComponent(q)}` : "/books"}
          className={`rounded-full px-4 py-1.5 text-sm ${
            !activeCategory ? "bg-ink text-paper" : "border border-ink/15 text-ink/70 hover:bg-ink/5"
          }`}
        >
          전체
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/books?category=${encodeURIComponent(c.slug)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              activeCategory?.id === c.id ? "bg-ink text-paper" : "border border-ink/15 text-ink/70 hover:bg-ink/5"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-ink/50">총 {books.length}권</p>

      {books.length === 0 ? (
        <p className="mt-6 text-sm text-ink/50">조건에 맞는 도서가 없습니다.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {books.map((book) => (
            <li key={book.slug}>
              <BookCard book={book} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
