// Splits a block's HTML at a word boundary while preserving nested inline
// tags (<strong>/<em>/<u>/<a>/<span>) — spec §12 "긴 문단은 문장 또는 단어
// 단위로 분할". Sentence-boundary splitting isn't reliable for Korean (no
// consistent ". " terminator), so this always splits at word boundaries;
// visually that reads the same as a mid-paragraph page break either way.
//
// Client-side only — needs a live `Document` to parse/walk/clone DOM trees.

/** Word count in a DOM subtree (whitespace-delimited runs of text). */
function countWords(root: Node): number {
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const words = (node.textContent ?? "").split(/\s+/).filter(Boolean);
    count += words.length;
    node = walker.nextNode();
  }
  return count;
}

/**
 * Removes empty inline elements left behind after text truncation
 * (e.g. an <strong> whose only text node was fully removed).
 */
function pruneEmptyElements(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const empties: Element[] = [];
  let node = walker.nextNode() as Element | null;
  while (node) {
    if (!node.textContent?.trim() && node.tagName !== "BR" && node.tagName !== "IMG") {
      empties.push(node);
    }
    node = walker.nextNode() as Element | null;
  }
  for (const el of empties) el.remove();
}

/**
 * Mutates `root` in place, keeping only the first `wordBudget` words
 * (whitespace-delimited) and removing everything after. Returns the
 * number of words actually kept (may be less than the budget if the
 * subtree is shorter).
 */
function keepFirstWords(root: Node, wordBudget: number): number {
  let remaining = wordBudget;

  function walk(node: Node): boolean {
    // Returns true once the budget is exhausted (caller should stop and
    // remove any further siblings).
    if (remaining <= 0) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const matches = Array.from(text.matchAll(/\S+\s*/g));
      if (matches.length <= remaining) {
        remaining -= matches.length;
        return false;
      }
      const kept = matches.slice(0, remaining).map((m) => m[0]).join("");
      node.textContent = kept;
      remaining = 0;
      return true;
    }

    const children = Array.from(node.childNodes);
    for (const child of children) {
      // The budget ran out on an *earlier* sibling, before `child` was
      // ever visited — `walk(child)`'s own `remaining <= 0` guard would
      // return `true` immediately without touching it, leaving the whole
      // child (e.g. an untouched `<strong>...</strong>`) behind in a page
      // that's supposed to exclude it entirely, only for the same words to
      // reappear via `removeFirstWords` on the next page's continuation.
      // Remove it outright instead of recursing.
      if (remaining <= 0) {
        child.remove();
        continue;
      }
      const exhausted = walk(child);
      if (exhausted) {
        // Remove every sibling after `child` within this node.
        let next = child.nextSibling;
        while (next) {
          const toRemove = next;
          next = next.nextSibling;
          toRemove.remove();
        }
        return true;
      }
    }
    return remaining <= 0;
  }

  walk(root);
  if (root instanceof Element) pruneEmptyElements(root);
  return wordBudget - Math.max(remaining, 0);
}

/**
 * Mutates `root` in place, removing the first `wordCount` words and
 * keeping the remainder — the mirror of `keepFirstWords`, used to build
 * the "rest of this paragraph" continuation on the next page.
 */
function removeFirstWords(root: Node, wordCount: number): void {
  let remaining = wordCount;

  function walk(node: Node): boolean {
    // Returns true once the removal budget is exhausted.
    if (remaining <= 0) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      const matches = Array.from(text.matchAll(/\S+\s*/g));
      if (matches.length <= remaining) {
        remaining -= matches.length;
        node.textContent = "";
        return false;
      }
      const kept = matches.slice(remaining).map((m) => m[0]).join("");
      node.textContent = kept;
      remaining = 0;
      return true;
    }

    const children = Array.from(node.childNodes);
    for (const child of children) {
      const exhausted = walk(child);
      if (!exhausted) {
        child.remove();
      } else {
        return true;
      }
    }
    return remaining <= 0 && children.length > 0;
  }

  walk(root);
  if (root instanceof Element) pruneEmptyElements(root);
}

export interface SplitResult {
  /** HTML that fits within `wordBudget` words. */
  head: string;
  /** Remaining HTML (may be empty if everything fit). */
  tail: string;
}

/**
 * Splits a single block's HTML at the given word budget. Both halves keep
 * the original top-level tag and attributes (e.g. `data-block-id`) since
 * they're built by cloning the parsed element, not re-creating it.
 */
export function splitHtmlAtWordBudget(html: string, wordBudget: number): SplitResult {
  const template = document.createElement("template");
  template.innerHTML = html;
  const original = template.content.firstElementChild;

  if (!original || wordBudget <= 0) {
    return { head: "", tail: html };
  }

  const totalWords = countWords(original);
  if (totalWords <= wordBudget) {
    return { head: html, tail: "" };
  }

  const headEl = original.cloneNode(true) as Element;
  const wordsKept = keepFirstWords(headEl, wordBudget);

  if (wordsKept === 0) {
    return { head: "", tail: html };
  }

  const tailEl = original.cloneNode(true) as Element;
  removeFirstWords(tailEl, wordsKept);

  return { head: headEl.outerHTML, tail: tailEl.outerHTML };
}
