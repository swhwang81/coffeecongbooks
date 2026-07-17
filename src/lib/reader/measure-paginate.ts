import type { Block } from "@/lib/docx/blocks";
import { splitHtmlAtWordBudget } from "./split-html";

export interface ReaderPage {
  html: string;
  isCover?: boolean;
  /** Block ids (or, for a split paragraph's continuation, its originating id) present on this page, in order. */
  blockIds: string[];
  /**
   * Word offset into `blockIds[0]`'s original text where this page's
   * content begins — 0 unless `blockIds[0]` is a mid-paragraph
   * continuation. Lets reading-position restore (spec §13) tell apart two
   * pages that share the same leading block id (the head and tail of one
   * split paragraph), instead of always snapping back to the head.
   */
  firstBlockWordOffset: number;
}

export interface PaginateResult {
  pages: ReaderPage[];
  /** First page a block appears on — used for TOC jumps and position restore. */
  blockIdToPage: Map<string, number>;
}

const SPLITTABLE_TYPES = new Set(["paragraph", "blockquote"]);

function blockHtml(block: Block): string {
  if (block.type === "image") {
    const dims = block.width && block.height ? ` width="${block.width}" height="${block.height}"` : "";
    return `<div data-block-id="${block.id}" class="reader-image"><img src="${block.src}" alt="${block.alt}"${dims} /></div>`;
  }
  return block.html;
}

/**
 * Real DOM-measurement pagination (spec §12) — the core procedure:
 * measure the page container, lay blocks into it one at a time, detect
 * `scrollHeight > clientHeight` overflow, push the overflowing block to
 * the next page, and split any single block too long to fit a page on its
 * own at a word boundary.
 *
 * `container` must already be sized/styled exactly like a real page
 * (width, height, padding, font-size, line-height, font-family) — this
 * function only measures, it doesn't decide sizing itself.
 *
 * Not handled (see Phase 11 notes in todo.md): mid-list and mid-table
 * splitting — both are kept atomic and pushed to the next page whole.
 */
export function paginateBlocks(blocks: Block[], container: HTMLElement): PaginateResult {
  const pages: ReaderPage[] = [{ html: "", isCover: true, blockIds: [], firstBlockWordOffset: 0 }];
  const blockIdToPage = new Map<string, number>();

  let currentHtml = "";
  let currentBlockIds: string[] = [];
  let currentFirstBlockWordOffset = 0;

  function fits(candidateHtml: string): boolean {
    container.innerHTML = candidateHtml;
    return container.scrollHeight <= container.clientHeight + 1; // +1: subpixel rounding
  }

  function commitPage() {
    if (currentBlockIds.length === 0) return;
    pages.push({ html: currentHtml, blockIds: currentBlockIds, firstBlockWordOffset: currentFirstBlockWordOffset });
    currentHtml = "";
    currentBlockIds = [];
    currentFirstBlockWordOffset = 0;
  }

  function recordFirstAppearance(blockId: string) {
    if (!blockIdToPage.has(blockId)) {
      blockIdToPage.set(blockId, pages.length); // index this block will land on once committed
    }
  }

  // Queue so a split block's tail can be re-processed as if it were the
  // next block. `wordOffset` tracks how many words of the *original* block
  // were already consumed by earlier fragments, for position restore.
  const queue: Array<{ id: string; type: string; html: string; wordOffset: number }> = blocks.map((b) => ({
    id: b.id,
    type: b.type,
    html: blockHtml(b),
    wordOffset: 0,
  }));

  while (queue.length > 0) {
    const block = queue.shift()!;
    const candidate = currentHtml + block.html;

    if (fits(candidate)) {
      if (currentBlockIds.length === 0) currentFirstBlockWordOffset = block.wordOffset;
      currentHtml = candidate;
      currentBlockIds.push(block.id);
      recordFirstAppearance(block.id);
      continue;
    }

    if (currentBlockIds.length > 0) {
      // Doesn't fit alongside what's already on this page — start fresh.
      commitPage();
      queue.unshift(block);
      continue;
    }

    // Doesn't fit even alone on an empty page.
    if (SPLITTABLE_TYPES.has(block.type)) {
      const budget = findMaxWordBudget(block.html, container);
      if (budget > 0) {
        const { head, tail } = splitHtmlAtWordBudget(block.html, budget);
        if (head && tail) {
          currentFirstBlockWordOffset = block.wordOffset;
          currentHtml = head;
          currentBlockIds.push(block.id);
          recordFirstAppearance(block.id);
          queue.unshift({ id: block.id, type: block.type, html: tail, wordOffset: block.wordOffset + budget });
          continue;
        }
      }
    }

    // Can't split (heading/list/table/image/divider, or a split attempt
    // failed) — accept the overflow rather than looping forever or
    // dropping content.
    currentFirstBlockWordOffset = block.wordOffset;
    currentHtml = block.html;
    currentBlockIds.push(block.id);
    recordFirstAppearance(block.id);
  }

  commitPage();
  preventOrphanHeadings(pages, blockIdToPage, container);

  return { pages, blockIdToPage };
}

/**
 * Finds the page to resume on for a saved or in-session reading position
 * (spec §13's restore algorithm). Among pages *starting with* `blockId`
 * (true both for an unsplit block's single page and for every continuation
 * fragment of a block split across pages), picks the latest one whose
 * fragment begins at or before `wordOffset` — this is what tells apart the
 * head and tail pages of one long split paragraph, which otherwise share
 * the same leading block id. Falls back to the block's first appearance
 * (spec's "정확한 block을 못 찾으면 가장 가까운 이전 block으로") when it's
 * never a page's leading block, e.g. it always shares a page with content
 * before it.
 */
export function findPageForPosition(
  pages: ReaderPage[],
  blockId: string,
  wordOffset: number,
  blockIdToPage: Map<string, number>
): number | undefined {
  let best: number | undefined;
  for (let i = 0; i < pages.length; i += 1) {
    if (pages[i].blockIds[0] === blockId && pages[i].firstBlockWordOffset <= wordOffset) {
      best = i;
    }
  }
  return best ?? blockIdToPage.get(blockId);
}

/** Binary search for the most words of `html` that fit in `container` on their own. */
function findMaxWordBudget(html: string, container: HTMLElement): number {
  const template = document.createElement("template");
  template.innerHTML = html;
  const totalWords = (template.content.textContent ?? "").split(/\s+/).filter(Boolean).length;
  if (totalWords <= 1) return totalWords;

  let lo = 1;
  let hi = totalWords;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const { head } = splitHtmlAtWordBudget(html, mid);
    container.innerHTML = head;
    if (container.scrollHeight <= container.clientHeight + 1) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/**
 * If a page ends with a heading and nothing else, move that heading to the
 * start of the next page instead (spec §12 "제목이 페이지 맨 아래에 홀로
 * 남는 현상"). Skipped for the last page — there's nothing to push it to.
 *
 * Only moves the heading if it actually fits alongside whatever's already
 * on the next page — an unsplittable block (list/table/image) there can
 * mean heading + block together overflow, which would trade one cosmetic
 * problem (an orphan heading) for a real one (clipped content). No
 * clipping wins.
 */
function preventOrphanHeadings(pages: ReaderPage[], blockIdToPage: Map<string, number>, container: HTMLElement) {
  for (let i = 1; i < pages.length - 1; i += 1) {
    const page = pages[i];
    if (page.blockIds.length < 2) continue;

    const lastId = page.blockIds[page.blockIds.length - 1];
    if (!isHeadingHtml(page.html, lastId)) continue;

    const headingHtml = extractBlockHtml(page.html, lastId);
    if (!headingHtml) continue;

    const nextPage = pages[i + 1];
    container.innerHTML = headingHtml + nextPage.html;
    if (container.scrollHeight > container.clientHeight + 1) continue;

    page.html = page.html.replace(headingHtml, "");
    page.blockIds.pop();

    nextPage.html = headingHtml + nextPage.html;
    nextPage.blockIds.unshift(lastId);
    nextPage.firstBlockWordOffset = 0;
    blockIdToPage.set(lastId, i + 1);
  }
}

function isHeadingHtml(pageHtml: string, blockId: string): boolean {
  const re = new RegExp(`<(h[1-4])[^>]*data-block-id="${blockId}"`, "i");
  return re.test(pageHtml);
}

function extractBlockHtml(pageHtml: string, blockId: string): string | null {
  const template = document.createElement("template");
  template.innerHTML = pageHtml;
  const el = template.content.querySelector(`[data-block-id="${blockId}"]`);
  return el ? el.outerHTML : null;
}
