import Link from "next/link";
import { BookOpen, Search, User } from "lucide-react";
import { getAdminSession } from "@/lib/auth/server";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/books", label: "도서관" },
  { href: "/books?category=all", label: "카테고리" },
];

export async function PublicHeader() {
  // Server-verified, same as every other admin check in this app (spec §9)
  // — never inferred from a client-side flag. Signed-out visitors just see
  // a plain login button; nothing here decides access, it only decides
  // what the header displays.
  const session = await getAdminSession();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <BookOpen className="size-6 text-accent" aria-hidden="true" />
          <span>Coffeecong Books</span>
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-5 text-sm text-ink/80 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <form action="/books" method="GET" className="relative hidden sm:block">
            <label>
              <span className="sr-only">도서 제목, 저자 검색</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40"
                aria-hidden="true"
              />
              <input
                type="search"
                name="q"
                placeholder="도서 제목, 저자 검색"
                className="w-56 rounded-full border border-ink/15 bg-paper-card py-2 pl-9 pr-4 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
          </form>

          {session ? (
            <Link
              href="/admin"
              title="관리자 페이지로 이동"
              className="flex max-w-[160px] items-center gap-2 rounded-full bg-ink/10 py-1.5 pl-1.5 pr-3 text-sm font-medium text-ink hover:bg-ink/15"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <User className="size-3.5" aria-hidden="true" />
              </span>
              <span className="truncate">{session.user.email}</span>
            </Link>
          ) : (
            <Link
              href="/admin/login"
              aria-label="로그인"
              title="로그인"
              className="flex size-9 items-center justify-center rounded-full bg-ink/10 text-ink hover:bg-ink/15"
            >
              <User className="size-5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
