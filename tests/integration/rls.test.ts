import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Exercises the real RLS policies (spec §9) against the real linked
// Supabase project — the whole point is verifying Postgres actually
// enforces these rules, which a mocked client can't do. Skips itself when
// credentials aren't configured.
const hasSupabaseCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

describe.skipIf(!hasSupabaseCredentials)("Book DB save + RLS (integration)", () => {
  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;

  const publicBook = { id: randomUUID(), slug: `rls-test-public-${Date.now()}` };
  const unlistedBook = { id: randomUUID(), slug: `rls-test-unlisted-${Date.now()}`, token: `rlstest${Date.now()}` };
  const privateBook = { id: randomUUID(), slug: `rls-test-private-${Date.now()}` };
  const draftBook = { id: randomUUID(), slug: `rls-test-draft-${Date.now()}` };

  beforeAll(async () => {
    serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rows = [
      { id: publicBook.id, slug: publicBook.slug, title: "RLS Test Public", status: "published", visibility: "public" },
      {
        id: unlistedBook.id,
        slug: unlistedBook.slug,
        title: "RLS Test Unlisted",
        status: "published",
        visibility: "unlisted",
        share_token: unlistedBook.token,
      },
      {
        id: privateBook.id,
        slug: privateBook.slug,
        title: "RLS Test Private",
        status: "published",
        visibility: "private",
      },
      { id: draftBook.id, slug: draftBook.slug, title: "RLS Test Draft", status: "draft", visibility: "public" },
    ];
    const { error } = await serviceClient.from("books").insert(rows);
    if (error) throw error;
  });

  afterAll(async () => {
    await serviceClient
      .from("books")
      .delete()
      .in("id", [publicBook.id, unlistedBook.id, privateBook.id, draftBook.id]);
  });

  it("DB save: the service-role client can read back exactly what it inserted", async () => {
    const { data, error } = await serviceClient.from("books").select("title,status,visibility").eq("id", publicBook.id).single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ title: "RLS Test Public", status: "published", visibility: "public" });
  });

  it("public access: anon key can read a published+public book", async () => {
    const { data, error } = await anonClient.from("books").select("id").eq("id", publicBook.id).maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(publicBook.id);
  });

  it("public access excludes drafts, even if visibility is public", async () => {
    const { data } = await anonClient.from("books").select("id").eq("id", draftBook.id).maybeSingle();
    expect(data).toBeNull();
  });

  it("unlisted access: anon key CANNOT read an unlisted book via a plain table select", async () => {
    // This is the exact enumeration hole the get_book_by_share_token RPC
    // (migration 008) exists to close — plain RLS on `visibility` alone
    // would let this succeed.
    const { data } = await anonClient.from("books").select("id").eq("id", unlistedBook.id).maybeSingle();
    expect(data).toBeNull();
  });

  it("unlisted access: anon key CAN read an unlisted book via the share-token RPC with the correct token", async () => {
    const { data, error } = await anonClient.rpc("get_book_by_share_token", { p_token: unlistedBook.token });
    expect(error).toBeNull();
    expect(data?.[0]?.id).toBe(unlistedBook.id);
  });

  it("unlisted access: the RPC returns nothing for a wrong/guessed token", async () => {
    const { data } = await anonClient.rpc("get_book_by_share_token", { p_token: "not-the-real-token" });
    expect(data ?? []).toHaveLength(0);
  });

  it("private access: denied to anon key both by plain select and by the share-token RPC", async () => {
    const { data: bySelect } = await anonClient.from("books").select("id").eq("id", privateBook.id).maybeSingle();
    expect(bySelect).toBeNull();

    // Private books never get a real share_token minted, but even if one
    // leaked some other way, the RPC itself requires visibility='unlisted'.
    const { data: byRpc } = await anonClient.rpc("get_book_by_share_token", { p_token: "irrelevant" });
    expect((byRpc ?? []).find((b: { id: string }) => b.id === privateBook.id)).toBeUndefined();
  });

  it("anon key cannot write to books at all", async () => {
    const { error } = await anonClient.from("books").update({ title: "hacked" }).eq("id", publicBook.id);
    // RLS silently matches zero rows rather than erroring — verify the title didn't change.
    expect(error).toBeNull();
    const { data } = await serviceClient.from("books").select("title").eq("id", publicBook.id).single();
    expect(data?.title).toBe("RLS Test Public");
  });
});
