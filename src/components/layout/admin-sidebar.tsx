"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import type { AdminRole } from "@/lib/supabase/types";
import {
  LayoutDashboard,
  Library,
  FilePlus2,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  BookOpen,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, minRole: "editor" as const, exact: true },
  { href: "/admin/books", label: "도서 관리", icon: Library, minRole: "editor" as const, exact: false },
  { href: "/admin/books/new", label: "새 도서 등록", icon: FilePlus2, minRole: "editor" as const, exact: true },
  { href: "/admin/categories", label: "카테고리 관리", icon: FolderKanban, minRole: "editor" as const, exact: false },
  { href: "/admin/users", label: "사용자 관리", icon: Users, minRole: "admin" as const, exact: false },
  { href: "/admin/settings", label: "설정", icon: Settings, minRole: "admin" as const, exact: false },
];

const ROLE_ORDER: AdminRole[] = ["editor", "admin", "super_admin"];

export function AdminSidebar({ role, onNavigate }: { role: AdminRole; onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut(e: React.MouseEvent) {
    e.preventDefault();
    await signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-ink text-paper">
      <Link
        href="/"
        title="메인 홈페이지로 이동"
        className="flex h-16 items-center gap-2 px-6 font-semibold hover:bg-paper/5"
      >
        <BookOpen className="size-6 text-accent" aria-hidden="true" />
        <span>Coffeecong Books Admin</span>
      </Link>

      <nav aria-label="관리자 메뉴" className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.filter((item) => ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(item.minRole)).map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-accent text-paper" : "text-paper/80 hover:bg-paper/10 hover:text-paper"
              }`}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6">
        <a
          href="#signout"
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-paper/80 hover:bg-paper/10 hover:text-paper"
        >
          <LogOut className="size-4" aria-hidden="true" />
          로그아웃
        </a>
      </div>
    </div>
  );
}
