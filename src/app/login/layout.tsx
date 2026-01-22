import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Enter the Portal",
  description: "Access your QR Lynx dashboard through our secure portal. AI-powered authentication with stunning 3D visuals.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
