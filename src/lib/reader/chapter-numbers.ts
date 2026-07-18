import type { Block, TocEntry } from "@/lib/docx/blocks";

/**
 * Sequential 1-based "N장" number for each chapter-level (h2) TOC entry,
 * keyed by blockId. Section-level (h3) entries aren't numbered — only
 * chapters. Computed at render time (not stored in content_json) so it
 * applies to already-registered books too, without a reconversion.
 */
export function computeChapterNumbers(toc: TocEntry[]): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 0;
  for (const entry of toc) {
    if (entry.level !== 2) continue;
    n += 1;
    numbers.set(entry.blockId, n);
  }
  return numbers;
}

/**
 * Prefixes each chapter (h2.chapter-title) heading block's HTML with its
 * "N장 " number, so the body reads with the same numbering as the TOC.
 */
export function withChapterNumbers(blocks: Block[], toc: TocEntry[]): Block[] {
  const numbers = computeChapterNumbers(toc);
  if (numbers.size === 0) return blocks;
  return blocks.map((block) => {
    if (block.type !== "heading" || block.level !== 2) return block;
    const number = numbers.get(block.id);
    if (number == null) return block;
    return { ...block, html: block.html.replace(/^(<h2[^>]*>)/, `$1${number}장 `) };
  });
}
