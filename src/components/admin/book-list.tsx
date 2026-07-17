"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Pencil,
  RefreshCw,
  RotateCw,
  Link2,
  QrCode,
  Download,
  Trash2,
  Search,
  X,
} from "lucide-react";
import type { BookStatus, BookVisibility } from "@/lib/supabase/types";

interface BookRow {
  id: string;
  title: string;
  slug: string;
  author: string | null;
  cover_url: string | null;
  status: BookStatus;
  visibility: BookVisibility;
  share_token: string | null;
  allow_share: boolean;
  allow_download: boolean;
  created_at: string;
  categories: string[];
  view_count: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const STATUS_LABEL: Record<BookStatus, string> = { draft: "초안", published: "공개", archived: "보관" };
const STATUS_COLOR: Record<BookStatus, string> = {
  draft: "bg-ink/5 text-ink/60",
  published: "bg-status-public/10 text-status-public",
  archived: "bg-amber-500/10 text-amber-700",
};
const VISIBILITY_LABEL: Record<BookVisibility, string> = { public: "공개", unlisted: "링크 전용", private: "비공개" };
const VISIBILITY_COLOR: Record<BookVisibility, string> = {
  public: "bg-status-public/10 text-status-public",
  unlisted: "bg-accent/10 text-accent",
  private: "bg-status-private/10 text-status-private",
};

export function BookList() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ url: string; dataUrl: string } | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      if (visibilityFilter) params.set("visibility", visibilityFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("sort", sort);

      const response = await fetch(`/api/admin/books?${params.toString()}`);
      const result = await response.json();
      if (response.ok) setBooks(result.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, visibilityFilter, categoryFilter, sort]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((r) => {
        if (r.ok) setCategories(r.data);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadBooks, 300);
    return () => clearTimeout(timer);
  }, [loadBooks]);

  async function patchBook(id: string, body: Record<string, string>) {
    setBusyId(id);
    setMessage(null);
    try {
      const formData = new FormData();
      Object.entries(body).forEach(([k, v]) => formData.append(k, v));
      const response = await fetch(`/api/admin/books/${id}`, { method: "PATCH", body: formData });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "작업에 실패했습니다.");
        return;
      }
      await loadBooks();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReconvert(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/books/${id}/reconvert`, { method: "POST" });
      const result = await response.json();
      setMessage(response.ok ? "재변환이 완료되었습니다." : (result.error ?? "재변환에 실패했습니다."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCopyLink(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/books/${id}/link`);
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "링크를 생성할 수 없습니다.");
        return;
      }
      await navigator.clipboard.writeText(result.url);
      setMessage("링크가 복사되었습니다.");
      await loadBooks();
    } finally {
      setBusyId(null);
    }
  }

  async function handleShowQr(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/books/${id}/link`);
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "링크를 생성할 수 없습니다.");
        return;
      }
      const dataUrl = await QRCode.toDataURL(result.url, { width: 240, margin: 1 });
      setQrModal({ url: result.url, dataUrl });
    } finally {
      setBusyId(null);
    }
  }

  async function handleRegenerateLink(id: string) {
    if (!confirm("공유 링크를 재생성하시겠습니까? 기존에 공유된 링크는 더 이상 열리지 않습니다.")) return;
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/books/${id}/link`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "링크를 재생성할 수 없습니다.");
        return;
      }
      await navigator.clipboard.writeText(result.url);
      setMessage("새 링크가 생성되어 복사되었습니다. 기존 링크는 더 이상 사용할 수 없습니다.");
      await loadBooks();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownload(id: string, title: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/books/${id}/download`);
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "다운로드할 수 없습니다.");
        return;
      }
      const a = document.createElement("a");
      a.href = result.url;
      a.download = `${title}.docx`;
      a.click();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}"을(를) 삭제하시겠습니까?`)) return;
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "삭제에 실패했습니다.");
        return;
      }
      await loadBooks();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목, 저자 검색"
            className="w-64 rounded-full border border-ink/10 bg-paper-card py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-ink/10 bg-paper-card px-3 py-2 text-sm"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-ink/10 bg-paper-card px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="draft">초안</option>
          <option value="published">공개</option>
          <option value="archived">보관</option>
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="rounded-full border border-ink/10 bg-paper-card px-3 py-2 text-sm"
        >
          <option value="">전체 공개범위</option>
          <option value="public">공개</option>
          <option value="unlisted">링크 전용</option>
          <option value="private">비공개</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-full border border-ink/10 bg-paper-card px-3 py-2 text-sm"
        >
          <option value="created_desc">최신순</option>
          <option value="created_asc">오래된순</option>
          <option value="title_asc">제목순</option>
          <option value="views_desc">조회수순</option>
        </select>
      </div>

      {message && (
        <div className="mt-3 rounded-xl border border-ink/10 bg-paper-card px-4 py-2 text-sm text-ink/70">{message}</div>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-paper-card">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink/60">도서를 불러오는 중입니다...</div>
        ) : books.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink/60">조건에 맞는 도서가 없습니다.</div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-ink/50">
                <th className="px-4 py-3 font-medium">표지</th>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">저자</th>
                <th className="px-4 py-3 font-medium">카테고리</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">등록일</th>
                <th className="px-4 py-3 font-medium">조회수</th>
                <th className="px-4 py-3 font-medium">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {books.map((book) => (
                <tr key={book.id} className={busyId === book.id ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.cover_url} alt="" className="h-14 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-14 w-10 rounded bg-ink/5" />
                    )}
                  </td>
                  <td className="max-w-[200px] px-4 py-3">
                    <div className="truncate font-medium text-ink">{book.title}</div>
                    <div className="truncate text-xs text-ink/40">{book.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink/70">{book.author ?? "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {book.categories.length === 0 ? (
                        <span className="text-xs text-ink/30">-</span>
                      ) : (
                        book.categories.map((c) => (
                          <span key={c} className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60">
                            {c}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <select
                        value={book.status}
                        disabled={busyId === book.id}
                        onChange={(e) => patchBook(book.id, { status: e.target.value })}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_COLOR[book.status]}`}
                      >
                        {(Object.keys(STATUS_LABEL) as BookStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={book.visibility}
                        disabled={busyId === book.id}
                        onChange={(e) => patchBook(book.id, { visibility: e.target.value })}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${VISIBILITY_COLOR[book.visibility]}`}
                      >
                        {(Object.keys(VISIBILITY_LABEL) as BookVisibility[]).map((v) => (
                          <option key={v} value={v}>
                            {VISIBILITY_LABEL[v]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/50">
                    {new Date(book.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{book.view_count.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/books/${book.id}/edit`}
                        title="수정"
                        className="rounded-md p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        title="재변환"
                        disabled={busyId === book.id}
                        onClick={() => handleReconvert(book.id)}
                        className="rounded-md p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                      <button
                        type="button"
                        title={book.allow_share ? "링크 복사" : "이 도서는 공유가 꺼져 있습니다"}
                        disabled={busyId === book.id || book.visibility === "private" || !book.allow_share}
                        onClick={() => handleCopyLink(book.id)}
                        className="rounded-md p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                      >
                        <Link2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        title={book.allow_share ? "QR 코드" : "이 도서는 공유가 꺼져 있습니다"}
                        disabled={busyId === book.id || book.visibility === "private" || !book.allow_share}
                        onClick={() => handleShowQr(book.id)}
                        className="rounded-md p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                      >
                        <QrCode className="size-4" />
                      </button>
                      {book.visibility === "unlisted" && (
                        <button
                          type="button"
                          title="공유 링크 재생성 (기존 링크는 무효화됩니다)"
                          disabled={busyId === book.id || !book.allow_share}
                          onClick={() => handleRegenerateLink(book.id)}
                          className="rounded-md p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink disabled:opacity-30"
                        >
                          <RotateCw className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="원본 다운로드"
                        disabled={busyId === book.id}
                        onClick={() => handleDownload(book.id, book.title)}
                        className="rounded-md p-1.5 text-ink/60 hover:bg-ink/5 hover:text-ink"
                      >
                        <Download className="size-4" />
                      </button>
                      <button
                        type="button"
                        title="삭제"
                        disabled={busyId === book.id}
                        onClick={() => handleDelete(book.id, book.title)}
                        className="rounded-md p-1.5 text-status-private/70 hover:bg-status-private/10 hover:text-status-private"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="relative w-full max-w-xs rounded-2xl bg-paper-card p-6 text-center">
            <button
              type="button"
              onClick={() => setQrModal(null)}
              className="absolute right-3 top-3 rounded-md p-1 text-ink/50 hover:bg-ink/5"
              aria-label="닫기"
            >
              <X className="size-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrModal.dataUrl} alt="공유 QR 코드" className="mx-auto" />
            <p className="mt-3 break-all text-xs text-ink/60">{qrModal.url}</p>
          </div>
        </div>
      )}
    </div>
  );
}
