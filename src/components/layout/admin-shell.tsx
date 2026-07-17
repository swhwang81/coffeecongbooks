"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, BookOpen } from "lucide-react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import type { AdminRole } from "@/lib/supabase/types";

export function AdminShell({
  role,
  children,
}: {
  role: AdminRole;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      {/* Desktop: fixed navy sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar role={role} />
      </div>

      {/* Mobile: condensed top bar with a drawer toggle */}
      <div className="flex h-14 shrink-0 items-center justify-between bg-ink px-4 text-paper lg:hidden">
        <Link href="/" title="메인 홈페이지로 이동" className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-5 text-accent" aria-hidden="true" />
          <span className="text-sm">Coffeecong Books Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={drawerOpen}
          className="rounded-md p-2 hover:bg-paper/10"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/50"
          />
          <div className="relative flex h-full">
            <AdminSidebar role={role} onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="메뉴 닫기"
              className="absolute right-3 top-4 rounded-md p-1 text-paper/80 hover:bg-paper/10 hover:text-paper"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden bg-paper px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
