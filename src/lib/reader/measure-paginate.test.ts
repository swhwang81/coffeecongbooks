import { describe, expect, it } from "vitest";
import { findPageForPosition, paginateBlocks, type ReaderPage } from "./measure-paginate";
import type { Block } from "@/lib/docx/blocks";

// `paginateBlocks` itself needs real layout measurement (scrollHeight/
// clientHeight), which jsdom doesn't implement — it always reports 0, so
// there's no meaningful way to unit-test overflow detection without a real
// browser (that's what the Playwright E2E suite covers instead). This
// covers `findPageForPosition`, the pure block-id/word-offset → page
// lookup that spec §13's reading-position restore depends on.

function page(blockIds: string[], firstBlockWordOffset = 0): ReaderPage {
  return { html: "", blockIds, firstBlockWordOffset };
}

describe("findPageForPosition", () => {
  it("finds the page where a block is the leading block", () => {
    const pages = [page([]), page(["a"]), page(["b", "c"])];
    const blockIdToPage = new Map([
      ["a", 1],
      ["b", 2],
      ["c", 2],
    ]);
    expect(findPageForPosition(pages, "a", 0, blockIdToPage)).toBe(1);
  });

  it("picks the continuation page whose wordOffset is the closest match at or before the saved offset", () => {
    // A single long paragraph ("split-0002") split across pages 1, 2, 3 at
    // word offsets 0, 50, 120 — this is exactly the shape `paginateBlocks`
    // produces for a paragraph too long for one page.
    const pages = [
      page([]),
      page(["split-0002"], 0),
      page(["split-0002"], 50),
      page(["split-0002"], 120),
    ];
    const blockIdToPage = new Map([["split-0002", 1]]);

    // Saved position was mid-way through the second continuation page (offset 70) — should resolve to page 2, not page 1 (the block's first appearance) or page 3 (a later fragment).
    expect(findPageForPosition(pages, "split-0002", 70, blockIdToPage)).toBe(2);
    // Exactly at a page's starting offset resolves to that page.
    expect(findPageForPosition(pages, "split-0002", 120, blockIdToPage)).toBe(3);
    // Before any fragment's offset still resolves to the first (offset 0).
    expect(findPageForPosition(pages, "split-0002", 10, blockIdToPage)).toBe(1);
  });

  it("falls back to the block's first appearance when it's never a page's leading block", () => {
    // "b" only ever appears as the *second* block on a page (shares the page with "a").
    const pages = [page([]), page(["a", "b"])];
    const blockIdToPage = new Map([
      ["a", 1],
      ["b", 1],
    ]);
    expect(findPageForPosition(pages, "b", 0, blockIdToPage)).toBe(1);
  });

  it("returns undefined for a block id that resolves nowhere", () => {
    const pages = [page([])];
    expect(findPageForPosition(pages, "ghost", 0, new Map())).toBeUndefined();
  });
});

describe("paginateBlocks — chapter headings force a page break", () => {
  // jsdom always reports scrollHeight/clientHeight as 0, so `fits()`
  // (`scrollHeight <= clientHeight + 1`) is trivially true for any content
  // — meaningless for testing overflow-driven breaks, but that also means
  // the *only* thing that can force a break in this environment is the
  // explicit, measurement-independent "chapter heading always starts fresh"
  // rule this test targets. Any actual overflow behavior stays covered by
  // the Playwright E2E suite, per the module comment above.
  function heading(id: string, level: 1 | 2 | 3 | 4, text: string): Block {
    const tag = `h${level}`;
    return { id, type: "heading", level, html: `<${tag} data-block-id="${id}">${text}</${tag}>` };
  }

  function paragraph(id: string, text: string): Block {
    return { id, type: "paragraph", html: `<p data-block-id="${id}">${text}</p>` };
  }

  it("starts a new page at a level-2 (chapter) heading even though it would otherwise fit", () => {
    const container = document.createElement("div");
    const blocks: Block[] = [paragraph("p1", "intro"), heading("h1", 2, "Chapter One"), paragraph("p2", "body")];

    const { pages } = paginateBlocks(blocks, container);

    // pages[0] is always the synthetic cover page.
    expect(pages[1].blockIds).toEqual(["p1"]);
    expect(pages[2].blockIds).toEqual(["h1", "p2"]);
  });

  it("does not force a break for level-1/3/4 headings", () => {
    const container = document.createElement("div");
    const blocks: Block[] = [paragraph("p1", "intro"), heading("h1", 3, "Section"), paragraph("p2", "body")];

    const { pages } = paginateBlocks(blocks, container);

    expect(pages[1].blockIds).toEqual(["p1", "h1", "p2"]);
  });

  it("a chapter heading right at the very start of the book doesn't produce a spurious empty page", () => {
    const container = document.createElement("div");
    const blocks: Block[] = [heading("h1", 2, "Chapter One"), paragraph("p1", "body")];

    const { pages } = paginateBlocks(blocks, container);

    expect(pages[1].blockIds).toEqual(["h1", "p1"]);
  });

  it("back-to-back chapter headings each get their own page", () => {
    const container = document.createElement("div");
    const blocks: Block[] = [heading("h1", 2, "Chapter One"), heading("h2", 2, "Chapter Two")];

    const { pages } = paginateBlocks(blocks, container);

    expect(pages[1].blockIds).toEqual(["h1"]);
    expect(pages[2].blockIds).toEqual(["h2"]);
  });
});
