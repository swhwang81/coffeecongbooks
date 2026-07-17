import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";
import { validateDocxFile, DOCX_VALIDATION_MESSAGES, DOCX_MIME_TYPE } from "@/lib/upload/docx";
import { validateCoverFile, COVER_VALIDATION_MESSAGES } from "@/lib/upload/image";
import { uploadCoverImage } from "@/lib/upload/cover";
import { convertDocxToBookContent, DocxConversionError } from "@/lib/docx/convert";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().optional().or(z.literal("")),
  summary: z.string().optional().or(z.literal("")),
  slug: z.string().min(1).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z.enum(["public", "unlisted", "private"]).optional(),
  allow_share: z.coerce.boolean().optional(),
  allow_download: z.coerce.boolean().optional(),
  published_at: z.string().min(1).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [{ data: book, error }, { data: bookCategories }, { data: bookTags }] = await Promise.all([
    (supabase as any).from("books").select("*").eq("id", id).maybeSingle(),
    (supabase as any).from("book_categories").select("category_id").eq("book_id", id),
    (supabase as any).from("book_tags").select("tag_id").eq("book_id", id),
  ]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      ...book,
      category_ids: (bookCategories ?? []).map((c: { category_id: string }) => c.category_id),
      tag_ids: (bookTags ?? []).map((t: { tag_id: string }) => t.tag_id),
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  try {
    const formData = await request.formData();
    const uploadedFile = formData.get("file") instanceof File ? (formData.get("file") as File) : null;
    const coverFile = formData.get("cover") instanceof File ? (formData.get("cover") as File) : null;
    const hasCategoryIds = formData.has("category_ids");
    const hasTagIds = formData.has("tag_ids");
    const categoryIds = formData.getAll("category_ids").map(String).filter(Boolean);
    const tagIds = formData.getAll("tag_ids").map(String).filter(Boolean);

    const publishedAtValue = String(formData.get("published_at") ?? "");
    const parsed = updateSchema.safeParse({
      title: formData.has("title") ? String(formData.get("title")) : undefined,
      author: formData.has("author") ? String(formData.get("author")) : undefined,
      summary: formData.has("summary") ? String(formData.get("summary")) : undefined,
      slug: String(formData.get("slug") ?? "") || undefined,
      status: String(formData.get("status") ?? "") || undefined,
      visibility: String(formData.get("visibility") ?? "") || undefined,
      allow_share: formData.has("allow_share") ? formData.get("allow_share") === "true" : undefined,
      allow_download: formData.has("allow_download") ? formData.get("allow_download") === "true" : undefined,
      published_at: publishedAtValue || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const body = parsed.data;

    if (uploadedFile) {
      const fileError = validateDocxFile(uploadedFile);
      if (fileError) {
        return NextResponse.json({ error: DOCX_VALIDATION_MESSAGES[fileError] }, { status: 400 });
      }
    }
    if (coverFile) {
      const coverError = validateCoverFile(coverFile);
      if (coverError) {
        return NextResponse.json({ error: COVER_VALIDATION_MESSAGES[coverError] }, { status: 400 });
      }
    }

    const supabase = createServiceRoleSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: existingError } = await (supabase as any)
      .from("books")
      .select("id,slug,status")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Slug dedup, excluding this book itself.
    let slug = body.slug ?? existing.slug;
    if (body.slug && body.slug !== existing.slug) {
      let attempt = 1;
      const baseSlug = body.slug;
      while (true) {
        const { data: collision } = await supabase
          .from("books")
          .select("id")
          .eq("slug", slug)
          .neq("id", id)
          .maybeSingle();
        if (!collision) break;
        slug = `${baseSlug}-${attempt}`;
        attempt += 1;
      }
    }

    const nextStatus = body.status ?? existing.status;
    const publishedAt = body.published_at
      ? new Date(body.published_at).toISOString()
      : nextStatus === "published" && existing.status !== "published"
        ? new Date().toISOString()
        : undefined;

    const updatePayload: Record<string, unknown> = { slug };
    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.author !== undefined) updatePayload.author = body.author || null;
    if (body.summary !== undefined) updatePayload.summary = body.summary || null;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.visibility !== undefined) updatePayload.visibility = body.visibility;
    if (body.allow_share !== undefined) updatePayload.allow_share = body.allow_share;
    if (body.allow_download !== undefined) updatePayload.allow_download = body.allow_download;
    if (publishedAt !== undefined) updatePayload.published_at = publishedAt;

    const warnings: string[] = [];

    if (uploadedFile && uploadedFile.size > 0) {
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("book-originals")
        .upload(`${id}/original.docx`, fileBuffer, { contentType: DOCX_MIME_TYPE, upsert: true });
      if (uploadError) warnings.push("원본 파일 저장에 실패했습니다.");

      try {
        const converted = await convertDocxToBookContent(fileBuffer, id, supabase);
        updatePayload.content_html = converted.html;
        updatePayload.content_json = converted.blocks;
        updatePayload.toc_json = converted.toc;
        warnings.push(...converted.warnings);
      } catch (err) {
        warnings.push(err instanceof DocxConversionError ? err.message : "DOCX 변환에 실패했습니다.");
      }
    }

    if (coverFile && coverFile.size > 0) {
      const coverResult = await uploadCoverImage(supabase, id, coverFile);
      if (coverResult.warning) warnings.push(coverResult.warning);
      if (coverResult.url) updatePayload.cover_url = coverResult.url;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("books").update(updatePayload).eq("id", id).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (hasCategoryIds) {
      await supabase.from("book_categories").delete().eq("book_id", id);
      if (categoryIds.length > 0) {
        const rows = categoryIds.map((category_id) => ({ book_id: id, category_id }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: catError } = await (supabase as any).from("book_categories").insert(rows);
        if (catError) warnings.push("카테고리 연결에 실패했습니다.");
      }
    }

    if (hasTagIds) {
      await supabase.from("book_tags").delete().eq("book_id", id);
      if (tagIds.length > 0) {
        const rows = tagIds.map((tag_id) => ({ book_id: id, tag_id }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: tagError } = await (supabase as any).from("book_tags").insert(rows);
        if (tagError) warnings.push("태그 연결에 실패했습니다.");
      }
    }

    return NextResponse.json({ ok: true, data, warning: warnings.length > 0 ? warnings.join(" ") : null });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 500 });
  }
}

/** Soft delete (spec §8 Phase 8) — sets `deleted_at`, never removes the row or its Storage objects. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("books").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
