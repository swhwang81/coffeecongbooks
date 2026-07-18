"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Block, TocEntry } from "@/lib/docx/blocks";
import { usePagination } from "@/lib/reader/use-pagination";
import { findPageForPosition } from "@/lib/reader/measure-paginate";
import { PAGE_PADDING_CLASS, READER_CONTENT_CLASS, PAGE_FOOTER_CLASS } from "@/lib/reader/page-layout";
import { loadReaderSettings, saveReaderSettings, loadReaderPosition, saveReaderPosition } from "@/lib/reader/settings-storage";
import { withChapterNumbers } from "@/lib/reader/chapter-numbers";
import { ReaderToolbar } from "./reader-toolbar";
import { ReaderBottomBar } from "./reader-bottom-bar";
import { ReaderToc } from "./reader-toc";
import { ReaderSettingsPanel } from "./reader-settings-panel";
import { ReaderShareMenu } from "./reader-share-menu";
import { recordBookView } from "@/lib/reader/view-tracking";

// react-pageflip manipulates the DOM directly (canvas-like page turning) — client-only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false }) as any;

export type ReaderTheme = "light" | "sepia" | "dark";

// `heading` is deliberately more emphasized than `text` per theme — darker
// for the light/sepia (dark-on-light) themes, brighter for dark (light-on-
// dark) — so chapter/section titles read as visibly distinct from a
// standard/plain document rather than just a bigger version of body text.
const THEME_STYLES: Record<ReaderTheme, { bg: string; text: string; heading: string }> = {
  light: { bg: "#faf6ee", text: "#1b2540", heading: "#0a0f1f" },
  sepia: { bg: "#f1e4c8", text: "#3a2e1f", heading: "#1f160c" },
  dark: { bg: "#1b2233", text: "#e8e6df", heading: "#ffffff" },
};

// Center tap-zone gesture thresholds (see the pointer handlers in `Reader`
// below) — movement below this counts as a stationary tap, at/above the
// swipe minimum (whichever of the fixed px floor or the fraction of the
// book's own width is larger) counts as an intentional swipe. Anything in
// between is an ambiguous wobble and is deliberately ignored.
const CENTER_TAP_MAX_PX = 10;
const CENTER_SWIPE_MIN_PX = 50;
const CENTER_SWIPE_MIN_WIDTH_RATIO = 0.15;

// Left/right stationary-tap fallback range — see the comment above
// `sideDragRef` in `Reader` for why this specific 6–20px band exists (mouse)
// and why touch/pen use a different rule entirely.
const SIDE_TAP_FALLBACK_MIN_PX = 6;
const SIDE_TAP_FALLBACK_MAX_PX = 20;
// react-pageflip's own touch handling (`UI.onTouchStart` in
// node_modules/page-flip) arms its click path on a delay equal to its
// internal `swipeTimeout` (250ms) — matched here so we know precisely when
// that arming has *not* happened yet.
const TOUCH_CLICK_ARM_DELAY_MS = 250;

const DESKTOP_MIN_FONT_SIZE = 15;
// Spec §11 "모바일: 최소 본문 17px" — mobile never goes below this, even
// via the A- stepper.
const MOBILE_MIN_FONT_SIZE = 17;
const MAX_FONT_SIZE = 26;
const DEFAULT_FONT_SIZE = 18;
const MIN_LINE_HEIGHT = 1.4;
const MAX_LINE_HEIGHT = 2.2;
const DEFAULT_LINE_HEIGHT = 1.75;

export interface ReaderBookData {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  blocks: Block[];
  toc: TocEntry[];
  /** Fully-resolved public URL for this book (`/books/[slug]` or
   *  `/share/[shareToken]`, whichever route is currently serving it) —
   *  resolved server-side so the Reader doesn't need `NEXT_PUBLIC_SITE_URL`
   *  itself. Null only if `NEXT_PUBLIC_SITE_URL` isn't configured. */
  shareUrl: string | null;
  allowShare: boolean;
}

export function Reader({ book }: { book: ReaderBookData }) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);

  // Must start `false` to match SSR (no `window` server-side) and correct
  // itself post-mount — reading matchMedia in the initializer instead would
  // desync from the server-rendered HTML and trigger a hydration mismatch.
  const [isDesktop, setIsDesktop] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [lineHeight, setLineHeight] = useState(DEFAULT_LINE_HEIGHT);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [startPage, setStartPage] = useState(0);
  const [fullscreenToken, setFullscreenToken] = useState(0);
  // Top/bottom navy chrome overlays the reading area rather than pushing it
  // — toggling it must never change the measured page size, or it would
  // trigger a real repagination (spec §12) on every tap.
  const [chromeVisible, setChromeVisible] = useState(true);
  const pageAreaRef = useRef<HTMLDivElement>(null);

  // Records one view per Reader mount (spec §17) — not per page turn.
  useEffect(() => {
    recordBookView(book.id);
  }, [book.id]);

  // Restore this book's saved reader settings (spec Phase 12 "재방문 시
  // 복원"). Safe to do in an effect post-mount: the visible parts settings
  // affect (page background/text) only ever render once react-pageflip
  // mounts client-side anyway, so there's no server-rendered value to
  // mismatch against.
  useEffect(() => {
    const stored = loadReaderSettings(book.slug);
    if (!stored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof stored.fontSize === "number") setFontSize(stored.fontSize);
    if (typeof stored.lineHeight === "number") setLineHeight(stored.lineHeight);
    if (stored.theme) setTheme(stored.theme);
  }, [book.slug]);

  // Skip the very first run (mount, still-default values) so it can never
  // race the restore effect above and overwrite a just-loaded save with
  // defaults — only actual subsequent changes get persisted.
  const isFirstSaveRef = useRef(true);
  useEffect(() => {
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false;
      return;
    }
    saveReaderSettings(book.slug, { fontSize, lineHeight, theme });
  }, [book.slug, fontSize, lineHeight, theme]);

  // Mobile enforces a 17px floor (spec §11) — bump up if a desktop-sized
  // smaller font carries over when the viewport crosses the breakpoint.
  useEffect(() => {
    if (!isDesktop && fontSize < MOBILE_MIN_FONT_SIZE) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFontSize(MOBILE_MIN_FONT_SIZE);
    }
  }, [isDesktop, fontSize]);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
      // Fullscreen changes the frame's box size — the ResizeObserver
      // should catch this too, but the transition is asynchronous/animated
      // on some browsers, so nudge an explicit recompute (spec §12).
      setFullscreenToken((v) => v + 1);
    }
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const numberedBlocks = useMemo(() => withChapterNumbers(book.blocks, book.toc), [book.blocks, book.toc]);

  const { pages, blockIdToPage, pageBox } = usePagination({
    blocks: numberedBlocks,
    wrapperRef,
    isDesktop,
    fontSize,
    lineHeight,
    recomputeToken: fullscreenToken,
  });

  // Remounts `HTMLFlipBook` (via its `key` prop below) whenever the page
  // geometry or content changes — react-pageflip has no supported way to
  // resize/repaginate an existing instance in place.
  const flipbookKey = `${isDesktop ? "desktop" : "mobile"}-${pageBox?.width ?? 0}-${pageBox?.height ?? 0}-${pages.length}`;

  // Track the topmost block (and its word offset, for a split paragraph's
  // continuation pages) of whatever page is currently showing, so a
  // recompute (resize/font-size/line-height) can resume near the same spot
  // instead of snapping back to the cover (spec §12/§13 — never just a page
  // number, since page numbers aren't stable across recomputes).
  const topBlockRef = useRef<{ blockId: string; wordOffset: number } | null>(null);
  useEffect(() => {
    const page = pages[currentPage];
    topBlockRef.current = page?.blockIds[0] ? { blockId: page.blockIds[0], wordOffset: page.firstBlockWordOffset } : null;
  }, [pages, currentPage]);

  const isFirstPaginationRef = useRef(true);
  useEffect(() => {
    if (isFirstPaginationRef.current) {
      isFirstPaginationRef.current = false;
      return;
    }

    // `topBlockRef` only ever gets a value once we've actually landed
    // somewhere real in this session (via the effect above, in response to
    // `currentPage` moving off the cover). Until then, every pagination
    // pass here is still initial-load settling — `isDesktop` starts `false`
    // for SSR safety and corrects itself post-mount, and the ResizeObserver
    // measurement can take a couple of passes to reach its final size, so
    // several *real* (non-placeholder) paginations can fire in quick
    // succession before things stabilize. A one-shot "try localStorage
    // once" guard breaks here: whichever settling pass runs last always
    // wins, and if that's not the one that tried the saved position, the
    // restore silently gets discarded back to the cover. Re-deriving the
    // saved position's page fresh against *whatever* pagination is current
    // — every single time, for as long as nothing real has happened yet —
    // fixes that, and is naturally superseded by real navigation the
    // moment `topBlockRef` gets set.
    const top = topBlockRef.current;
    let restoredPage: number | undefined;
    if (top) {
      restoredPage = findPageForPosition(pages, top.blockId, top.wordOffset, blockIdToPage);
    } else {
      const saved = loadReaderPosition(book.slug);
      if (saved) restoredPage = findPageForPosition(pages, saved.blockId, saved.wordOffset, blockIdToPage);
    }

    // Only `startPage` is set here — the correction effect below (keyed on
    // `startPage`/`flipbookKey`) is the single place that actually calls
    // `goTo` and updates `currentPage`. Setting `currentPage` from both
    // effects raced: this effect's `pages`-triggered pass and that one's
    // `flipbookKey`-triggered pass could land in the *same* render's effect
    // flush, and the later-declared one always won, silently discarding
    // whichever restore ran first.
    setStartPage(restoredPage ?? 0);
    // Only the identity of `pages` (a new array on every recompute) should
    // trigger this — blockIdToPage always changes in lockstep with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  // Save the reading position (spec §13) whenever the visible page settles
  // on real content — debounced so rapid page turns don't hammer
  // localStorage. The cover page has no blocks, so it's a no-op until the
  // reader actually starts reading.
  //
  // Deliberately keyed on the *resolved* blockId/wordOffset values, not on
  // `pages` (a new array identity every recompute) or `currentPage` alone.
  // While layout is still settling (web font swap, ResizeObserver noise —
  // real devices measured 5-7+ recomputes before stabilizing, worse on
  // mobile/WebKit than desktop), `pages` can keep changing identity for
  // several seconds even though position-restore keeps landing on the same
  // block every time. Depending on `pages` restarted this debounce on every
  // single one of those recomputes, so under sustained churn the timer
  // could go a long time without ever getting a clear 600ms window to
  // fire — nothing got saved at all until things fully settled. Depending
  // on the resolved value instead means incidental repagination that
  // still resolves to the same spot leaves the pending timer alone.
  const currentPageData = pages[currentPage];
  const currentBlockId = currentPageData?.blockIds[0] ?? null;
  const currentWordOffset = currentPageData?.firstBlockWordOffset ?? 0;
  useEffect(() => {
    if (!currentBlockId) return;

    const timer = setTimeout(() => {
      const blockIndex = book.blocks.findIndex((b) => b.id === currentBlockId);
      const progress = blockIndex >= 0 ? blockIndex / Math.max(book.blocks.length - 1, 1) : 0;
      saveReaderPosition(book.slug, { blockId: currentBlockId, wordOffset: currentWordOffset, progress });
    }, 600);
    return () => clearTimeout(timer);
  }, [book.slug, book.blocks, currentBlockId, currentWordOffset]);

  const currentChapterTitle = useMemo(() => {
    let title = book.title;
    for (const entry of book.toc) {
      const entryPage = blockIdToPage.get(entry.blockId) ?? 0;
      if (entryPage <= currentPage) title = entry.title;
      else break;
    }
    return title;
  }, [book.toc, book.title, blockIdToPage, currentPage]);

  // Which TOC entry the current page falls under — drives the "현재 장
  // 강조 표시" highlight in the TOC panel (same "last entry at or before
  // the current page" logic as the toolbar title above).
  const activeTocBlockId = useMemo(() => {
    let activeId: string | null = null;
    for (const entry of book.toc) {
      const entryPage = blockIdToPage.get(entry.blockId) ?? 0;
      if (entryPage <= currentPage) activeId = entry.blockId;
      else break;
    }
    return activeId;
  }, [book.toc, blockIdToPage, currentPage]);

  const goPrev = useCallback(() => bookRef.current?.pageFlip()?.flipPrev(), []);
  const goNext = useCallback(() => bookRef.current?.pageFlip()?.flipNext(), []);

  // Left/right third navigation + the real finger-following page-fold
  // animation are both handled entirely by react-pageflip's own native
  // click/drag gesture, left completely unblocked (`disableFlipByClick`
  // stays `false`, its original value): with that setting off, its click
  // direction is a plain 50/50 split of the *whole* book's bounds (not a
  // "near a corner" requirement — that check only applies when
  // `disableFlipByClick` is on), so our left third is a strict subset of its
  // "prev" half and our right third a strict subset of its "next" half.
  // Reimplementing that gesture ourselves was tried first (see git history)
  // and gave up the real fold visual for no benefit, since react-pageflip
  // already does exactly what we want here for free.
  //
  // The only thing react-pageflip has no concept of is a center dead-zone,
  // so the middle third alone gets a small transparent overlay (below,
  // rendered inside `pageAreaRef`) that physically sits on top of the book
  // there — normal DOM hit-testing means react-pageflip's own listeners
  // never even receive events that land on it, no propagation tricks
  // needed. Pointer Capture on that overlay means a gesture that *starts*
  // in the center third keeps reporting to it even if the finger drags out
  // past the overlay's own edges, so a swipe starting dead-center still
  // navigates — just without the live fold visual, since that portion of
  // the gesture never reaches react-pageflip's own element at all.
  const centerDragRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const handleCenterPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    centerDragRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleCenterPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = centerDragRef.current;
      centerDragRef.current = null;
      if (!start || start.pointerId !== e.pointerId) return;

      const deltaX = e.clientX - start.x;
      const deltaY = e.clientY - start.y;

      if (Math.abs(deltaX) < CENTER_TAP_MAX_PX && Math.abs(deltaY) < CENTER_TAP_MAX_PX) {
        setChromeVisible((v) => !v);
        return;
      }

      const rectWidth = pageAreaRef.current?.getBoundingClientRect().width ?? 0;
      const swipeThreshold = Math.max(CENTER_SWIPE_MIN_PX, rectWidth * CENTER_SWIPE_MIN_WIDTH_RATIO);
      if (Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) goNext();
        else goPrev();
      }
      // Anything smaller than a real swipe but past the tap threshold is an
      // ambiguous wobble — deliberately does nothing.
    },
    [goPrev, goNext]
  );

  const handleCenterPointerCancel = useCallback(() => {
    centerDragRef.current = null;
  }, []);

  // Left/right stationary-tap fallback. react-pageflip's click-vs-drag
  // handling is entirely different for mouse vs. touch, and both need help:
  //
  // Mouse: the click-vs-drag split (`App.userMove`) is a hard 5px —
  // `GetDistanceBetweenTwoPoint(...) > 5` is the only thing that pushes it
  // off its click path (`flip()`, animated, works fine) onto its drag path
  // (`fold()` + `stopMove()`) instead. A click with a few stray pixels of
  // movement never reaches the ~50%-of-page-width distance `stopMove()`
  // needs to *commit* a drag, so it silently springs back with nothing
  // happening. Our fallback covers exactly that 5–20px gap; react-pageflip
  // handles ≤5px and >20px correctly on its own.
  //
  // Touch: `UI.onTouchStart` doesn't call `startUserTouch` (which arms the
  // click/drag state machine at all) immediately — it defers it via
  // `setTimeout(..., swipeTimeout)`, 250ms. A real tap almost always
  // releases well before that fires, so `userStop` on `touchend` finds
  // `isUserTouch` still `false` and does *nothing at all* — not even a
  // spring-back, react-pageflip's whole click path is simply unreachable
  // for a normal quick tap. Its *swipe* still works, via a separate
  // fast-path check in `onTouchEnd` that doesn't depend on that same
  // deferred arming. So for touch we own the *entire* tap range (not just
  // a gap), but only while still inside that same 250ms window — once
  // react-pageflip's deferred arming has actually happened, its own click
  // path takes over, and backing off there avoids double-firing on a slow,
  // deliberate tap-and-hold.
  const sideDragRef = useRef<{ x: number; y: number; zone: "left" | "right"; time: number; pointerType: string } | null>(
    null
  );

  const handlePageAreaPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    const rect = pageAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x >= third && x <= third * 2) return; // center third is handled entirely by its own overlay
    sideDragRef.current = { x: e.clientX, y: e.clientY, zone: x < third ? "left" : "right", time: Date.now(), pointerType: e.pointerType };
  }, []);

  const handlePageAreaPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = sideDragRef.current;
      sideDragRef.current = null;
      if (!start) return;

      const distance = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const isFallbackTap =
        start.pointerType === "mouse"
          ? distance > SIDE_TAP_FALLBACK_MIN_PX && distance <= SIDE_TAP_FALLBACK_MAX_PX
          : distance <= SIDE_TAP_FALLBACK_MAX_PX && Date.now() - start.time < TOUCH_CLICK_ARM_DELAY_MS;

      if (!isFallbackTap) return;
      if (start.zone === "left") goPrev();
      else goNext();
    },
    [goPrev, goNext]
  );

  const handlePageAreaPointerCancel = useCallback(() => {
    sideDragRef.current = null;
  }, []);

  // page-flip.js's flip(page)/flipToPage() only ever animates ONE spread
  // step: it silently teleports `currentSpreadIndex` to `next - 1` and then
  // calls flipNext()/flipPrev() once (Flip.flipToPage), so jumps spanning
  // more than one spread (e.g. TOC clicks, the scrub slider) land on the
  // wrong page. turnToPage() instead calls PageCollection.show(), which
  // sets the spread index directly and fires the same `flip` event
  // (via app.updatePageIndex, synchronously) that onFlip already listens
  // to — a real instant jump instead of a one-step animation. That event
  // reports the spread's *left* page though, so a target that's the right
  // half of the newly-shown spread (e.g. page 2 of spread [1, 2]) would
  // report back as page 1. Both pages are already visible on screen in
  // that case, so nothing needs to re-render — we just re-assert the exact
  // target afterward (same synchronous batch, so it wins over onFlip's
  // spread-left value) to keep the page indicator/TOC highlight precise.
  const goTo = useCallback((page: number) => {
    bookRef.current?.pageFlip()?.turnToPage(page);
    setCurrentPage(page);
  }, []);

  // `HTMLFlipBook` remounts a fresh instance (new `key`, see `flipbookKey`)
  // whenever it's recreated for a `startPage`-driven jump (Phase 11/14
  // position restore). The fresh instance's own initial `onFlip` suffers
  // the same spread-left-page reporting as `goTo` (see its comment above),
  // firing asynchronously from *within* react-pageflip's own mount effect
  // — after this component's position-restore effect already ran, so it
  // can't be corrected from there. Re-assert the exact target here once
  // the new instance exists (bottom-up effect ordering guarantees
  // react-pageflip's mount effect has already run by the time this fires).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing react-pageflip's imperative page state with React's, same as `goTo` itself does when called from event handlers.
    goTo(startPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPage, flipbookKey]);

  const jumpToBlock = useCallback(
    (blockId: string) => {
      const page = blockIdToPage.get(blockId);
      if (page !== undefined) goTo(page);
      setTocOpen(false);
    },
    [blockIdToPage, goTo]
  );

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape" && tocOpen) setTocOpen(false);
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [goPrev, goNext, tocOpen]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      frameRef.current?.requestFullscreen();
    }
  }

  function resetSettings() {
    setFontSize(DEFAULT_FONT_SIZE);
    setLineHeight(DEFAULT_LINE_HEIGHT);
    setTheme("light");
  }

  function clampFontSize(size: number) {
    const min = isDesktop ? DESKTOP_MIN_FONT_SIZE : MOBILE_MIN_FONT_SIZE;
    setFontSize(Math.min(MAX_FONT_SIZE, Math.max(min, size)));
  }

  function clampLineHeight(value: number) {
    setLineHeight(Math.min(MAX_LINE_HEIGHT, Math.max(MIN_LINE_HEIGHT, Math.round(value * 100) / 100)));
  }

  const themeStyle = THEME_STYLES[theme];

  function renderPageContent(pageIndex: number) {
    const page = pages[pageIndex];
    // react-pageflip clones this root element and overwrites its `style`
    // prop with its own positioning (position/left/top/width/height/z-index)
    // rather than merging — background/color has to live on an inner
    // wrapper div instead, or it gets silently clobbered.
    if (page.isCover) {
      return (
        <div key={pageIndex} className="page h-full w-full" data-density="hard">
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center"
            style={{ background: themeStyle.bg, color: themeStyle.text }}
          >
            {book.coverUrl && (
              <div className="relative aspect-[3/4] w-2/3 max-w-[220px] overflow-hidden rounded-lg shadow-md">
                <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="220px" />
              </div>
            )}
            <h1 className="text-xl font-bold">{book.title}</h1>
            {book.author && <p className="text-sm opacity-70">{book.author}</p>}
          </div>
        </div>
      );
    }

    return (
      <div key={pageIndex} className="page h-full w-full">
        <div
          className={`flex h-full w-full flex-col ${PAGE_PADDING_CLASS}`}
          style={
            {
              background: themeStyle.bg,
              color: themeStyle.text,
              "--reader-heading-color": themeStyle.heading,
            } as CSSProperties
          }
        >
          <div
            className={READER_CONTENT_CLASS}
            style={{ fontSize: `${fontSize}px`, lineHeight }}
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
          <div className={PAGE_FOOTER_CLASS}>{pageIndex}</div>
        </div>
      </div>
    );
  }

  const flipSettings = {
    drawShadow: true,
    flippingTime: 500,
    useMouseEvents: true,
    showPageCorners: true,
    disableFlipByClick: false,
    mobileScrollSupport: false,
    className: "",
    style: {},
    maxShadowOpacity: 0.4,
    startZIndex: 0,
    autoSize: false,
    clickEventForward: true,
    swipeDistance: 30,
  };

  return (
    // `h-dvh` (a real, fixed ceiling) rather than `min-h-screen` (a floor
    // that lets the page grow taller than the viewport) — see the bug
    // this fixed, below.
    <div className="flex h-dvh flex-col bg-ink/90">
      {/*
        The frame itself (not just the toolbar/bottom-bar content) recolors
        when the chrome is hidden — matching the book's own page color
        instead of staying navy — so a middle-tap reads as "the book now
        fills the whole screen" rather than just "the menu went away with a
        navy void still framing it."
      */}
      <div
        ref={frameRef}
        className="flex flex-1 flex-col overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: chromeVisible ? "var(--color-ink)" : themeStyle.bg }}
      >
        {/*
          Fixed-height wrapper (never resizes) so toggling `chromeVisible`
          only fades/slides the bar's *contents* — the row's own height stays
          constant, which keeps `wrapperRef`'s measured rect stable below. If
          this row's height changed on toggle, every chrome tap would also
          trigger a real repagination (spec §12 ties recompute to actual
          container-size changes), which isn't the intent of a tap-to-hide-UI
          gesture.
        */}
        <div className="shrink-0 overflow-hidden">
          <div
            className={`transition-all duration-300 ${chromeVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"}`}
          >
            <ReaderToolbar
              variant={isDesktop ? "desktop" : "mobile"}
              title={currentChapterTitle}
              onBack={() => router.push("/books")}
              onToggleToc={() => setTocOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenShare={book.allowShare && book.shareUrl ? () => setShareOpen(true) : undefined}
              fontSize={fontSize}
              onFontSizeChange={clampFontSize}
              lineHeight={lineHeight}
              onLineHeightChange={clampLineHeight}
              theme={theme}
              onThemeChange={setTheme}
              onReset={resetSettings}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        </div>

        {/*
          `wrapperRef` (used for pagination measurement) lives on THIS row,
          not the inner max-w-5xl div — percentage heights on a nested flex
          item (h-full there) were unreliably resolving to 0 depending on
          cross-axis alignment, while this row's own height is always
          definite (it's the flex-1 item receiving the frame's real space).
          Measuring here sidesteps that entirely.

          That "definite" only holds if something above this element in
          the tree has a real ceiling, though — a real bug found here: the
          root Reader div used to be `min-h-screen` (a *floor* — it can
          grow taller than the viewport to fit its content). `HTMLFlipBook`
          remounts at a new pixel height every time this wrapper's measured
          rect changes (`flipbookKey`, below) — including height *it its
          own child just grew*. With no fixed ceiling anywhere above,
          each remount could round up a few px, which grew the page
          overall, which this wrapper then measured as taller next time —
          a self-sustaining loop that never settled, remounting the whole
          reader roughly every 250-300ms forever (every ResizeObserver
          debounce tick) and reading as constant flicker. Fixed by making
          the root `h-dvh` (a real ceiling) so overflow gets clipped by
          this element's own `overflow-hidden` instead of growing the page.
        */}
        <div ref={wrapperRef} className="relative flex flex-1 justify-center overflow-hidden px-2 pb-2 sm:px-6">
          {/* Soft spotlight behind the book — purely decorative depth cue,
              independent of the book's real pixel box (see `.stf__parent`
              in globals.css for the shadow that actually hugs it). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.3)_100%)]"
          />

          {isDesktop && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="이전 페이지"
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-paper/60 hover:text-paper sm:left-2"
            >
              <ChevronLeft className="size-8" />
            </button>
          )}

          <div
            ref={pageAreaRef}
            onPointerDown={handlePageAreaPointerDown}
            onPointerUp={handlePageAreaPointerUp}
            onPointerCancel={handlePageAreaPointerCancel}
            className="relative h-full max-h-[720px] w-full max-w-5xl"
          >
            {pageBox && (
              <HTMLFlipBook
                key={flipbookKey}
                ref={bookRef}
                {...flipSettings}
                startPage={startPage}
                width={pageBox.width}
                height={pageBox.height}
                size="fixed"
                minWidth={pageBox.width}
                maxWidth={pageBox.width}
                minHeight={pageBox.height}
                maxHeight={pageBox.height}
                usePortrait={!isDesktop}
                showCover={true}
                onFlip={(e: { data: number }) => setCurrentPage(e.data)}
              >
                {pages.map((_, i) => renderPageContent(i))}
              </HTMLFlipBook>
            )}

            {/* Center third only — see the comment above `centerDragRef`
                for why react-pageflip is left fully unblocked everywhere
                else. `touchAction: none` stops the browser from starting
                its own scroll/gesture here before our pointer handlers get
                a chance to see the move. */}
            <div
              onPointerDown={handleCenterPointerDown}
              onPointerUp={handleCenterPointerUp}
              onPointerCancel={handleCenterPointerCancel}
              className="absolute inset-y-0 left-1/3 z-30 w-1/3"
              style={{ touchAction: "none" }}
            />
          </div>

          {isDesktop && (
            <button
              type="button"
              onClick={goNext}
              aria-label="다음 페이지"
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 text-paper/60 hover:text-paper sm:right-2"
            >
              <ChevronRight className="size-8" />
            </button>
          )}
        </div>

        <div className="shrink-0 overflow-hidden">
          <div
            className={`transition-all duration-300 ${chromeVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
          >
            <ReaderBottomBar
              variant={isDesktop ? "desktop" : "mobile"}
              currentPage={currentPage}
              totalPages={pages.length}
              onPrev={goPrev}
              onNext={goNext}
              onSeek={goTo}
              onToggleToc={() => setTocOpen(true)}
            />
          </div>
        </div>
      </div>

      {tocOpen && (
        <ReaderToc toc={book.toc} activeBlockId={activeTocBlockId} onJump={jumpToBlock} onClose={() => setTocOpen(false)} />
      )}
      {settingsOpen && (
        <ReaderSettingsPanel
          fontSize={fontSize}
          onFontSizeChange={clampFontSize}
          lineHeight={lineHeight}
          onLineHeightChange={clampLineHeight}
          theme={theme}
          onThemeChange={setTheme}
          onReset={resetSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {shareOpen && book.shareUrl && (
        <ReaderShareMenu url={book.shareUrl} title={book.title} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
