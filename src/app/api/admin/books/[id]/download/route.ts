import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";

/**
 * Signed URL for the original DOCX (spec §9: admins can always access the
 * original regardless of `allow_download`, which only governs end-reader
 * downloads — a later phase, not this admin-only route).
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data, error } = await supabase.storage
    .from("book-originals")
    .createSignedUrl(`${id}/original.docx`, 60);

  if (error || !data) {
    return NextResponse.json({ error: "원본 DOCX 파일을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, url: data.signedUrl });
}
