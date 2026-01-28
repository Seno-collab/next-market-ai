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
    default: "QR Lynx | Restaurant & Hotel Management with AI + QR Security",
    template: "%s | QR Lynx",
  },
  description: "Professional restaurant and hotel management platform with AI-powered security, QR menu system, real-time analytics, and 3D holographic dashboards. Built for hospitality excellence.",
  keywords: ["restaurant management", "hotel management", "QR menu", "AI security", "QR security", "hospitality", "digital menu", "admin dashboard", "3D visualization", "smart dining"],
  authors: [{ name: "QR Lynx Team" }],
  creator: "QR Lynx",
  metadataBase: new URL("https://qrlynx.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "QR Lynx",
    title: "QR Lynx | Restaurant & Hotel Management with AI + QR Security",
    description: "Professional restaurant and hotel management platform with AI-powered security, QR menu system, and real-time analytics for hospitality excellence.",
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Lynx | Restaurant & Hotel Management Platform",
    description: "AI + QR Security for modern restaurant and hotel operations with holographic dashboards.",
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
                  const stored = localStorage.getItem('next-ai-theme');
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
