import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Out | Into the Void",
  description: "Securely sign out of your Trading Seno session. Your data is safe and your session has been terminated.",
};

export default function LogoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
