"use client";

import { useTheme as useThemeContext } from "@/theme/ThemeProvider";

export function useTheme() {
  return useThemeContext();
}
