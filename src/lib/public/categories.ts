import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase.from("categories").select("id,name,slug").order("name");
  return data ?? [];
}
