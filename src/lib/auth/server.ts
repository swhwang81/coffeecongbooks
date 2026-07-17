import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/supabase/types";

export interface AdminSession {
  user: User;
  role: AdminRole;
}

/**
 * Re-verifies the caller's session and admin role server-side. Never trust a
 * client-supplied role/flag (spec §9): the user id comes from a
 * Supabase-verified JWT (`auth.getUser()`), and the role is looked up with
 * the service-role client so it can't be spoofed via a forged cookie.
 *
 * Returns `null` if the caller is not signed in or has no admin_profiles row.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) return null;

  // The hand-written `Database` type doesn't fully satisfy supabase-js's
  // generic schema shape, which collapses query builder results to `never`;
  // cast at the query boundary the same way the rest of the admin routes do.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (serviceClient as any)
    .from("admin_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return { user, role: profile.role as AdminRole };
}

export function isRoleAtLeast(role: AdminRole, minimum: "editor" | "admin" | "super_admin") {
  const order: AdminRole[] = ["editor", "admin", "super_admin"];
  return order.indexOf(role) >= order.indexOf(minimum);
}

/**
 * Guard for Route Handlers under `/api/admin/*`. Returns the verified
 * session on success, or a ready-to-return 401/403 `NextResponse` on
 * failure — callers should `return` that response directly.
 *
 * Usage: `const auth = await requireAdmin(); if ("response" in auth) return auth.response;`
 */
export async function requireAdmin(
  minimum: "editor" | "admin" | "super_admin" = "editor"
): Promise<{ session: AdminSession } | { response: NextResponse }> {
  const session = await getAdminSession();

  if (!session) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!isRoleAtLeast(session.role, minimum)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}

/**
 * Guard for the role-assignment bootstrap endpoints (`create-admin`,
 * `assign-by-email`). These manage `admin_profiles` itself, so they can't
 * require an existing admin session the same way `requireAdmin` does — that
 * would make it impossible to create the very first admin.
 *
 * Rule: the caller must always have a valid Supabase session (proves they
 * signed up through Auth, not an anonymous request). Beyond that:
 *  - if `admin_profiles` is empty, any signed-in user may bootstrap the
 *    first admin;
 *  - once at least one row exists, only an existing super_admin/admin may
 *    assign further roles.
 */
export async function requireAdminBootstrap(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: "Supabase not configured" }, { status: 500 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const serviceClient = createServiceRoleSupabaseClient();
  if (!serviceClient) {
    return { response: NextResponse.json({ error: "Supabase service client not configured" }, { status: 500 }) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (serviceClient as any)
    .from("admin_profiles")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (serviceClient as any)
      .from("admin_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || !isRoleAtLeast(profile.role as AdminRole, "admin")) {
      return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return { userId: user.id };
}
