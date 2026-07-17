import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutGrid,
  BookOpen,
  Feather,
  Briefcase,
  Sprout,
  Landmark,
  FlaskConical,
  Palette,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import heroImage from "@/../images/coffeecong_books_hero-removebg-preview.png";
import { BookCard } from "@/components/public/book-card";
import { getPublicBooks } from "@/lib/public/books";
import { getPublicCategories } from "@/lib/public/categories";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  novel: BookOpen,
  essay: Feather,
  business: Briefcase,
  "self-development": Sprout,
  history: Landmark,
  science: FlaskConical,
  design: Palette,
  etc: MoreHorizontal,
};

export default async function HomePage() {
  const [latestBooks, categories] = await Promise.all([getPublicBooks({ limit: 5 }), getPublicCategories()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-ink/10 bg-paper-card px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
        {/*
          Decorative on every size, so it's purely a visual layer behind the
          copy — not competing with it for a11y or reading order — but
          scaled/positioned very differently per breakpoint: on mobile it's
          a large, faint watermark sitting *behind* the text (the phone
          layout has no room for a true side-by-side image); from `sm` up
          it becomes a real illustration that intentionally overlaps the
          text column's right edge instead of sitting in its own separated
          grid column.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-[38%] h-[85%] -translate-y-1/2 sm:top-1/2 sm:-right-6 sm:h-[80%] lg:-right-4 lg:h-[88%]"
        >
          <Image
            src={heroImage}
            alt=""
            priority
            className="h-full w-auto object-contain"
            sizes="420px"
          />
        </div>

        <div className="relative z-10 max-w-xl sm:max-w-[46%]">
          <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
            <span className="hero-block" style={{ "--hero-delay": "0ms" } as CSSProperties}>
              내 생각을
            </span>{" "}
            <span className="hero-block" style={{ "--hero-delay": "300ms" } as CSSProperties}>
              책으로,
            </span>
            <br />
            <span className="hero-block" style={{ "--hero-delay": "600ms" } as CSSProperties}>
              세상과
            </span>{" "}
            <span className="hero-block" style={{ "--hero-delay": "900ms" } as CSSProperties}>
              나누다.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-ink/70 sm:text-base">
            Word 문서를 반응형 Ebook으로 변환하고,
            <br />
            링크 하나로 언제 어디서나 공유하세요.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/books"
              className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink-light sm:px-6"
            >
              도서 둘러보기
            </Link>
            <Link
              href="/admin/books/new"
              className="rounded-full border border-ink/20 bg-paper-card px-5 py-3 text-sm font-medium text-ink hover:bg-ink/5 sm:px-6"
            >
              도서 등록하기
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-ink">최신 등록 도서</h2>
          <Link href="/books" className="text-sm text-accent hover:underline">
            더보기
          </Link>
        </div>
        {latestBooks.length === 0 ? (
          <p className="mt-6 text-sm text-ink/50">아직 등록된 도서가 없습니다.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {latestBooks.map((book) => (
              <li key={book.slug}>
                <BookCard book={book} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold text-ink">카테고리</h2>
        <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
          <li>
            <Link
              href="/books"
              className="flex flex-col items-center gap-2 rounded-2xl border border-ink/10 bg-paper-card py-5 text-ink/80 hover:border-accent hover:text-accent"
            >
              <LayoutGrid className="size-5" aria-hidden="true" />
              <span className="text-xs">전체</span>
            </Link>
          </li>
          {categories.map((category) => {
            const Icon = CATEGORY_ICON[category.slug] ?? MoreHorizontal;
            return (
              <li key={category.id}>
                <Link
                  href={`/books?category=${encodeURIComponent(category.slug)}`}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-ink/10 bg-paper-card py-5 text-ink/80 hover:border-accent hover:text-accent"
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="text-xs">{category.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
