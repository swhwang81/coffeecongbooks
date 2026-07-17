import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

const CHART_WINDOW_DAYS = 90;

export interface DashboardBookRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  created_at: string;
}

export interface DashboardViewRow {
  book_id: string;
  created_at: string;
}

export interface DashboardData {
  books: DashboardBookRow[];
  views: DashboardViewRow[];
  totalViews: number;
  recentBooks: DashboardBookRow[];
}

const EMPTY: DashboardData = { books: [], views: [], totalViews: 0, recentBooks: [] };

/**
 * Raw data for the admin dashboard (stat cards, views chart, recent books).
 * Deltas and period-scoped aggregation happen client-side in
 * `DashboardOverview` so the period selector doesn't need a refetch.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createServiceRoleSupabaseClient();
  if (!supabase) return EMPTY;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - CHART_WINDOW_DAYS);

  const [booksResult, viewsResult, totalViewsResult, recentBooksResult] = await Promise.all([
    supabase
      .from("books")
      .select("id,title,slug,status,visibility,created_at")
      .is("deleted_at", null),
    supabase
      .from("book_views")
      .select("book_id,created_at")
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false }),
    supabase.from("book_views").select("id", { count: "exact", head: true }),
    supabase
      .from("books")
      .select("id,title,slug,status,visibility,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    books: (booksResult.data as DashboardBookRow[] | null) ?? [],
    views: (viewsResult.data as DashboardViewRow[] | null) ?? [],
    totalViews: totalViewsResult.count ?? 0,
    recentBooks: (recentBooksResult.data as DashboardBookRow[] | null) ?? [],
  };
}
