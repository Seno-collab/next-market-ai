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
    default: "QR Lynx | AI-Powered Smart Menu Platform",
    template: "%s | QR Lynx",
  },
  description: "Next-generation restaurant management with AI-powered QR menus, real-time analytics, and stunning 3D visualizations. Transform your dining experience.",
  keywords: ["QR menu", "restaurant", "AI", "smart dining", "digital menu", "analytics", "3D dashboard"],
  authors: [{ name: "QR Lynx Team" }],
  creator: "QR Lynx",
  metadataBase: new URL("https://qrlynx.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "QR Lynx",
    title: "QR Lynx | AI-Powered Smart Menu Platform",
    description: "Next-generation restaurant management with AI-powered QR menus, real-time analytics, and stunning 3D visualizations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "QR Lynx | AI-Powered Smart Menu Platform",
    description: "Transform your dining experience with AI-powered QR menus and real-time analytics.",
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
    <html lang={defaultLocale} data-theme="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
