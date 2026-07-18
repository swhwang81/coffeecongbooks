"use client";

import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import type { TocEntry } from "@/lib/docx/blocks";
import { computeChapterNumbers } from "@/lib/reader/chapter-numbers";

// Spec Phase 13 "Heading 1/2 기반 목차 생성" — the panel shows chapter/
// section level entries only (Word's Heading 1/Heading 2, which our style
// map maps to block levels 2/3: level 1 is the book title itself,
// already shown on the cover/toolbar; level 4 is sub-subsections, too
// granular for a TOC). The full `toc` (all heading levels) still backs
// the reading-position system elsewhere — this filter is display-only.
const TOC_MIN_LEVEL = 2;
const TOC_MAX_LEVEL = 3;

export function ReaderToc({
  toc,
  activeBlockId,
  onJump,
  onClose,
}: {
  toc: TocEntry[];
  activeBlockId: string | null;
  onJump: (blockId: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const visibleToc = useMemo(
    () => toc.filter((entry) => entry.level >= TOC_MIN_LEVEL && entry.level <= TOC_MAX_LEVEL),
    [toc]
  );
  const chapterNumbers = useMemo(() => computeChapterNumbers(toc), [toc]);

  // Keyboard accessibility (spec Phase 13): move focus into the panel on
  // open — preferring the current chapter so keyboard users land exactly
  // where sighted users see the highlight — and trap Tab within it so
  // focus can't silently leave to background content hidden behind the
  // backdrop.
  useEffect(() => {
    (activeRef.current ?? panelRef.current)?.focus();

    function handleKeydown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" aria-label="목차 닫기" onClick={onClose} className="flex-1 bg-ink/50" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="목차"
        tabIndex={-1}
        className="flex h-full w-max max-w-[85vw] flex-col bg-paper-card outline-none sm:max-w-sm"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">목차</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-md p-1 text-ink/50 hover:bg-ink/5">
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {visibleToc.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink/50">목차가 없습니다.</p>
          ) : (
            visibleToc.map((entry) => {
              const isActive = entry.blockId === activeBlockId;
              const chapterNumber = chapterNumbers.get(entry.blockId);
              return (
                <button
                  key={entry.blockId}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  onClick={() => onJump(entry.blockId)}
                  aria-current={isActive ? "true" : undefined}
                  className={`block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isActive ? "bg-accent/10 font-medium text-accent" : "text-ink/80 hover:bg-ink/5"
                  }`}
                  style={{ paddingLeft: `${12 + (entry.level - TOC_MIN_LEVEL) * 16}px` }}
                >
                  {chapterNumber != null ? `${chapterNumber}장 ` : ""}
                  {entry.title}
                </button>
              );
            })
          )}
        </nav>
      </div>
    </div>
  );
}
