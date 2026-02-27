import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Trading Seno | Login",
	description:
		"Sign in to Trading Seno control center. Secure authentication for your trading platform.",
};

type LoginLayoutProps = Readonly<{ children: React.ReactNode }>;

export default function LoginLayout({ children }: LoginLayoutProps) {
	return children;
}
