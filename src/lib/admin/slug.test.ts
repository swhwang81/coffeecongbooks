import { describe, expect, it } from "vitest";
import { buildSlug } from "./slug";

describe("buildSlug", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(buildSlug("Coffeecong Books Guide")).toBe("coffeecong-books-guide");
  });

  it("keeps Korean characters", () => {
    expect(buildSlug("커피콩 북스 가이드")).toBe("커피콩-북스-가이드");
  });

  it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
    expect(buildSlug("Hello, World!! & Co.")).toBe("hello-world-co");
  });

  it("trims leading and trailing hyphens", () => {
    expect(buildSlug("  --Weird Title--  ")).toBe("weird-title");
  });

  it("falls back to a timestamp-based slug when nothing slug-safe remains", () => {
    expect(buildSlug("!!!")).toMatch(/^book-\d+$/);
  });
});
