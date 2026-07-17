import { describe, expect, it } from "vitest";
import { splitHtmlAtWordBudget } from "./split-html";

describe("splitHtmlAtWordBudget", () => {
  it("keeps everything in head, empty tail, when the content fits the budget", () => {
    const { head, tail } = splitHtmlAtWordBudget("<p>one two three</p>", 10);
    expect(head).toBe("<p>one two three</p>");
    expect(tail).toBe("");
  });

  it("splits a plain paragraph at the exact word boundary", () => {
    const { head, tail } = splitHtmlAtWordBudget("<p>one two three four five</p>", 2);
    expect(head).toBe("<p>one two </p>");
    expect(tail).toBe("<p>three four five</p>");
  });

  it("preserves nested inline tags across the split", () => {
    const { head, tail } = splitHtmlAtWordBudget("<p>one <strong>two three</strong> four five</p>", 2);
    expect(head).toContain("<strong>two");
    expect(head).not.toContain("four");
    expect(tail).not.toContain("one");
    // Both fragments keep the original top-level tag (data-block-id etc. would ride along too).
    expect(head.startsWith("<p>")).toBe(true);
    expect(tail.startsWith("<p>")).toBe(true);
  });

  it("prunes an inline element left fully empty by the split, without duplicating its words into tail", () => {
    // Regression test: the budget is exhausted exactly at the boundary
    // between "one " and <strong>, before <strong> is ever visited.
    // `keepFirstWords` used to leave a not-yet-visited sibling completely
    // untouched in that case instead of removing it, so "two three" ended
    // up rendered on *both* the split page and its continuation.
    const { head, tail } = splitHtmlAtWordBudget("<p>one <strong>two three</strong></p>", 1);
    expect(head).toBe("<p>one </p>");
    expect(tail).toBe("<p><strong>two three</strong></p>");
  });

  it("returns the full content as tail with empty head for a zero budget", () => {
    const { head, tail } = splitHtmlAtWordBudget("<p>one two</p>", 0);
    expect(head).toBe("");
    expect(tail).toBe("<p>one two</p>");
  });

  it("never duplicates or drops words across head+tail, at every possible budget", () => {
    const html = "<p>one <strong>two three</strong> four <em>five six seven</em> eight</p>";
    const totalWords = 8;
    for (let budget = 0; budget <= totalWords + 1; budget += 1) {
      const { head, tail } = splitHtmlAtWordBudget(html, budget);
      const wordsIn = (fragment: string) => (fragment.replace(/<[^>]+>/g, " ").match(/\b\w+\b/g) ?? []);
      const combined = [...wordsIn(head), ...wordsIn(tail)];
      expect(combined, `budget=${budget}`).toEqual(["one", "two", "three", "four", "five", "six", "seven", "eight"]);
    }
  });
});
