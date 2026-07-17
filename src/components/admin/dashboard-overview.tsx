"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ViewsChart, type ViewsChartPoint } from "@/components/admin/views-chart";
import type { DashboardBookRow, DashboardViewRow } from "@/lib/dashboard/data";

const PERIODS = [
  { days: 7, label: "최근 7일" },
  { days: 30, label: "최근 30일" },
  { days: 90, label: "최근 90일" },
] as const;

function formatDate(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

function formatRelativeTime(isoString: string): string {
  const diffMs = new Date(isoString).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) return RELATIVE_TIME_FORMATTER.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return RELATIVE_TIME_FORMATTER.format(diffHours, "hour");
  return RELATIVE_TIME_FORMATTER.format(Math.round(diffHours / 24), "day");
}

function buildDailySeries(views: DashboardViewRow[], days: number): ViewsChartPoint[] {
  const counts = new Map<string, number>();
  for (const v of views) {
    const day = v.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const series: ViewsChartPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDay(d);
    series.push({ date: formatDate(d), isoDate: key, count: counts.get(key) ?? 0 });
  }

  return series;
}

const STATUS_LABEL: Record<string, string> = { draft: "초안", published: "공개", archived: "보관" };
const VISIBILITY_LABEL: Record<string, string> = { public: "공개", unlisted: "링크 전용", private: "비공개" };

export function DashboardOverview({
  books,
  views,
  totalViews,
  recentBooks,
}: {
  books: DashboardBookRow[];
  views: DashboardViewRow[];
  totalViews: number;
  recentBooks: DashboardBookRow[];
}) {
  const [periodDays, setPeriodDays] = useState<(typeof PERIODS)[number]["days"]>(7);
  const periodLabel = PERIODS.find((p) => p.days === periodDays)?.label ?? "";

  const { stats, chartData, popularBooks, recentViews } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);

    const isNew = (createdAt: string) => new Date(createdAt) >= cutoff;
    const isPublic = (b: DashboardBookRow) => b.status === "published" && b.visibility === "public";
    const isUnlisted = (b: DashboardBookRow) => b.visibility === "unlisted";

    const totalBooks = books.length;
    const publicBooks = books.filter(isPublic).length;
    const unlistedBooks = books.filter(isUnlisted).length;

    const newBooks = books.filter((b) => isNew(b.created_at)).length;
    const newPublicBooks = books.filter((b) => isPublic(b) && isNew(b.created_at)).length;
    const newUnlistedBooks = books.filter((b) => isUnlisted(b) && isNew(b.created_at)).length;
    const periodViews = views.filter((v) => isNew(v.created_at));

    const bookById = new Map(books.map((b) => [b.id, b]));

    // 인기 도서 (spec §17) — view count within the selected period, ranked.
    const viewCountByBook = new Map<string, number>();
    for (const v of periodViews) {
      viewCountByBook.set(v.book_id, (viewCountByBook.get(v.book_id) ?? 0) + 1);
    }
    const popularBooks = Array.from(viewCountByBook.entries())
      .map(([bookId, count]) => ({ book: bookById.get(bookId), count }))
      .filter((entry): entry is { book: DashboardBookRow; count: number } => Boolean(entry.book))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 최근 조회 (spec §17) — most recent view events, independent of the period filter.
    const recentViews = views
      .slice(0, 8)
      .map((v) => ({ book: bookById.get(v.book_id), viewedAt: v.created_at }))
      .filter((entry): entry is { book: DashboardBookRow; viewedAt: string } => Boolean(entry.book));

    return {
      stats: [
        { label: "총 도서 수", value: totalBooks, delta: newBooks },
        { label: "공개 도서 수", value: publicBooks, delta: newPublicBooks },
        { label: "링크 전용 도서 수", value: unlistedBooks, delta: newUnlistedBooks },
        { label: "총 조회 수", value: totalViews, delta: periodViews.length },
      ],
      chartData: buildDailySeries(views, periodDays),
      popularBooks,
      recentViews,
    };
  }, [books, views, totalViews, periodDays]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">대시보드</h1>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          기간
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value) as (typeof PERIODS)[number]["days"])}
            className="rounded-lg border border-ink/10 bg-paper-card px-3 py-1.5 text-sm text-ink"
          >
            {PERIODS.map((p) => (
              <option key={p.days} value={p.days}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ink/10 bg-paper-card p-5">
            <dt className="text-sm text-ink/60">{stat.label}</dt>
            <dd className="mt-2 text-3xl font-semibold text-ink">{stat.value.toLocaleString()}</dd>
            <div className="mt-1 text-xs text-status-public">
              +{stat.delta.toLocaleString()} {periodLabel}
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">조회수 통계</h2>
          <span className="text-xs text-ink/50">{periodLabel}</span>
        </div>
        <div className="mt-4">
          <ViewsChart data={chartData} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-paper-card">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
          <h2 className="text-sm font-semibold text-ink">최근 등록 도서</h2>
          <Link href="/admin/books" className="text-xs font-medium text-accent hover:underline">
            전체 보기
          </Link>
        </div>
        <div className="divide-y divide-ink/10">
          {recentBooks.length === 0 ? (
            <div className="px-6 py-6 text-sm text-ink/60">아직 등록된 도서가 없습니다.</div>
          ) : (
            recentBooks.map((book) => (
              <div key={book.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{book.title}</div>
                  <div className="mt-1 text-xs text-ink/50">
                    {new Date(book.created_at).toLocaleDateString("ko-KR")}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      book.status === "published" ? "bg-status-public/10 text-status-public" : "bg-ink/5 text-ink/60"
                    }`}
                  >
                    {STATUS_LABEL[book.status] ?? book.status}
                  </span>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                    {VISIBILITY_LABEL[book.visibility] ?? book.visibility}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper-card">
          <div className="border-b border-ink/10 px-6 py-4">
            <h2 className="text-sm font-semibold text-ink">인기 도서</h2>
            <span className="text-xs text-ink/50">{periodLabel} 조회 수 기준</span>
          </div>
          <div className="divide-y divide-ink/10">
            {popularBooks.length === 0 ? (
              <div className="px-6 py-6 text-sm text-ink/60">해당 기간에 조회 기록이 없습니다.</div>
            ) : (
              popularBooks.map(({ book, count }, i) => (
                <div key={book.id} className="flex items-center gap-3 px-6 py-3">
                  <span className="w-4 shrink-0 text-xs font-semibold text-ink/40">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{book.title}</div>
                  </div>
                  <span className="shrink-0 text-xs text-ink/60">{count.toLocaleString()}회</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper-card">
          <div className="border-b border-ink/10 px-6 py-4">
            <h2 className="text-sm font-semibold text-ink">최근 조회</h2>
          </div>
          <div className="divide-y divide-ink/10">
            {recentViews.length === 0 ? (
              <div className="px-6 py-6 text-sm text-ink/60">아직 조회 기록이 없습니다.</div>
            ) : (
              recentViews.map(({ book, viewedAt }, i) => (
                <div key={`${book.id}-${viewedAt}-${i}`} className="flex items-center justify-between gap-4 px-6 py-3">
                  <div className="min-w-0 truncate text-sm text-ink">{book.title}</div>
                  <span className="shrink-0 text-xs text-ink/50">{formatRelativeTime(viewedAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
