import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Sora } from "next/font/google";
import Providers from "@/components/Providers";
import { defaultLocale } from "@/i18n/messages";
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

export const metadata: Metadata = {
  title: {
    default: "Tranding Seno | Smart Trading Platform with AI Analytics",
    template: "%s | Tranding Seno",
  },
  description: "Smart trading platform with AI-powered analytics, real-time market data, portfolio management, and interactive dashboards. Built for modern traders.",
  keywords: ["trading platform", "AI analytics", "market data", "portfolio management", "smart trading", "real-time analytics", "admin dashboard", "3D visualization", "trading tools"],
  authors: [{ name: "Tranding Seno Team" }],
  creator: "Tranding Seno",
  metadataBase: new URL("https://qrlynx.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Tranding Seno",
    title: "Tranding Seno | Smart Trading Platform with AI Analytics",
    description: "Smart trading platform with AI-powered analytics, real-time market data, and portfolio management for modern traders.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tranding Seno | Smart Trading Platform",
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
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('next-market-ai-theme');
                  const theme = (stored === 'dark' || stored === 'light')
                    ? stored
                    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.dataset.theme = theme;
                } catch (e) {
                  document.documentElement.dataset.theme = 'dark';
                }
              })();
            `,
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
