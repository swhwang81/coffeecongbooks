import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdminBootstrap } from "@/lib/auth/server";

export async function POST(req: Request) {
  const auth = await requireAdminBootstrap();
  if ("response" in auth) return auth.response;

  try {
    const { email, role = "admin" } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase service client not configured" }, { status: 500 });
    }

    // Use admin auth API to get user by email (service role required)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminApi: any = (supabase as any).auth?.admin;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any = null;

    if (adminApi && typeof adminApi.getUserByEmail === "function") {
      const { data: u, error: userErr } = await adminApi.getUserByEmail(email);
      if (userErr) {
        return NextResponse.json({ error: userErr.message || String(userErr) }, { status: 500 });
      }
      user = u;
    } else {
      // Fallback: query auth.users table directly (service role required)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error: qErr } = await (supabase as any).from("auth.users").select("id,email").eq("email", email).limit(1).maybeSingle();
      if (qErr) {
        const msg = String(qErr?.message || qErr);
        // If the auth.users table isn't available in the schema cache, fall back to admin REST endpoint.
        if (msg.includes("Could not find the table") || msg.includes("auth.users")) {
          // leave user as null and fall through to REST lookup
        } else {
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      } else {
        user = rows;
      }
    }

    if (!user) {
      // Final fallback: call Supabase Admin REST endpoint directly using service role key
      const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!svcKey || !supabaseUrl) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
      }

      const resp = await fetch(
        `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${svcKey}`,
            apikey: svcKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!resp.ok) {
        return NextResponse.json({ error: `admin REST lookup failed (${resp.status})` }, { status: 500 });
      }

      const users = await resp.json();
      if (!users || !users.length) {
        return NextResponse.json({ error: "user not found" }, { status: 404 });
      }

      user = users[0];
    }

    if (!user) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const user_id = user.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("admin_profiles").upsert({ user_id, role });
    if (error) {
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
