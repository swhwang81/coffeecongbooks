import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";
import { validateDocxFile, DOCX_VALIDATION_MESSAGES } from "@/lib/upload/docx";
import { convertDocxToBookContent, DocxConversionError } from "@/lib/docx/convert";

// See the identical comment in ../route.ts — this does the exact same full
// conversion (incl. per-image compression + Storage upload), which can
// exceed Vercel's default Serverless Function timeout for a document with
// several real photos.
export const maxDuration = 60;

/**
 * Converts the admin's actually-selected DOCX before the book is saved
 * (spec §14 "등록 전 미리보기" — a preview of *this* file, not a fixed
 * sample). The client supplies a UUID it generated itself; if the book is
 * later saved with that same id, the images uploaded here become the
 * book's real assets instead of being wasted. Abandoned previews leave a
 * few orphaned Storage objects under an unused id — an acceptable, minor
 * cost, same as any abandoned draft.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const bookId = String(formData.get("bookId") ?? "");

    if (!(file instanceof File) || !bookId) {
      return NextResponse.json({ error: "file and bookId are required" }, { status: 400 });
    }

    const fileError = validateDocxFile(file);
    if (fileError) {
      return NextResponse.json({ error: DOCX_VALIDATION_MESSAGES[fileError] }, { status: 400 });
    }

    const supabase = createServiceRoleSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await convertDocxToBookContent(buffer, bookId, supabase);

    return NextResponse.json({ ok: true, preview: result });
  } catch (err) {
    const message = err instanceof DocxConversionError ? err.message : "DOCX 변환에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
