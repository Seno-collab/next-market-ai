import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Sign Out | Into the Void",
	description:
		"Securely sign out of your Coin Swing Trader session. Your data is safe and your session has been terminated.",
};

type LogoutLayoutProps = Readonly<{ children: React.ReactNode }>;

export default function LogoutLayout({ children }: LogoutLayoutProps) {
	return children;
}
