import Link from "next/link";
import type { Metadata } from "next";
import { BookList } from "@/components/admin/book-list";

export const metadata: Metadata = {
  title: "도서 관리",
};

export default function BooksPage() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink">도서 관리</h1>
        <Link
          href="/admin/books/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper"
        >
          + 새 도서 등록
        </Link>
      </div>

      <BookList />
    </div>
  );
}
