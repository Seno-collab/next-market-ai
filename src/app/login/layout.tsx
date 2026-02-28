import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Coin Swing Trader | Login",
	description:
		"Sign in to Coin Swing Trader control center. Secure authentication for your trading platform.",
};

type LoginLayoutProps = Readonly<{ children: React.ReactNode }>;

export default function LoginLayout({ children }: LoginLayoutProps) {
	return children;
}
