"use client";

import { useLocaleContext } from "@/i18n/LocaleProvider";

export function useLocale() {
  return useLocaleContext();
}
