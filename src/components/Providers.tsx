"use client";

import AntdRegistry from "@/components/AntdRegistry";
import DocumentMeta from "@/components/DocumentMeta";
import { HolographicToastContainer } from "@/components/notifications/HolographicToastContainer";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { ThemeConfigProvider, ThemeProvider } from "@/theme/ThemeProvider";
import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showToast = pathname !== "/login";

  return (
    <LocaleProvider>
      <DocumentMeta />
      <ThemeProvider>
        <AntdRegistry>
          <ThemeConfigProvider>
            {children}
            {showToast && (
              <>
                <ToastContainer
                  position="top-right"
                  autoClose={4000}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  pauseOnFocusLoss
                  pauseOnHover
                  draggable
                  theme="dark"
                  limit={3}
                />
                <HolographicToastContainer />
              </>
            )}
          </ThemeConfigProvider>
        </AntdRegistry>
      </ThemeProvider>
    </LocaleProvider>
  );
}
