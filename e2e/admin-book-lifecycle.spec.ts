import { test, expect } from "@playwright/test";
import path from "node:path";
import { loginAsAdmin } from "./helpers/admin";
import { deleteBooksBySlugPrefix } from "./helpers/supabase";

const SLUG_PREFIX = "e2e-lifecycle-";
const TITLE = `E2E 등록 테스트 ${Date.now()}`;

test.describe("Admin book lifecycle", () => {
  test.afterAll(async () => {
    await deleteBooksBySlugPrefix(SLUG_PREFIX);
  });

  test("registers a book from the real sample DOCX, publishes it, and copies its link", async ({ page, context }) => {
    await loginAsAdmin(page);

    // 1. Ebook 등록 — upload the project's real sample DOCX (same file used
    // for manual QA throughout every earlier phase).
    await page.goto("/admin/books/new", { waitUntil: "networkidle" });
    const fileInput = page.locator('input[type="file"][accept=".docx"]');
    await fileInput.setInputFiles(path.resolve(__dirname, "../docx_text/Coffeecong_Books_test.docx"));
    await expect(page.locator("text=선택된 파일:")).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder="예: 지식을 책처럼"]', TITLE);
    await page.fill('input[placeholder="예: my-first-book"]', `${SLUG_PREFIX}${Date.now()}`);
    // 공개 상태를 초안이 아닌 공개로, 공개 범위를 공개로 — "공개 전환" 완료 기준까지 한 번에 검증.
    await page.selectOption('label:has-text("공개 상태") select', "published");
    await page.selectOption('label:has-text("공개 범위") select', "public");

    await page.click('button:has-text("등록")');
    await page.waitForURL(/\/admin\/books$/, { timeout: 30000 });
    await expect(page.locator(`text=${TITLE}`)).toBeVisible({ timeout: 10000 });

    // 2. 공개 전환 확인 — the row's status/visibility pills reflect what was submitted.
    const row = page.locator("tr", { hasText: TITLE });
    await expect(row.locator("select").first()).toHaveValue("published");
    await expect(row.locator("select").nth(1)).toHaveValue("public");

    // 3. 링크 복사 — mints/returns the public URL and puts it on the clipboard.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await row.getByTitle("링크 복사").click();
    await page.waitForTimeout(800);
    const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiedUrl).toMatch(/\/books\/e2e-lifecycle-/);

    // The copied link actually opens the book, unauthenticated.
    const reader = await context.newPage();
    const response = await reader.goto(copiedUrl, { waitUntil: "networkidle" });
    expect(response?.status()).toBe(200);
    await reader.waitForSelector(".page", { state: "attached", timeout: 10000 });
    await reader.close();
  });
});
