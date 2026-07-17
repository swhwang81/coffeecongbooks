import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";

export interface PublicBookCardData {
  slug: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  created_at: string;
  category: string | null;
}

// A small fixed palette of literal Tailwind classes (not string-built —
// Tailwind's compiler only picks up class names it can see verbatim in
// source) cycled by a hash of the category name, so each category reads as
// its own color without needing a category->color mapping in the DB.
const CATEGORY_PALETTE = [
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-violet-50 text-violet-700",
  "bg-cyan-50 text-cyan-700",
  "bg-orange-50 text-orange-700",
  "bg-lime-50 text-lime-700",
];

function categoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

export function BookCard({ book }: { book: PublicBookCardData }) {
  return (
    <Link
      href={`/books/${book.slug}`}
      className="group block overflow-hidden rounded-2xl bg-paper-card shadow-sm ring-1 ring-ink/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-linear-to-br from-paper-warm to-accent/10">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 767px) 48vw, (max-width: 1023px) 32vw, (max-width: 1279px) 24vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="size-10 text-ink/15" aria-hidden="true" strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="p-2.5 sm:p-3.5">
        <p className="line-clamp-1 text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-accent sm:text-[15px]">
          {book.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink/55 sm:text-sm">{book.author ?? "저자 미상"}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mt-2">
          {book.category && (
            <span
              className={`inline-block truncate rounded-full px-2 py-0.5 text-[11px] font-medium sm:px-2.5 sm:py-1 sm:text-xs ${categoryColor(book.category)}`}
            >
              {book.category}
            </span>
          )}
          <span className="shrink-0 text-[11px] text-ink/40 sm:text-xs">{new Date(book.created_at).toLocaleDateString("ko-KR")}</span>
        </div>
      </div>
    </Link>
  );
}
