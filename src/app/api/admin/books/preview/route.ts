import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";
import { MAX_DOCX_SIZE_BYTES, DOCX_VALIDATION_MESSAGES } from "@/lib/upload/docx";
import { convertDocxToBookContent, DocxConversionError } from "@/lib/docx/convert";

// See the identical comment in ../route.ts — this does the exact same full
// conversion (incl. per-image compression + Storage upload), which can
// exceed Vercel's default Serverless Function timeout for a document with
// several real photos.
export const maxDuration = 60;

const schema = z.object({ bookId: z.string().uuid() });

/**
 * Converts the admin's actually-selected DOCX before the book is saved
 * (spec §14 "등록 전 미리보기" — a preview of *this* file, not a fixed
 * sample). The client uploads the file directly to Storage first (see
 * /api/admin/books/upload-url — this route only ever receives a `bookId`
 * reference now, never the file bytes themselves, so it stays well under
 * Vercel's 4.5MB Serverless Function body limit regardless of the
 * document's real size). If the book is later saved with that same id, the
 * images uploaded here become the book's real assets instead of being
 * wasted. Abandoned previews leave a few orphaned Storage objects under an
 * unused id — an acceptable, minor cost, same as any abandoned draft.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }
    const { bookId } = parsed.data;

    const supabase = createServiceRoleSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const { data: docxBlob, error: downloadError } = await supabase.storage
      .from("book-originals")
      .download(`${bookId}/original.docx`);

    if (downloadError || !docxBlob) {
      return NextResponse.json({ error: "업로드된 DOCX 파일을 찾을 수 없습니다." }, { status: 404 });
    }

    const buffer = Buffer.from(await docxBlob.arrayBuffer());
    if (buffer.byteLength > MAX_DOCX_SIZE_BYTES) {
      return NextResponse.json({ error: DOCX_VALIDATION_MESSAGES.size }, { status: 400 });
    }

    const result = await convertDocxToBookContent(buffer, bookId, supabase);

    return NextResponse.json({ ok: true, preview: result });
  } catch (err) {
    const message = err instanceof DocxConversionError ? err.message : "DOCX 변환에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
