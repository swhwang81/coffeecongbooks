"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { validateDocxFile, DOCX_VALIDATION_MESSAGES, MAX_DOCX_SIZE_BYTES } from "@/lib/upload/docx";
import { validateCoverFile, COVER_VALIDATION_MESSAGES, MAX_COVER_SIZE_BYTES } from "@/lib/upload/image";
import { uploadWithProgress, formatBytes } from "@/lib/upload/xhr-upload";
import type { BookStatus, BookVisibility } from "@/lib/supabase/types";

interface Taxonomy {
  id: string;
  name: string;
  slug: string;
}

export interface BookFormInitial {
  id: string;
  title: string;
  author: string | null;
  summary: string | null;
  slug: string;
  status: BookStatus;
  visibility: BookVisibility;
  allow_share: boolean;
  allow_download: boolean;
  published_at: string | null;
  cover_url: string | null;
  content_html: string | null;
  category_ids: string[];
  tag_ids: string[];
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookForm({ mode, initial }: { mode: "create" | "edit"; initial?: BookFormInitial }) {
  const router = useRouter();
  const [bookId] = useState(() => initial?.id ?? crypto.randomUUID());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [status, setStatus] = useState<BookStatus>(initial?.status ?? "draft");
  const [visibility, setVisibility] = useState<BookVisibility>(initial?.visibility ?? "private");
  const [allowShare, setAllowShare] = useState(initial?.allow_share ?? true);
  const [allowDownload, setAllowDownload] = useState(initial?.allow_download ?? true);
  const [publishedAt, setPublishedAt] = useState(toDatetimeLocal(initial?.published_at ?? null));

  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [tags, setTags] = useState<Taxonomy[]>([]);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set(initial?.category_ids ?? []));
  const [tagIds, setTagIds] = useState<Set<string>>(new Set(initial?.tag_ids ?? []));

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(initial?.cover_url ?? null);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [previewHtml, setPreviewHtml] = useState<string | null>(initial?.content_html ?? null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
    ]).then(([catResult, tagResult]) => {
      if (catResult.ok) setCategories(catResult.data);
      if (tagResult.ok) setTags(tagResult.data);
    });
  }, []);

  const runLivePreview = useCallback(
    async (file: File) => {
      setPreviewLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bookId", bookId);
        const response = await fetch("/api/admin/books/preview", { method: "POST", body: formData });
        const result = await response.json();
        if (result.ok) {
          setPreviewHtml(result.preview.html);
          setPreviewWarnings(result.preview.warnings ?? []);
        } else {
          setPreviewWarnings([result.error ?? "미리보기 변환에 실패했습니다."]);
        }
      } catch {
        setPreviewWarnings(["미리보기 변환 중 오류가 발생했습니다."]);
      } finally {
        setPreviewLoading(false);
      }
    },
    [bookId]
  );

  function applySelectedFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    const error = validateDocxFile(file);
    if (error) {
      setSelectedFile(null);
      setFileError(DOCX_VALIDATION_MESSAGES[error]);
      return;
    }

    setSelectedFile(file);
    setFileError(null);
    runLivePreview(file);
  }

  function applyCoverFile(file: File | null) {
    if (!file) {
      setCoverFile(null);
      setCoverError(null);
      return;
    }

    const error = validateCoverFile(file);
    if (error) {
      setCoverFile(null);
      setCoverError(COVER_VALIDATION_MESSAGES[error]);
      return;
    }

    setCoverFile(file);
    setCoverError(null);
    setCoverPreviewUrl(URL.createObjectURL(file));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    applySelectedFile(e.dataTransfer.files?.[0] ?? null);
  }

  function toggleSetValue(set: Set<string>, value: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedFile) {
      const error = validateDocxFile(selectedFile);
      if (error) {
        setFileError(DOCX_VALIDATION_MESSAGES[error]);
        return;
      }
    }

    setLoading(true);
    setMessage(null);
    setUploadProgress(selectedFile || coverFile ? 0 : null);

    const formData = new FormData();
    if (mode === "create") formData.append("id", bookId);
    formData.append("title", title);
    formData.append("author", author);
    formData.append("summary", summary);
    if (slug) formData.append("slug", slug);
    formData.append("status", status);
    formData.append("visibility", visibility);
    formData.append("allow_share", String(allowShare));
    formData.append("allow_download", String(allowDownload));
    if (publishedAt) formData.append("published_at", publishedAt);
    if (selectedFile) formData.append("file", selectedFile);
    if (coverFile) formData.append("cover", coverFile);
    categoryIds.forEach((id) => formData.append("category_ids", id));
    tagIds.forEach((id) => formData.append("tag_ids", id));

    try {
      const url = mode === "create" ? "/api/admin/books" : `/api/admin/books/${bookId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const { ok, body } = await uploadWithProgress(method, url, formData, setUploadProgress);
      const result = body as { error?: { message?: string } | string; warning?: string | null } | null;

      if (!ok) {
        const errorMessage = typeof result?.error === "string" ? result.error : result?.error?.message;
        setMessage(errorMessage ?? "저장에 실패했습니다.");
        return;
      }

      if (result?.warning) {
        setMessage(`저장되었지만 경고가 있습니다: ${result.warning}`);
        return;
      }

      setMessage(mode === "create" ? "도서가 등록되었습니다." : "도서가 수정되었습니다.");
      router.push("/admin/books");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mt-6 rounded-2xl border border-ink/10 bg-paper-card p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">1</span>
            <span>파일 업로드{mode === "edit" && " (선택 — 비우면 기존 내용 유지)"}</span>
          </div>
          <Link
            href="/admin/docs/docx-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <BookOpenText className="size-3.5" aria-hidden="true" />
            DOCX 작성 가이드
          </Link>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-4 rounded-2xl border border-dashed p-8 text-center transition-colors ${
            isDragging ? "border-accent bg-accent/5" : "border-ink/20 bg-paper"
          }`}
        >
          <p className="text-sm font-medium text-ink">DOCX 파일을 드래그하거나 클릭하여 업로드하세요</p>
          <p className="mt-2 text-sm text-ink/60">지원 형식: DOCX (최대 {formatBytes(MAX_DOCX_SIZE_BYTES)})</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(event) => applySelectedFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper"
          >
            {selectedFile ? "파일 변경" : "파일 선택"}
          </button>
          {selectedFile && (
            <p className="mt-3 text-sm text-accent">
              선택된 파일: {selectedFile.name} ({formatBytes(selectedFile.size)})
            </p>
          )}
          {fileError && <p className="mt-3 text-sm text-red-600">{fileError}</p>}

          {uploadProgress !== null && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink/60">저장 중... {uploadProgress}%</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-ink/10 bg-paper-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">2</span>
            <span>도서 정보</span>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-sm text-ink/70">
              <span className="mb-1 block">제목</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-2"
                placeholder="예: 지식을 책처럼"
              />
            </label>
            <label className="block text-sm text-ink/70">
              <span className="mb-1 block">저자</span>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-2"
                placeholder="예: Coffeecong"
              />
            </label>
            <label className="block text-sm text-ink/70">
              <span className="mb-1 block">요약</span>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-24 w-full rounded-xl border border-ink/10 bg-paper px-3 py-2"
                placeholder="도서 소개를 입력하세요"
              />
            </label>
            <label className="block text-sm text-ink/70">
              <span className="mb-1 block">슬러그 (URL, 비우면 제목에서 자동 생성)</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-2 font-mono text-xs"
                placeholder="예: my-first-book"
              />
            </label>

            <div className="border-t border-ink/10 pt-4">
              <span className="mb-2 block text-sm text-ink/70">표지 이미지</span>
              <div className="flex items-center gap-4">
                {coverPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreviewUrl} alt="표지 미리보기" className="h-24 w-16 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-ink/5 text-[10px] text-ink/40">
                    없음
                  </div>
                )}
                <div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => applyCoverFile(event.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink"
                  >
                    이미지 선택
                  </button>
                  <p className="mt-1 text-xs text-ink/50">PNG/JPG/WEBP, 최대 {formatBytes(MAX_COVER_SIZE_BYTES)}</p>
                  {coverError && <p className="mt-1 text-xs text-red-600">{coverError}</p>}
                </div>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="border-t border-ink/10 pt-4">
                <span className="mb-2 block text-sm text-ink/70">카테고리</span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <label
                      key={c.id}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                        categoryIds.has(c.id) ? "border-accent bg-accent/10 text-accent" : "border-ink/10 text-ink/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={categoryIds.has(c.id)}
                        onChange={() => toggleSetValue(categoryIds, c.id, setCategoryIds)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="pt-2">
                <span className="mb-2 block text-sm text-ink/70">태그</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <label
                      key={t.id}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                        tagIds.has(t.id) ? "border-accent bg-accent/10 text-accent" : "border-ink/10 text-ink/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={tagIds.has(t.id)}
                        onChange={() => toggleSetValue(tagIds, t.id, setTagIds)}
                      />
                      #{t.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t border-ink/10 pt-4">
              <label className="block text-sm text-ink/70">
                <span className="mb-1 block">공개 상태</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BookStatus)}
                  className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-2"
                >
                  <option value="draft">초안</option>
                  <option value="published">공개</option>
                  <option value="archived">보관</option>
                </select>
              </label>
              <label className="block text-sm text-ink/70">
                <span className="mb-1 block">공개 범위</span>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as BookVisibility)}
                  className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-2"
                >
                  <option value="private">비공개</option>
                  <option value="unlisted">링크 전용</option>
                  <option value="public">공개</option>
                </select>
              </label>
            </div>

            <label className="block text-sm text-ink/70">
              <span className="mb-1 block">공개일 (비우면 공개 상태로 저장 시 지금으로 설정)</span>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-2"
              />
            </label>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" checked={allowShare} onChange={(e) => setAllowShare(e.target.checked)} />
                공유 허용
              </label>
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} />
                다운로드 허용
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-paper-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">3</span>
            <span>미리보기</span>
          </div>

          <div className="mt-4 rounded-2xl border border-ink/10 bg-paper p-5">
            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-ink/60">미리보기 변환 중...</div>
              </div>
            ) : previewHtml ? (
              <div className="prose max-w-none text-sm">
                {/*
                  The scroll clamp (`max-h-64 overflow-y-auto`) already limits
                  how much is visible — an earlier `.substring(0, 2000)` on
                  the HTML *string* was redundant for that and actively
                  harmful: cutting raw HTML at a fixed character offset can
                  slice straight through a tag (most visibly an `<img>`
                  appearing after that point, or with its `src` cut
                  mid-attribute), so it silently disappeared from the
                  preview even though the real saved content_html was
                  complete and correct.
                */}
                <div
                  className="space-y-3 overflow-y-auto rounded-lg bg-ink/5 p-4 max-h-64 text-ink text-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                {previewWarnings.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-amber-700">
                    {previewWarnings.map((w, i) => (
                      <li key={i}>⚠ {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-ink/40">DOCX 파일을 선택하면 미리보기가 표시됩니다.</p>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm text-ink/70">{message}</div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/books")}
          className="rounded-full border border-ink/10 px-4 py-2 text-sm font-medium text-ink"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
        >
          {loading ? "저장 중..." : mode === "create" ? "등록" : "수정 저장"}
        </button>
      </div>
    </form>
  );
}
