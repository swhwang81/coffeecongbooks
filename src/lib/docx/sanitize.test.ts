import { describe, expect, it } from "vitest";
import { sanitizeDocxHtml } from "./sanitize";

describe("sanitizeDocxHtml", () => {
  it("strips dangerous containers entirely, including their contents", () => {
    const { html, removedTags } = sanitizeDocxHtml("<p>ok</p><script>alert(1)</script><iframe src='x'></iframe>");
    expect(html).toBe("<p>ok</p>");
    expect(removedTags).toContain("script");
    expect(removedTags).toContain("iframe");
  });

  it("unwraps unrecognized tags but keeps their content", () => {
    const { html, removedTags } = sanitizeDocxHtml("<div><p>kept</p></div>");
    expect(html).toBe("<p>kept</p>");
    expect(removedTags).toContain("div");
  });

  it("strips javascript: URLs from href/src but keeps the element", () => {
    const { html } = sanitizeDocxHtml('<a href="javascript:alert(1)">click</a>');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<a>click</a>");
  });

  it("strips dangerous data: URLs but allows data:image/*", () => {
    const stripped = sanitizeDocxHtml('<img src="data:text/html;base64,abcd">');
    expect(stripped.html).not.toContain("data:text/html");

    const kept = sanitizeDocxHtml('<img src="data:image/png;base64,abcd">');
    expect(kept.html).toContain("data:image/png");
  });

  it("strips inline event handler attributes", () => {
    const { html } = sanitizeDocxHtml('<p onclick="alert(1)">text</p>');
    expect(html).not.toContain("onclick");
  });

  it("drops attributes not on the per-tag allow-list", () => {
    const { html } = sanitizeDocxHtml('<table style="width:100%" class="foo"><tr><td>x</td></tr></table>');
    expect(html).not.toContain("style=");
    expect(html).not.toContain("class=");
  });

  it("keeps allowed tags and attributes untouched", () => {
    const { html, removedTags } = sanitizeDocxHtml(
      '<h1>Title</h1><p><strong>bold</strong> and <a href="https://example.com">link</a></p>'
    );
    expect(html).toBe('<h1>Title</h1><p><strong>bold</strong> and <a href="https://example.com">link</a></p>');
    expect(removedTags).toEqual([]);
  });
});
