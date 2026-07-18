import { describe, expect, it } from "vitest";
import { normalizeDocxStyleName, normalizeDocxStyles } from "./style-normalize";

describe("normalizeDocxStyleName", () => {
  it("collapses any numbered quote-style suffix to the canonical name", () => {
    expect(normalizeDocxStyleName("인용")).toBe("인용");
    expect(normalizeDocxStyleName("인용1")).toBe("인용");
    expect(normalizeDocxStyleName("인용2")).toBe("인용");
    // Word's suffix has no upper bound — a high number must still resolve.
    expect(normalizeDocxStyleName("인용47")).toBe("인용");
  });

  it("collapses numbered emphasized-quote variants separately from plain quotes", () => {
    expect(normalizeDocxStyleName("강조 인용3")).toBe("강조 인용");
    expect(normalizeDocxStyleName("강조인용2")).toBe("강조 인용");
  });

  it("collapses numbered '기본' (Normal-equivalent) variants", () => {
    expect(normalizeDocxStyleName("기본")).toBe("기본");
    expect(normalizeDocxStyleName("기본1")).toBe("기본");
  });

  it("normalizes heading level spacing and collapses levels beyond 3 to the deepest mapped level", () => {
    expect(normalizeDocxStyleName("제목1")).toBe("제목 1");
    expect(normalizeDocxStyleName("제목 2")).toBe("제목 2");
    expect(normalizeDocxStyleName("제목5")).toBe("제목 3");
  });

  it("never touches the bare '제목' book-title style — it's a distinct mapping from '제목 N'", () => {
    expect(normalizeDocxStyleName("제목")).toBe("제목");
  });

  it("leaves unrelated style names untouched", () => {
    expect(normalizeDocxStyleName("Heading 1")).toBe("Heading 1");
    expect(normalizeDocxStyleName("본문")).toBe("본문");
  });
});

describe("normalizeDocxStyles (document tree walk)", () => {
  it("rewrites styleName on paragraph elements and recurses into children", () => {
    const doc = {
      type: "document",
      children: [
        { type: "paragraph", styleName: "인용2", children: [] },
        { type: "table", children: [{ type: "paragraph", styleName: "제목3", children: [] }] },
      ],
    };

    const result = normalizeDocxStyles(doc);

    expect(result.children[0].styleName).toBe("인용");
    expect(result.children[1].children[0].styleName).toBe("제목 3");
  });

  it("leaves paragraphs with no styleName untouched", () => {
    const paragraph = { type: "paragraph", children: [] };
    expect(normalizeDocxStyles(paragraph)).toEqual(paragraph);
  });
});
