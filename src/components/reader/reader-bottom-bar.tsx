"use client";

import { ChevronLeft, ChevronRight, List } from "lucide-react";

export function ReaderBottomBar({
  variant,
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onSeek,
  onToggleToc,
}: {
  variant: "desktop" | "mobile";
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (page: number) => void;
  onToggleToc: () => void;
}) {
  const atStart = currentPage <= 0;
  const atEnd = currentPage >= totalPages - 1;

  if (variant === "mobile") {
    return (
      <div className="flex h-14 shrink-0 items-center justify-between px-4 text-paper">
        <button
          type="button"
          onClick={onPrev}
          disabled={atStart}
          aria-label="이전 페이지"
          className="rounded-full p-2 text-paper/80 hover:bg-paper/10 hover:text-paper disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-xs text-paper/70">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={atEnd}
          aria-label="다음 페이지"
          className="rounded-full p-2 text-paper/80 hover:bg-paper/10 hover:text-paper disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 px-4 text-paper">
      <button
        type="button"
        onClick={onToggleToc}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-paper/80 hover:bg-paper/10 hover:text-paper"
      >
        <List className="size-4" />
        목차
      </button>
      <button
        type="button"
        onClick={onPrev}
        disabled={atStart}
        aria-label="이전 페이지"
        className="rounded-full p-2 text-paper/80 hover:bg-paper/10 hover:text-paper disabled:opacity-30"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="w-20 shrink-0 text-center text-sm text-paper/70">
        {currentPage + 1} / {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        aria-label="다음 페이지"
        className="rounded-full p-2 text-paper/80 hover:bg-paper/10 hover:text-paper disabled:opacity-30"
      >
        <ChevronRight className="size-5" />
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(totalPages - 1, 0)}
        value={currentPage}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="flex-1 accent-accent"
        aria-label="페이지 이동"
      />
    </div>
  );
}
