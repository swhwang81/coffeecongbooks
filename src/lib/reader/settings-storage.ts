import type { ReaderTheme } from "@/components/reader/reader";

// Anonymous readers' progress lives in localStorage, keyed per book (spec
// §13) — never a server table for non-logged-in users (the `reading_progress`
// table exists only for a future logged-in-user path, per spec §7).
export interface ReaderPersistedState {
  fontSize: number;
  lineHeight: number;
  theme: ReaderTheme;
  /** First block id on the page the reader was last on. */
  blockId: string | null;
  /**
   * Word offset into `blockId`'s text where that page began — spec §13
   * asks for a "block 내부 문자 offset". This codebase's pagination (and
   * paragraph splitting) is word-granular throughout, not character-
   * granular — Korean text has no reliable in-sentence character boundary
   * to split on either — so position is tracked at the same word
   * granularity rather than introducing a second, finer unit nothing else
   * uses. It's precise enough to tell apart the head and tail pages of one
   * long split paragraph, which is all the restore algorithm (find the
   * page, not a scroll-to-character position) needs.
   */
  wordOffset: number;
  /** 0–1, this block's ordinal position among all blocks — stable across
   *  devices/font sizes, unlike a raw page-number ratio (spec §13). */
  progress: number;
  updatedAt: string;
}

function storageKey(bookSlug: string) {
  return `coffeecong:reader:${bookSlug}`;
}

export function loadReaderSettings(bookSlug: string): Partial<ReaderPersistedState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(bookSlug));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ReaderPersistedState>;
  } catch {
    return null;
  }
}

function persist(bookSlug: string, state: Partial<Omit<ReaderPersistedState, "updatedAt">>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadReaderSettings(bookSlug) ?? {};
    const next = { ...existing, ...state, updatedAt: new Date().toISOString() };
    window.localStorage.setItem(storageKey(bookSlug), JSON.stringify(next));
  } catch {
    // Storage full or disabled (private browsing) — nothing persists.
  }
}

export function saveReaderSettings(bookSlug: string, state: Pick<ReaderPersistedState, "fontSize" | "lineHeight" | "theme">): void {
  persist(bookSlug, state);
}

export interface ReaderPosition {
  blockId: string;
  wordOffset: number;
  progress: number;
}

export function loadReaderPosition(bookSlug: string): ReaderPosition | null {
  const stored = loadReaderSettings(bookSlug);
  if (!stored?.blockId) return null;
  return { blockId: stored.blockId, wordOffset: stored.wordOffset ?? 0, progress: stored.progress ?? 0 };
}

export function saveReaderPosition(bookSlug: string, position: ReaderPosition): void {
  persist(bookSlug, position);
}
