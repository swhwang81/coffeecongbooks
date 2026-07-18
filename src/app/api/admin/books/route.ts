import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import { z } from "zod";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/server";
import { validateDocxFile, DOCX_VALIDATION_MESSAGES, DOCX_MIME_TYPE } from "@/lib/upload/docx";
import { validateCoverFile, COVER_VALIDATION_MESSAGES } from "@/lib/upload/image";
import { uploadCoverImage } from "@/lib/upload/cover";
import { convertDocxToBookContent, DocxConversionError } from "@/lib/docx/convert";
import { buildSlug } from "@/lib/admin/slug";

const require = createRequire(import.meta.url);

// DOCX conversion synchronously compresses/uploads every embedded image
// (sharp + Supabase Storage, one round-trip per image) before responding —
// a document with several real photos can easily exceed Vercel's default
// Serverless Function timeout, which kills the function and returns its
// own error page instead of this route's normal `{ok, error}` JSON. The
// client then falls back to a generic "저장에 실패했습니다." with no real
// diagnostic, which is exactly what that looks like from the outside. 60s
// is the maximum configurable on Vercel's Hobby plan and comfortably
// within Pro's default — safe regardless of which tier this is deployed on.
export const maxDuration = 60;

const schema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  author: z.string().min(1).optional().or(z.literal("")),
  summary: z.string().optional().or(z.literal("")),
  slug: z.string().min(1).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z.enum(["public", "unlisted", "private"]).optional(),
  allow_share: z.coerce.boolean().optional(),
  allow_download: z.coerce.boolean().optional(),
  published_at: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    const supabase = createServiceRoleSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    if (action === "preview") {
      const fs = require("fs");
      const path = require("path");

      const docPath = path.join(process.cwd(), "docx_text", "Coffeecong_Books_test.docx");

      if (!fs.existsSync(docPath)) {
        return NextResponse.json({ error: "Test document not found" }, { status: 404 });
      }

      const buffer = fs.readFileSync(docPath);

      try {
        const result = await convertDocxToBookContent(buffer, "preview-test-document", supabase);
        return NextResponse.json({
          ok: true,
          preview: {
            html: result.html,
            blocks: result.blocks,
            toc: result.toc,
            warnings: result.warnings,
            title: "Coffeecong Books Test Document",
            author: "Test Author",
          },
        });
      } catch (err) {
        const message = err instanceof DocxConversionError ? err.message : "DOCX 변환에 실패했습니다.";
        return NextResponse.json({ error: message }, { status: 422 });
      }
    }

    const q = url.searchParams.get("q")?.trim();
    const statusFilter = url.searchParams.get("status");
    const visibilityFilter = url.searchParams.get("visibility");
    const categoryFilter = url.searchParams.get("category");
    const sort = url.searchParams.get("sort") ?? "created_desc";

    // Hand-written Database type collapses query builder results to `never`
    // on this supabase-js version; cast at the boundary like the rest of
    // the admin routes do.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    let query = db
      .from("books")
      .select("id,title,slug,author,cover_url,status,visibility,share_token,allow_share,allow_download,created_at")
      .is("deleted_at", null);

    if (q) {
      const escaped = q.replace(/[%,]/g, "");
      query = query.or(`title.ilike.%${escaped}%,author.ilike.%${escaped}%`);
    }
    if (statusFilter) query = query.eq("status", statusFilter);
    if (visibilityFilter) query = query.eq("visibility", visibilityFilter);

    if (categoryFilter) {
      const { data: catBookIds } = await db.from("book_categories").select("book_id").eq("category_id", categoryFilter);
      const ids = (catBookIds ?? []).map((r: { book_id: string }) => r.book_id);
      if (ids.length === 0) {
        return NextResponse.json({ ok: true, data: [] });
      }
      query = query.in("id", ids);
    }

    if (sort === "created_asc") query = query.order("created_at", { ascending: true });
    else if (sort === "title_asc") query = query.order("title", { ascending: true });
    else query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const books: Array<Record<string, unknown> & { id: string }> = data ?? [];
    const bookIds = books.map((b) => b.id);

    const [{ data: categoryLinks }, { data: allCategories }, { data: views }] = await Promise.all([
      bookIds.length > 0
        ? db.from("book_categories").select("book_id,category_id").in("book_id", bookIds)
        : Promise.resolve({ data: [] as { book_id: string; category_id: string }[] }),
      db.from("categories").select("id,name"),
      bookIds.length > 0
        ? db.from("book_views").select("book_id").in("book_id", bookIds)
        : Promise.resolve({ data: [] as { book_id: string }[] }),
    ]);

    const categoryNameById = new Map<string, string>(
      (allCategories ?? []).map((c: { id: string; name: string }) => [c.id, c.name])
    );
    const categoriesByBook = new Map<string, string[]>();
    for (const link of (categoryLinks ?? []) as { book_id: string; category_id: string }[]) {
      const list = categoriesByBook.get(link.book_id) ?? [];
      const name = categoryNameById.get(link.category_id);
      if (name) list.push(name);
      categoriesByBook.set(link.book_id, list);
    }

    const viewCountByBook = new Map<string, number>();
    for (const v of (views ?? []) as { book_id: string }[]) {
      viewCountByBook.set(v.book_id, (viewCountByBook.get(v.book_id) ?? 0) + 1);
    }

    let enriched = books.map((book) => ({
      ...book,
      categories: categoriesByBook.get(book.id) ?? [],
      view_count: viewCountByBook.get(book.id) ?? 0,
    }));

    if (sort === "views_desc") {
      enriched = enriched.sort((a, b) => b.view_count - a.view_count);
    }

    return NextResponse.json({ ok: true, data: enriched });
  } catch {
    return NextResponse.json({ error: "Failed to load books" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let parsed: z.infer<typeof schema> | undefined;
    let uploadedFile: File | null = null;
    let coverFile: File | null = null;
    let categoryIds: string[] = [];
    let tagIds: string[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      uploadedFile = formData.get("file") instanceof File ? (formData.get("file") as File) : null;
      coverFile = formData.get("cover") instanceof File ? (formData.get("cover") as File) : null;
      categoryIds = formData.getAll("category_ids").map(String).filter(Boolean);
      tagIds = formData.getAll("tag_ids").map(String).filter(Boolean);

      const idValue = String(formData.get("id") ?? "");
      const publishedAtValue = String(formData.get("published_at") ?? "");

      parsed = schema.safeParse({
        id: idValue || undefined,
        title: String(formData.get("title") ?? ""),
        author: String(formData.get("author") ?? ""),
        summary: String(formData.get("summary") ?? ""),
        slug: String(formData.get("slug") ?? "") || undefined,
        status: String(formData.get("status") ?? "") || undefined,
        visibility: String(formData.get("visibility") ?? "") || undefined,
        allow_share: formData.has("allow_share") ? formData.get("allow_share") === "true" : undefined,
        allow_download: formData.has("allow_download") ? formData.get("allow_download") === "true" : undefined,
        published_at: publishedAtValue || undefined,
      }).data;
    } else {
      const body = await request.json();
      parsed = schema.safeParse(body).data;
    }

    if (!parsed) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Never trust client-side validation alone — re-check extension/MIME/size here.
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

    const baseSlug = parsed.slug ?? buildSlug(parsed.title);
    let slug = baseSlug;
    let attempt = 1;

    while (true) {
      const { data: existing, error: checkError } = await supabase
        .from("books")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 500 });
      }

      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${attempt}`;
      attempt += 1;
    }

    const status = parsed.status ?? "draft";
    const publishedAt = parsed.published_at
      ? new Date(parsed.published_at).toISOString()
      : status === "published"
        ? new Date().toISOString()
        : null;

    // supabase-js's mutation generics collapse to `never` for hand-written
    // (non-codegen'd) Database types on this package version; cast at the
    // query boundary the same way the rest of the admin routes do.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("books").insert({
      ...(parsed.id ? { id: parsed.id } : {}),
      slug,
      title: parsed.title,
      author: parsed.author || null,
      summary: parsed.summary || null,
      status,
      visibility: parsed.visibility ?? "private",
      allow_share: parsed.allow_share ?? true,
      allow_download: parsed.allow_download ?? true,
      published_at: publishedAt,
      created_by: auth.session.user.id,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let contentHtml: string | null = null;
    const warnings: string[] = [];

    if (uploadedFile && uploadedFile.size > 0) {
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

      // Original DOCX → book-originals/{bookId}/original.docx (private, admin-only per spec §8).
      const { error: uploadError } = await supabase.storage
        .from("book-originals")
        .upload(`${data.id}/original.docx`, fileBuffer, {
          contentType: DOCX_MIME_TYPE,
          upsert: true,
        });

      if (uploadError) {
        warnings.push("원본 파일 저장에 실패했습니다.");
      }

      try {
        const converted = await convertDocxToBookContent(fileBuffer, data.id, supabase);
        contentHtml = converted.html;
        warnings.push(...converted.warnings);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("books").update({
          content_html: converted.html,
          content_json: converted.blocks,
          toc_json: converted.toc,
        }).eq("id", data.id);
      } catch (err) {
        warnings.push(err instanceof DocxConversionError ? err.message : "DOCX 변환에 실패했습니다.");
      }
    }

    let coverUrl: string | null = null;
    if (coverFile && coverFile.size > 0) {
      const coverResult = await uploadCoverImage(supabase, data.id, coverFile);
      coverUrl = coverResult.url;
      if (coverResult.warning) warnings.push(coverResult.warning);
      if (coverUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("books").update({ cover_url: coverUrl }).eq("id", data.id);
      }
    }

    if (categoryIds.length > 0) {
      const rows = categoryIds.map((category_id) => ({ book_id: data.id, category_id }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: catError } = await (supabase as any).from("book_categories").insert(rows);
      if (catError) warnings.push("카테고리 연결에 실패했습니다.");
    }

    if (tagIds.length > 0) {
      const rows = tagIds.map((tag_id) => ({ book_id: data.id, tag_id }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: tagError } = await (supabase as any).from("book_tags").insert(rows);
      if (tagError) warnings.push("태그 연결에 실패했습니다.");
    }

    return NextResponse.json({
      ok: true,
      data: { ...data, content_html: contentHtml, cover_url: coverUrl },
      warning: warnings.length > 0 ? warnings.join(" ") : null,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 500 });
  }
}
