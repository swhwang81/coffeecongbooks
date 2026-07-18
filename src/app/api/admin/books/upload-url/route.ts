import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";

const schema = z.object({
  bookId: z.string().uuid(),
  kind: z.enum(["docx", "cover"]),
});

/**
 * Vercel Serverless Functions cap the request body at 4.5MB — a document
 * with even a couple of real photos (our own stated limits are 20MB for
 * DOCX, 5MB for a cover) routinely exceeds that, and the function is killed
 * before our route code ever runs, returning Vercel's own error page
 * instead of this app's normal `{ok, error}` JSON. Vercel's own guidance
 * for this is to upload directly from the browser to a storage service,
 * bypassing the function entirely for the file bytes — this route is the
 * "token exchange" half of that pattern: it authenticates the admin and
 * hands back a short-lived Supabase Storage signed upload URL (2h) for a
 * server-decided path, so the actual PUT of file bytes goes straight from
 * the browser to Supabase and never touches this app's request body limit.
 *
 * The path is resolved here, not taken from the client, so a caller can't
 * write into another book's assets. The DOCX goes to its real, final
 * destination in the private `book-originals` bucket (unchanged from
 * before). The cover goes to a staging path in the public `book-covers`
 * bucket rather than `book-originals` — that bucket's `allowed_mime_types`
 * is locked to the DOCX MIME type only (migration 002), so an image upload
 * would be rejected at the Storage level; `book-covers` already has no MIME
 * restriction and the same 5MB limit we validate against. The server still
 * downloads this staged upload, runs it through a sharp compress/resize
 * pass, and re-uploads the real result to its final `cover.webp` path in
 * the same bucket — unchanged from before this route existed.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { bookId, kind } = parsed.data;

  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const bucket = kind === "docx" ? "book-originals" : "book-covers";
  const path = kind === "docx" ? `${bookId}/original.docx` : `${bookId}/cover-staging`;

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "업로드 URL 생성에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { bucket, path: data.path, token: data.token } });
}
