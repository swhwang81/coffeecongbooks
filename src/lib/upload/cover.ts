import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UploadCoverResult {
  url: string | null;
  warning: string | null;
}

/** Uploads a cover image to `book-covers/{bookId}/cover.webp` (spec §8 recommended path). */
export async function uploadCoverImage(
  supabase: SupabaseClient,
  bookId: string,
  file: File
): Promise<UploadCoverResult> {
  try {
    const original = Buffer.from(await file.arrayBuffer());
    const webp = await sharp(original).webp({ quality: 85 }).toBuffer();

    const { error } = await supabase.storage.from("book-covers").upload(`${bookId}/cover.webp`, webp, {
      contentType: "image/webp",
      upsert: true,
    });

    if (error) {
      return { url: null, warning: `표지 이미지 업로드 실패: ${error.message}` };
    }

    const { data } = supabase.storage.from("book-covers").getPublicUrl(`${bookId}/cover.webp`);
    // Same object path every time (`upsert: true`, spec §8's recommended
    // fixed cover path) means re-uploading a cover produces the exact same
    // URL as before — browsers and Supabase's Storage CDN both cache by
    // URL, so a re-upload with no cache-busting silently kept serving the
    // old image indefinitely even though the file on disk had changed.
    // A version query param makes each upload a distinct URL.
    return { url: `${data.publicUrl}?v=${Date.now()}`, warning: null };
  } catch {
    return { url: null, warning: "표지 이미지 처리에 실패했습니다." };
  }
}
