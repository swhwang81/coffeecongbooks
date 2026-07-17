import type { Page } from "@playwright/test";

// Seeded once for this project (see todo.md) — role: admin in admin_profiles.
// Credentials come from env (E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD in
// .env.local, loaded by playwright.config.ts), never hardcoded — this is
// the real admin login for whichever Supabase project is configured,
// production included, so it can't live in source.
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

export async function loginAsAdmin(page: Page): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.local to run admin-authenticated E2E tests.");
  }
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10000 });
}
