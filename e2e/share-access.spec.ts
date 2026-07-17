import { test, expect } from "@playwright/test";
import { serviceRoleClient } from "./helpers/supabase";

const SLUG = `e2e-share-access-${Date.now()}`;
const TOKEN = `e2eshare${Date.now()}`;
let bookId: string | null = null;

test.describe("Share link access", () => {
  test.beforeAll(async () => {
    const supabase = serviceRoleClient();
    test.skip(!supabase, "Supabase credentials not configured");
    const { data: src } = await supabase!.from("books").select("content_html,content_json,toc_json").eq("slug", "test").single();
    const { data, error } = await supabase!
      .from("books")
      .insert({
        slug: SLUG,
        title: "E2E 공유 링크 테스트",
        share_token: TOKEN,
        visibility: "unlisted",
        status: "published",
        allow_share: true,
        allow_download: true,
        content_html: src?.content_html ?? "<p data-block-id=\"block-0001\">test</p>",
        content_json: src?.content_json ?? [{ id: "block-0001", type: "paragraph", html: "<p data-block-id=\"block-0001\">test</p>" }],
        toc_json: src?.toc_json ?? [],
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    bookId = data.id;
  });

  test.afterAll(async () => {
    const supabase = serviceRoleClient();
    if (supabase && bookId) await supabase.from("books").delete().eq("id", bookId);
  });

  test("opens without any login via the correct share token", async ({ page }) => {
    const response = await page.goto(`/share/${TOKEN}`, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await page.waitForSelector(".page", { state: "attached", timeout: 10000 });
    await expect(page.locator("body")).toContainText("E2E 공유 링크 테스트");
  });

  test("the same unlisted book 404s via /books/[slug]", async ({ page }) => {
    const response = await page.goto(`/books/${SLUG}`, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
  });

  test("a wrong/guessed token 404s", async ({ page }) => {
    const response = await page.goto("/share/not-a-real-token-at-all", { waitUntil: "networkidle" });
    expect(response?.status()).toBe(404);
  });
});
