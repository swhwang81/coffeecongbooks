import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    ok: hasUrl && hasAnonKey,
    configured: hasUrl && hasAnonKey,
    supabaseClientReady: Boolean(supabase),
    details: {
      supabaseUrl: hasUrl ? "configured" : "missing",
      anonKey: hasAnonKey ? "configured" : "missing",
      serviceRoleKey: hasServiceRoleKey ? "configured" : "missing",
    },
    message:
      hasUrl && hasAnonKey
        ? "Supabase client is configured and ready for the next setup step."
        : "Supabase environment variables are not configured yet. Add them to continue with the real project connection.",
  });
}
