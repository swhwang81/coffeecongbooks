import { readFileSync } from "node:fs";
import path from "node:path";

// Vitest (unlike Next.js) doesn't auto-load `.env.local` into `process.env`
// — the integration suite needs real Supabase credentials, so load them the
// same way the scratch QA scripts used throughout this project's
// development did. Missing file/vars just leave `process.env` untouched;
// individual integration tests skip themselves when the client can't be
// constructed, rather than failing the whole run.
try {
  const envPath = path.resolve(__dirname, "../.env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // No .env.local — fine, see above.
}
