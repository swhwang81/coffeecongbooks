import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";
import { generateShareToken } from "@/lib/admin/share-token";

/** Returns the public/share URL for a book, minting a `share_token` for unlisted books on first use. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: book, error } = await (supabase as any)
    .from("books")
    .select("slug,status,visibility,share_token")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (book.visibility === "public" && book.status === "published") {
    return NextResponse.json({ ok: true, url: `${siteUrl}/books/${book.slug}` });
  }

  if (book.visibility === "unlisted") {
    let token = book.share_token;
    if (!token) {
      token = generateShareToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any).from("books").update({ share_token: token }).eq("id", id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, url: `${siteUrl}/share/${token}` });
  }

  return NextResponse.json({ error: "비공개 도서는 공유 링크를 생성할 수 없습니다." }, { status: 400 });
}

/** Rotates an `unlisted` book's share token, invalidating every link shared so far. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: book, error } = await (supabase as any).from("books").select("slug,visibility").eq("id", id).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  if (book.visibility !== "unlisted") {
    return NextResponse.json({ error: "링크 전용 도서만 재생성할 수 있습니다." }, { status: 400 });
  }

  const token = generateShareToken();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any).from("books").update({ share_token: token }).eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({ ok: true, url: `${siteUrl}/share/${token}` });
}
