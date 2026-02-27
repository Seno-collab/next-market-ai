import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TradingShell from "@/app/(workspace)/TradingShell";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

export const metadata: Metadata = {
	title: "Trading Control Center",
	description:
		"Trading Seno Control Center - Manage your trading portfolio, analytics, and market data with powerful 3D visualizations",
};

type WorkspaceLayoutProps = Readonly<{ children: React.ReactNode }>;

export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
	const cookieStore = await cookies();
	const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
	if (!token) {
		redirect("/login");
	}

	return <TradingShell>{children}</TradingShell>;
}
