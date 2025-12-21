"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, messages, type Locale } from "@/i18n/messages";

const STORAGE_KEY = "next-ai-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "vi" || stored === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate with server default first
      setLocale(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const t = useMemo(() => {
    return (key: string) => {
      const parts = key.split(".");
      let current: unknown = messages[locale];
      for (const part of parts) {
        if (typeof current !== "object" || current === null) {
          return key;
        }
        current = (current as Record<string, unknown>)[part];
      }
      return typeof current === "string" ? current : key;
    };
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("LocaleProvider is missing");
  }
  return context;
}
