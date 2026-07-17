import type { Metadata } from "next";
import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { getDashboardData } from "@/lib/dashboard/data";

export const metadata: Metadata = {
  title: "관리자 대시보드",
};

export default async function AdminDashboardPage() {
  const { books, views, totalViews, recentBooks } = await getDashboardData();

  return <DashboardOverview books={books} views={views} totalViews={totalViews} recentBooks={recentBooks} />;
}
