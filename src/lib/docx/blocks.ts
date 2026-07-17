import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

export type Block =
  | { id: string; type: "heading"; level: 1 | 2 | 3 | 4; html: string }
  | { id: string; type: "paragraph"; html: string }
  | { id: string; type: "blockquote"; html: string }
  | { id: string; type: "list"; ordered: boolean; html: string }
  | { id: string; type: "table"; html: string }
  | { id: string; type: "divider"; html: string }
  | { id: string; type: "image"; src: string; alt: string; width?: number; height?: number };

export interface TocEntry {
  blockId: string;
  title: string;
  level: 1 | 2 | 3 | 4;
}

export interface BuildBlocksResult {
  html: string;
  blocks: Block[];
  toc: TocEntry[];
}

const HEADING_LEVEL: Record<string, 1 | 2 | 3 | 4> = { h1: 1, h2: 2, h3: 3, h4: 4 };

function isElement(node: AnyNode): node is Element {
  return node.type === "tag";
}

/** A <p> whose only meaningful child is a single <img> — mammoth's shape for an image paragraph. */
function asSoleImage(
  $: cheerio.CheerioAPI,
  el: Element
): { src: string; alt: string; width?: number; height?: number } | null {
  if (el.tagName.toLowerCase() !== "p" && el.tagName.toLowerCase() !== "figure") return null;
  const children = el.children.filter((c) => !(c.type === "text" && !c.data.trim()));
  if (children.length !== 1 || !isElement(children[0]) || children[0].tagName.toLowerCase() !== "img") {
    return null;
  }
  const img = $(children[0]);
  const width = Number(img.attr("width"));
  const height = Number(img.attr("height"));
  return {
    src: img.attr("src") ?? "",
    alt: img.attr("alt") ?? "",
    ...(width > 0 && height > 0 ? { width, height } : {}),
  };
}

/**
 * Assigns a stable `data-block-id` to every top-level element and builds
 * the parallel block JSON + TOC (spec §10 "콘텐츠 블록"). This is the
 * single source of truth both the TOC and reading-position system read
 * from later — not just an HTML rendering artifact.
 */
export function buildBlocks(sanitizedHtml: string): BuildBlocksResult {
  const $ = cheerio.load(sanitizedHtml, null, false);
  const blocks: Block[] = [];
  const toc: TocEntry[] = [];
  let counter = 0;

  const topLevel = $.root()
    .contents()
    .toArray()
    .filter(isElement);

  for (const el of topLevel) {
    const tagName = el.tagName.toLowerCase();
    counter += 1;
    const id = `block-${String(counter).padStart(4, "0")}`;
    const node = $(el);

    const image = asSoleImage($, el);
    if (image) {
      node.attr("data-block-id", id);
      blocks.push({ id, type: "image", src: image.src, alt: image.alt, width: image.width, height: image.height });
      continue;
    }

    node.attr("data-block-id", id);
    const html = $.html(node);

    if (tagName in HEADING_LEVEL) {
      const level = HEADING_LEVEL[tagName];
      const title = node.text().trim();
      blocks.push({ id, type: "heading", level, html });
      toc.push({ blockId: id, title, level });
      continue;
    }

    if (tagName === "blockquote") {
      blocks.push({ id, type: "blockquote", html });
      continue;
    }

    if (tagName === "ul" || tagName === "ol") {
      blocks.push({ id, type: "list", ordered: tagName === "ol", html });
      continue;
    }

    if (tagName === "table") {
      blocks.push({ id, type: "table", html });
      continue;
    }

    if (tagName === "hr") {
      blocks.push({ id, type: "divider", html });
      continue;
    }

    // p, section, article, figure(with caption), or anything else allowed
    // through sanitize but not specifically classified above.
    blocks.push({ id, type: "paragraph", html });
  }

  return { html: $.root().html() ?? "", blocks, toc };
}
