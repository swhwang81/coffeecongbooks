import type { Metadata } from "next";
import { BookForm } from "@/components/admin/book-form";

export const metadata: Metadata = {
  title: "새 도서 등록",
};

export default function NewBookPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">새 도서 등록</h1>
      <BookForm mode="create" />
    </div>
  );
}
