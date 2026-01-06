"use client";

import { ConfigProvider, theme as antdTheme } from "antd";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ThemeMode } from "./types";
import { getServerSnapshot, getThemeSnapshot, subscribeTheme, updateThemeMode } from "./themeStore";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = Readonly<{ children: React.ReactNode }>;

export function ThemeProvider({ children }: ThemeProviderProps) {
  const mode = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);

  const handleSetMode = useCallback((nextMode: ThemeMode) => {
    updateThemeMode(nextMode);
  }, []);

  const handleToggle = useCallback(() => {
    const nextMode = mode === "dark" ? "light" : "dark";
    updateThemeMode(nextMode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode: handleSetMode,
      toggle: handleToggle,
    }),
    [handleSetMode, handleToggle, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeConfigProvider({ children }: ThemeProviderProps) {
  const { isDark } = useTheme();

  const themeConfig = useMemo(
    () => ({
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: "#1677ff",
        borderRadius: 12,
      },
      components: {
        Menu: {
          darkItemBg: "transparent",
          darkSubMenuItemBg: "transparent",
          itemSelectedBg: isDark ? "rgba(255, 255, 255, 0.08)" : undefined,
        },
      },
    }),
    [isDark],
  );

  return <ConfigProvider theme={themeConfig}>{children}</ConfigProvider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("ThemeProvider is missing");
  }
  return context;
}

export type { ThemeMode } from "./types";
