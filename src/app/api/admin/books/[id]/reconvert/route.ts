import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";
import { convertDocxToBookContent, DocxConversionError } from "@/lib/docx/convert";

/** Re-runs the DOCX→HTML pipeline against the already-stored original (no re-upload). */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data: original, error: downloadError } = await supabase.storage
    .from("book-originals")
    .download(`${id}/original.docx`);

  if (downloadError || !original) {
    return NextResponse.json({ error: "원본 DOCX 파일을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const buffer = Buffer.from(await original.arrayBuffer());
    const converted = await convertDocxToBookContent(buffer, id, supabase);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("books")
      .update({ content_html: converted.html, content_json: converted.blocks, toc_json: converted.toc })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, warnings: converted.warnings });
  } catch (err) {
    const message = err instanceof DocxConversionError ? err.message : "DOCX 변환에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
