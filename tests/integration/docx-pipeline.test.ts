import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { convertDocxToBookContent } from "@/lib/docx/convert";

// Real integration test: converts the project's actual sample DOCX (spec
// §10 pipeline end-to-end) using a real service-role Supabase client, which
// really uploads to the `book-assets` Storage bucket — same file this whole
// project has used for manual QA in every earlier phase. Skips itself
// (rather than failing) when Supabase credentials aren't configured, since
// this hits a real project, not a local/mocked one.
const hasSupabaseCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe.skipIf(!hasSupabaseCredentials)("DOCX conversion pipeline (integration)", () => {
  let supabase: SupabaseClient;
  const testBookId = randomUUID();

  beforeAll(() => {
    supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterAll(async () => {
    const { data: files } = await supabase.storage.from("book-assets").list(testBookId);
    if (files && files.length > 0) {
      await supabase.storage.from("book-assets").remove(files.map((f) => `${testBookId}/${f.name}`));
    }
  });

  it("converts the sample DOCX into sanitized HTML, blocks, and a TOC", async () => {
    const buffer = readFileSync(path.resolve(__dirname, "../../docx_text/Coffeecong_Books_test.docx"));

    const result = await convertDocxToBookContent(buffer, testBookId, supabase);

    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.toc.length).toBeGreaterThan(0);

    // Every block got a stable, sequential data-block-id stamped into the HTML (spec §10).
    for (const block of result.blocks) {
      expect(result.html).toContain(`data-block-id="${block.id}"`);
    }

    // Sanitizer allow-list held — nothing dangerous survived (spec §10).
    expect(result.html).not.toMatch(/<script|<iframe|javascript:/i);

    // Every TOC entry points at a real heading block.
    const blockIds = new Set(result.blocks.map((b) => b.id));
    for (const entry of result.toc) {
      expect(blockIds.has(entry.blockId)).toBe(true);
    }
  });

  it("uploads any embedded images to book-assets/{bookId}/ in Storage", async () => {
    const buffer = readFileSync(path.resolve(__dirname, "../../docx_text/Coffeecong_Books_test.docx"));
    const result = await convertDocxToBookContent(buffer, testBookId, supabase);

    const imageBlocks = result.blocks.filter((b) => b.type === "image");
    if (imageBlocks.length === 0) {
      // The sample doc may or may not embed images — either is a valid
      // real-world DOCX, so this isn't a failure, just nothing further to check.
      return;
    }

    const { data: files, error } = await supabase.storage.from("book-assets").list(testBookId);
    expect(error).toBeNull();
    expect(files?.length ?? 0).toBeGreaterThanOrEqual(imageBlocks.length);

    for (const block of imageBlocks) {
      expect(block.src).toContain(`book-assets`);
      expect(block.src).toContain(testBookId);
    }
  });
});
