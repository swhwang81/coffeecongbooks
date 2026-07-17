import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Cookie-bound client for Server Components / Route Handlers — reflects the
 * signed-in user's session so `.auth.getUser()` can be trusted server-side.
 */
export async function createServerSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render — cookie refresh is
          // handled by proxy.ts on the next request instead.
        }
      },
    },
  });
}

/**
 * Anon-key client with no cookie plumbing — for server-only contexts that
 * read public (RLS-scoped), session-independent data but aren't a real
 * request, like `sitemap.ts` (can run at build time, outside any request).
 * `createServerSupabaseClient` would fail there since it calls `cookies()`.
 */
export function createAnonSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Service-role client — bypasses RLS entirely. Server-only, never exposed to
 * the browser. Callers MUST verify the caller's session/role themselves
 * (see `requireAdmin` in `@/lib/auth/server`) before using this for
 * privileged reads/writes.
 */
export function createServiceRoleSupabaseClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
