import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Cookie-backed (not localStorage) so the session is readable by proxy.ts
  // and Server Components on the same request.
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export const browserSupabase = createBrowserSupabaseClient();
