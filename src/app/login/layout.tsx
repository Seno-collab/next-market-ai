import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trading Seno | Login",
  description: "Sign in to Trading Seno admin dashboard. Secure authentication for your trading platform.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
