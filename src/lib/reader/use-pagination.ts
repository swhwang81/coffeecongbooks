import { useCallback, useEffect, useRef, useState } from "react";
import type { Block } from "@/lib/docx/blocks";
import { paginateBlocks, type ReaderPage } from "./measure-paginate";
import { PAGE_PADDING_CLASS, READER_CONTENT_CLASS, PAGE_FOOTER_CLASS } from "./page-layout";

export interface PageBox {
  width: number;
  height: number;
}

export interface UsePaginationOptions {
  blocks: Block[];
  /** The book-frame element whose available space defines page size. */
  wrapperRef: React.RefObject<HTMLElement | null>;
  isDesktop: boolean;
  fontSize: number;
  lineHeight: number;
  /** Bumped by the caller on events a resize won't cover (e.g. fullscreen toggle). */
  recomputeToken?: number;
}

export interface UsePaginationResult {
  pages: ReaderPage[];
  blockIdToPage: Map<string, number>;
  pageBox: PageBox | null;
  isComputing: boolean;
}

const DESKTOP_GUTTER = 32;
const MIN_PAGE_HEIGHT = 420;
const MAX_PAGE_HEIGHT = 760;
const MIN_PAGE_WIDTH = 260;
const MAX_PAGE_WIDTH = 520;
const RESIZE_DEBOUNCE_MS = 250;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computePageBox(wrapperWidth: number, wrapperHeight: number, isDesktop: boolean): PageBox {
  const height = clamp(wrapperHeight, MIN_PAGE_HEIGHT, MAX_PAGE_HEIGHT);
  const width = isDesktop
    ? clamp((wrapperWidth - DESKTOP_GUTTER) / 2, MIN_PAGE_WIDTH, MAX_PAGE_WIDTH)
    : clamp(wrapperWidth, MIN_PAGE_WIDTH, MAX_PAGE_WIDTH + 60);
  return { width: Math.floor(width), height: Math.floor(height) };
}

/**
 * Builds (once) and returns a hidden container that mirrors the real
 * page's DOM structure exactly (`page-layout.ts` classes) so measured
 * heights match rendered heights. Lives outside React's tree — it's a
 * measurement scratchpad, never displayed.
 */
function useMeasurementNode() {
  const ref = useRef<{ outer: HTMLDivElement; content: HTMLDivElement } | null>(null);

  useEffect(() => {
    const outer = document.createElement("div");
    outer.style.position = "fixed";
    outer.style.left = "-9999px";
    outer.style.top = "0";
    outer.style.visibility = "hidden";
    outer.style.pointerEvents = "none";
    outer.style.display = "flex";
    outer.style.flexDirection = "column";
    outer.className = PAGE_PADDING_CLASS;

    const content = document.createElement("div");
    content.className = READER_CONTENT_CLASS;

    const footer = document.createElement("div");
    footer.className = PAGE_FOOTER_CLASS;
    footer.innerHTML = "&nbsp;";

    outer.appendChild(content);
    outer.appendChild(footer);
    document.body.appendChild(outer);
    ref.current = { outer, content };

    return () => {
      outer.remove();
      ref.current = null;
    };
  }, []);

  return ref;
}

/**
 * Real DOM-measurement pagination (spec §12), wired to every recompute
 * trigger the spec lists: ResizeObserver on the book frame (covers window
 * resize and orientation change), font-size, line-height, and an external
 * `recomputeToken` the Reader bumps on fullscreen enter/exit. Resize-driven
 * recomputes are debounced; font-size/line-height changes (deliberate,
 * discrete user actions) are not.
 */
export function usePagination({
  blocks,
  wrapperRef,
  isDesktop,
  fontSize,
  lineHeight,
  recomputeToken = 0,
}: UsePaginationOptions): UsePaginationResult {
  const measurementRef = useMeasurementNode();
  const [pages, setPages] = useState<ReaderPage[]>([{ isCover: true, html: "", blockIds: [], firstBlockWordOffset: 0 }]);
  const [blockIdToPage, setBlockIdToPage] = useState<Map<string, number>>(new Map());
  const [pageBox, setPageBox] = useState<PageBox | null>(null);
  const [isComputing, setIsComputing] = useState(true);

  // Self-referencing callback (retries itself next frame if layout hasn't
  // settled yet) — kept behind a ref so the retry always calls the latest
  // version instead of closing over a stale one.
  const recomputeRef = useRef<() => void>(() => {});

  const recompute = useCallback(() => {
    const wrapper = wrapperRef.current;
    const measurement = measurementRef.current;
    if (!wrapper || !measurement) return;

    const rect = wrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // Layout hasn't settled yet (e.g. right after a route transition) —
      // retry next frame instead of giving up until some later, unrelated
      // dependency change happens to fire this again.
      requestAnimationFrame(() => recomputeRef.current());
      return;
    }

    const box = computePageBox(rect.width, rect.height, isDesktop);

    measurement.outer.style.width = `${box.width}px`;
    measurement.outer.style.height = `${box.height}px`;
    measurement.content.style.fontSize = `${fontSize}px`;
    measurement.content.style.lineHeight = String(lineHeight);

    const result = paginateBlocks(blocks, measurement.content);
    setPages(result.pages);
    setBlockIdToPage(result.blockIdToPage);
    setPageBox(box);
    setIsComputing(false);
  }, [blocks, wrapperRef, measurementRef, isDesktop, fontSize, lineHeight]);

  useEffect(() => {
    recomputeRef.current = recompute;
  }, [recompute]);

  // Font-size/line-height/block/orientation-branch changes: recompute
  // immediately. This genuinely needs an effect — pagination measures
  // real, committed DOM layout (scrollHeight/clientHeight), which doesn't
  // exist yet during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsComputing(true);
    recompute();
  }, [recompute]);

  // External triggers a resize won't cover (fullscreen enter/exit).
  useEffect(() => {
    if (recomputeToken === 0) return;
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recomputeToken]);

  // The very first recompute (above) measures whatever's rendered at that
  // instant, which is often still the fallback font — before the real web
  // font (Pretendard, a large Korean family) has finished loading and
  // swapped in. Word-wrap metrics shift as that happens, so pagination
  // measured too early can be off, and the fix-up so far has been
  // incidental: whatever ResizeObserver noise happens to fire afterward
  // eventually re-measures a more final layout. That's neither fast nor
  // reliable — real-device testing (mobile/WebKit especially, where font
  // loading is slower) saw 5-7+ recomputes before the page count actually
  // stopped changing. `document.fonts.ready` is a real, bounded signal for
  // "the font swap is done" — recompute once more when it resolves so
  // there's at least one guaranteed authoritative pass instead of relying
  // on however long incidental churn happens to take.
  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) recomputeRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ResizeObserver: window resize, orientation change, layout shifts — debounced.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(recompute, RESIZE_DEBOUNCE_MS);
    });
    observer.observe(wrapper);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [recompute, wrapperRef]);

  return { pages, blockIdToPage, pageBox, isComputing };
}
