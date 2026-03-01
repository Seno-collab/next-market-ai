import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Sora } from "next/font/google";
import Providers from "@/components/Providers";
import { defaultLocale } from "@/i18n/messages";
import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY } from "@/theme/constants";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const sora = Sora({
	variable: "--font-sora",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
	weight: ["400", "600"],
});

const themeBootstrapScript = `
  (function () {
    const mode = ${JSON.stringify(DEFAULT_THEME_MODE)};
    try {
      localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, mode);
    } catch {
      // Ignore storage errors.
    }
    document.documentElement.dataset.theme = mode;
  })();
`;

export const metadata: Metadata = {
	title: {
		default: "Coin Swing Trader | Smart Trading Platform with AI Analytics",
		template: "%s | Coin Swing Trader",
	},
	description:
		"Smart trading platform with AI-powered analytics, real-time market data, portfolio management, and interactive dashboards. Built for modern traders.",
	keywords: [
		"trading platform",
		"AI analytics",
		"market data",
		"portfolio management",
		"smart trading",
		"real-time analytics",
		"trading control center",
		"3D visualization",
		"trading tools",
	],
	authors: [{ name: "Coin Swing Trader Team" }],
	creator: "Coin Swing Trader",
	metadataBase: new URL("https://qrlynx.app"),
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Coin Swing Trader",
		title: "Coin Swing Trader | Smart Trading Platform with AI Analytics",
		description:
			"Smart trading platform with AI-powered analytics, real-time market data, and portfolio management for modern traders.",
	},
	twitter: {
		card: "summary_large_image",
		title: "Coin Swing Trader | Smart Trading Platform",
		description: "AI-powered analytics and tools for modern traders.",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0f1a" },
	],
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Ignore hydration mismatches caused by extensions injecting attributes into <html>/<body>.
	return (
		<html lang={defaultLocale} suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: themeBootstrapScript,
					}}
				/>
			</head>
			<body
				suppressHydrationWarning
				className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${jetbrainsMono.variable} antialiased`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
