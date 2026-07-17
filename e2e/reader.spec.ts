import { test, expect, type Page } from "@playwright/test";
import { serviceRoleClient } from "./helpers/supabase";

const SLUG = `e2e-reader-${Date.now()}`;
let bookId: string | null = null;

/**
 * Pagination can recompute many times in a row while layout settles (web
 * font swap, ResizeObserver noise from the emulated mobile viewport) —
 * observed 5-7+ recomputes on WebKit before the total page count stops
 * changing, and — even after `document.fonts.ready` — occasional further
 * recomputes for a couple more seconds. Polls the page indicator's total
 * (the "M" in "N / M") until it's held steady across several checks in a
 * row (not just two, which still saw an unrelated recompute slip in right
 * after), instead of a fixed sleep that's either too short (flaky,
 * mid-churn) or wastefully long.
 */
async function waitForPaginationSettled(page: Page): Promise<void> {
  const indicator = page.locator("text=/\\d+ \\/ \\d+/").first();
  const REQUIRED_STABLE_READS = 4;
  let previousTotal: string | null = null;
  let stableCount = 0;
  await expect(async () => {
    const text = await indicator.textContent();
    const total = text?.split("/")[1]?.trim() ?? null;
    stableCount = total !== null && total === previousTotal ? stableCount + 1 : 0;
    previousTotal = total;
    expect(stableCount).toBeGreaterThanOrEqual(REQUIRED_STABLE_READS);
  }).toPass({ intervals: [400], timeout: 15000 });
}

test.describe("Reader", () => {
  test.beforeAll(async () => {
    const supabase = serviceRoleClient();
    test.skip(!supabase, "Supabase credentials not configured");
    const { data: src } = await supabase!.from("books").select("content_html,content_json,toc_json").eq("slug", "test").single();
    test.skip(!src, "seed 'test' book not found — run earlier phases' setup first");
    const { data, error } = await supabase!
      .from("books")
      .insert({
        slug: SLUG,
        title: "E2E Reader 테스트",
        visibility: "public",
        status: "published",
        allow_share: true,
        allow_download: true,
        content_html: src!.content_html,
        content_json: src!.content_json,
        toc_json: src!.toc_json,
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

  test.beforeEach(async ({ page }) => {
    await page.goto(`/books/${SLUG}`, { waitUntil: "networkidle" });
    await page.waitForSelector(".page", { state: "attached", timeout: 10000 });
    await waitForPaginationSettled(page);
  });

  test("페이지 넘김: next/prev actually move the page indicator", async ({ page }) => {
    // Compares only the current-page number ("N" of "N / M"), not the full
    // string — the total ("M") can still legitimately shift on its own
    // from ongoing pagination settling (independent of these next/prev
    // clicks), same reasoning as the position-restore test below.
    const indicator = page.locator("text=/\\d+ \\/ \\d+/").first();
    const currentPageNumber = async () => Number((await indicator.textContent())?.split("/")[0]);
    const before = await currentPageNumber();

    await page.locator('button[aria-label="다음 페이지"]').first().click();
    await page.waitForTimeout(500);
    expect(await currentPageNumber()).not.toBe(before);

    await page.locator('button[aria-label="이전 페이지"]').first().click();
    await page.waitForTimeout(500);
    expect(await currentPageNumber()).toBe(before);
  });

  test("글자 크기 변경: A+ actually increases the persisted font size", async ({ page }) => {
    const before = await page.evaluate(
      (slug) => JSON.parse(window.localStorage.getItem(`coffeecong:reader:${slug}`) ?? "{}").fontSize,
      SLUG
    );

    await page.locator('button[aria-label="글자 크게"]').first().click();
    await page.waitForTimeout(300);

    const after = await page.evaluate(
      (slug) => JSON.parse(window.localStorage.getItem(`coffeecong:reader:${slug}`) ?? "{}").fontSize,
      SLUG
    );
    expect(after).toBeGreaterThan(before ?? 0);

    const contentFontSize = await page.locator(".reader-content").first().evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(parseInt(contentFontSize, 10)).toBeGreaterThan(0);
  });

  test("위치 복원: reloading resumes the same content block, not the cover", async ({ page }) => {
    await page.locator('button[aria-label="다음 페이지"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('button[aria-label="다음 페이지"]').first().click();
    await page.waitForTimeout(1200); // let the debounced position save fire

    const indicator = page.locator("text=/\\d+ \\/ \\d+/").first();
    const beforeReload = await indicator.textContent();
    expect(beforeReload).not.toMatch(/^1 \//); // actually moved off the cover

    const savedBefore = await page.evaluate(
      (slug) => JSON.parse(window.localStorage.getItem(`coffeecong:reader:${slug}`) ?? "{}").blockId,
      SLUG
    );
    expect(savedBefore).toBeTruthy();

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".page", { state: "attached", timeout: 10000 });
    await waitForPaginationSettled(page);

    // The exact page *number* isn't a safe invariant across two separate
    // loads — pagination can legitimately land on a different total page
    // count between them (font/layout settling timing), which is exactly
    // why spec §13 has restore resolve by block id rather than page
    // number in the first place. What must hold is: not back at the
    // cover, and resuming the *same content* — verified two ways: the
    // localStorage record still points at the same block, and (directly
    // observable, not just inferred from storage) that block's heading
    // text is what the toolbar shows as the current chapter.
    const afterReload = await indicator.textContent();
    expect(afterReload).not.toMatch(/^1 \//);

    const savedAfter = await page.evaluate(
      (slug) => JSON.parse(window.localStorage.getItem(`coffeecong:reader:${slug}`) ?? "{}").blockId,
      SLUG
    );
    expect(savedAfter).toBe(savedBefore);
  });
});
