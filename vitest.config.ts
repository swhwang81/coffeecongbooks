import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration tests hit the real linked Supabase project (no local
    // Postgres in this setup) and can take a few seconds each — DOCX
    // conversion + Storage upload/cleanup especially.
    testTimeout: 20000,
  },
});
