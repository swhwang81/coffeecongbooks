import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/** Service-role client for E2E test setup/teardown (seeding + cleanup) —
 * never used by the app itself in a browser context, only by the test
 * runner directly. */
export function serviceRoleClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return cached;
}

export async function deleteBooksBySlugPrefix(prefix: string): Promise<void> {
  const supabase = serviceRoleClient();
  if (!supabase) return;
  await supabase.from("books").delete().ilike("slug", `${prefix}%`);
}
