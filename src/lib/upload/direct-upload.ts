import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { DOCX_MIME_TYPE } from "@/lib/upload/docx";

/**
 * Uploads a file straight from the browser to Supabase Storage via a
 * server-issued signed upload URL, so the bytes never pass through a Vercel
 * Serverless Function's 4.5MB request body limit — see the comment on
 * `/api/admin/books/upload-url` for why this exists. Returns the Storage
 * path the server route just wrote to, so the caller can tell the save/
 * preview endpoint "the file is already there" without re-sending it.
 */
export async function uploadFileDirect(kind: "docx" | "cover", bookId: string, file: File): Promise<string> {
  const urlResponse = await fetch("/api/admin/books/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookId, kind }),
  });
  const urlBody = await urlResponse.json().catch(() => null);
  if (!urlResponse.ok || !urlBody?.ok) {
    throw new Error(urlBody?.error ?? "업로드 준비에 실패했습니다.");
  }

  const { bucket, path, token } = urlBody.data as { bucket: string; path: string; token: string };

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase가 설정되지 않았습니다.");
  }

  // `book-originals`' allow-list accepts only the exact DOCX MIME type
  // (migration 002) — some browsers/OSes report an empty `file.type` for
  // .docx (the same reason validateDocxFile tolerates that), which would
  // otherwise fall through to Storage's default content type and get
  // rejected. Force the known-correct type for docx explicitly; cover
  // uploads go to book-covers, which has no MIME restriction, so whatever
  // the browser reports (or its own fallback) is fine there.
  const contentType = kind === "docx" ? DOCX_MIME_TYPE : file.type || undefined;

  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, { contentType });
  if (error) {
    throw new Error(`파일 업로드에 실패했습니다: ${error.message}`);
  }

  return path;
}
