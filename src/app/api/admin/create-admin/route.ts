import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdminBootstrap } from "@/lib/auth/server";

export async function POST(req: Request) {
  const auth = await requireAdminBootstrap();
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { user_id, role = "admin" } = body;

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client not configured" }, { status: 500 });
    }

    // Cast to any here to avoid strict typing mismatch in this small admin utility.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("admin_profiles").upsert({ user_id, role });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
