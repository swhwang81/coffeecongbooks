import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, loginAsAdmin } from "./helpers/admin";

test.describe("Admin login", () => {
  test("unauthenticated visitors are redirected to /admin/login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/);
  });

  test("correct credentials log in and reach the dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    expect(page.url()).toMatch(/\/admin(?!\/login)/);
    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  });

  test("wrong password is rejected and stays on the login page", async ({ page }) => {
    await page.goto("/admin/login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', `not-${ADMIN_PASSWORD}`);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/\/admin\/login/);
  });
});
