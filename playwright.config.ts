import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Playwright's own process doesn't inherit Next's `.env.local` loading —
// only the `npm run dev` subprocess (webServer, below) gets that for free.
// Test setup/teardown hooks that talk to Supabase directly run in this
// process, so load the same file manually (same pattern as vitest's
// tests/setup.ts).
try {
  const envPath = path.resolve(__dirname, ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // No .env.local — Supabase-backed setup/teardown in the specs will no-op/skip.
}

const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Reader flows run on both a desktop and a mobile viewport (spec Phase 18
// completion criteria: "모바일 및 데스크톱 viewport 통과") since the Reader is a
// genuine layout branch, not a responsive tweak (CLAUDE.md — desktop
// two-page spread vs. mobile single page). Admin flows only need desktop;
// the admin UI has no mobile layout to verify.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Multiple browser instances (desktop + mobile projects, several spec
  // files) competing for CPU at once was enough to occasionally push
  // pagination settling past even a generous polling window — reader
  // tests passed reliably every time run in isolation, only flaked when
  // several workers ran concurrently. Serial execution trades total wall
  // time for that reliability, a reasonable tradeoff for a suite this
  // size.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"] }, testMatch: /reader\.spec\.ts/ },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
