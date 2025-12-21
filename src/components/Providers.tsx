"use client";

import AntdRegistry from "@/components/AntdRegistry";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { ThemeConfigProvider, ThemeProvider } from "@/theme/ThemeProvider";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <AntdRegistry>
          <ThemeConfigProvider>{children}</ThemeConfigProvider>
        </AntdRegistry>
      </ThemeProvider>
    </LocaleProvider>
  );
}
