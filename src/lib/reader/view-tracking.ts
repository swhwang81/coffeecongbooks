import { browserSupabase } from "@/lib/supabase/client";

const ANONYMOUS_ID_KEY = "coffeecong:anonymous-id";
const DEDUP_PREFIX = "coffeecong:lastview:";
// Re-opening the same book (refresh, back/forward, a stray double-mount)
// within this window doesn't count as a new view — spec §17 "익명 ID 기반
// 중복 조회 최소화". Doesn't need to be exact, just reduce obvious repeats.
const DEDUP_WINDOW_MS = 30 * 60 * 1000;

function getAnonymousId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.localStorage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  } catch {
    return null; // Storage disabled (private browsing) — view still gets recorded, just without dedup.
  }
}

/**
 * Records a book view (spec §17) — fire-and-forget, called once per Reader
 * mount. Inserts straight from the browser via the anon key (RLS: "Anyone
 * can create book views", insert-only) rather than through a route handler,
 * since there's no session state to attach and no response to wait on.
 *
 * Deliberately collects nothing beyond `book_id` + a client-generated
 * anonymous id (spec §7 "개인정보를 불필요하게 수집하지 않는다" — no
 * user_agent/referrer/etc, even though earlier phases' schema has room
 * for it).
 */
export function recordBookView(bookId: string): void {
  if (typeof window === "undefined" || !browserSupabase) return;

  const dedupKey = `${DEDUP_PREFIX}${bookId}`;
  try {
    const last = window.localStorage.getItem(dedupKey);
    if (last && Date.now() - Number(last) < DEDUP_WINDOW_MS) return;
    window.localStorage.setItem(dedupKey, String(Date.now()));
  } catch {
    // Storage disabled — fall through and record anyway rather than never counting views at all.
  }

  const viewerId = getAnonymousId();
  // supabase-js query builders are lazy thenables — the request is only
  // actually dispatched once something calls `.then()`/awaits it. A bare
  // `void` on the builder itself (without `.then()`) builds the query and
  // silently never sends it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (browserSupabase as any).from("book_views").insert({ book_id: bookId, viewer_id: viewerId }).then(
    () => {},
    () => {}
  );
}
