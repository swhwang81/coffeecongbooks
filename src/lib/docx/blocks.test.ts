import { describe, expect, it } from "vitest";
import { buildBlocks } from "./blocks";

describe("buildBlocks — block ID assignment", () => {
  it("assigns stable, sequential, zero-padded ids to every top-level element", () => {
    const { blocks } = buildBlocks("<h1>Title</h1><p>one</p><p>two</p>");
    expect(blocks.map((b) => b.id)).toEqual(["block-0001", "block-0002", "block-0003"]);
  });

  it("stamps the same id onto the returned HTML's data-block-id attribute", () => {
    const { html, blocks } = buildBlocks("<p>hello</p>");
    expect(html).toContain(`data-block-id="${blocks[0].id}"`);
  });

  it("classifies each top-level tag by type", () => {
    const { blocks } = buildBlocks(
      "<h2>Heading</h2><p>Para</p><blockquote>Quote</blockquote><ul><li>a</li></ul><ol><li>b</li></ol><table><tr><td>c</td></tr></table><hr>"
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "blockquote",
      "list",
      "list",
      "table",
      "divider",
    ]);
  });

  it("detects an ordered vs unordered list", () => {
    const { blocks } = buildBlocks("<ul><li>a</li></ul><ol><li>b</li></ol>");
    expect(blocks[0]).toMatchObject({ type: "list", ordered: false });
    expect(blocks[1]).toMatchObject({ type: "list", ordered: true });
  });

  it("recognizes a <p> wrapping a sole <img> as an image block, not a paragraph", () => {
    const { blocks } = buildBlocks('<p><img src="foo.png" alt="Foo" width="100" height="50"></p>');
    expect(blocks[0]).toMatchObject({ type: "image", src: "foo.png", alt: "Foo", width: 100, height: 50 });
  });

  it("omits width/height on an image block when the source has no valid dimensions", () => {
    const { blocks } = buildBlocks('<p><img src="foo.png" alt=""></p>');
    expect(blocks[0]).toMatchObject({ type: "image", src: "foo.png" });
    expect((blocks[0] as { width?: number }).width).toBeUndefined();
  });

  it("treats a <p> with an image plus other content as a plain paragraph, not an image block", () => {
    const { blocks } = buildBlocks('<p><img src="foo.png" alt="">caption text</p>');
    expect(blocks[0].type).toBe("paragraph");
  });
});

describe("buildBlocks — TOC generation", () => {
  it("adds every heading to the TOC with its level and trimmed text", () => {
    const { toc } = buildBlocks("<h1>  Book Title  </h1><p>ignored</p><h2>Chapter 1</h2><h3>Section 1.1</h3>");
    expect(toc).toEqual([
      { blockId: "block-0001", title: "Book Title", level: 1 },
      { blockId: "block-0003", title: "Chapter 1", level: 2 },
      { blockId: "block-0004", title: "Section 1.1", level: 3 },
    ]);
  });

  it("produces an empty TOC when there are no headings", () => {
    const { toc } = buildBlocks("<p>just a paragraph</p><ul><li>a</li></ul>");
    expect(toc).toEqual([]);
  });

  it("strips nested inline markup from a heading's TOC title", () => {
    const { toc } = buildBlocks("<h2>Chapter <strong>Two</strong></h2>");
    expect(toc[0].title).toBe("Chapter Two");
  });
});
