import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getAdminSession } from "@/lib/auth/server";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Authoritative check: proxy.ts only confirms the caller is signed in.
  // Role verification happens here, server-side, against admin_profiles —
  // never trust a client-supplied role (spec §9).
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return <AdminShell role={session.role}>{children}</AdminShell>;
}
