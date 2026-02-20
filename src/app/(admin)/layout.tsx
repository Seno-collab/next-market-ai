import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/app/(admin)/AdminShell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Tranding Seno Admin - Manage your trading portfolio, analytics, and market data with powerful 3D visualizations",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    redirect("/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
