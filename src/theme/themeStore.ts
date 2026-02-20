"use client";

import type { ThemeMode } from "./types";

const STORAGE_KEY = "next-market-ai-theme";

let currentMode: ThemeMode = "dark";
let initialized = false;

function applyMode(mode: ThemeMode) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = mode;
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors; mode is still applied to the document element.
    }
  }
}

const listeners = new Set<() => void>();
let listenersBound = false;

function notify() {
  listeners.forEach((listener) => listener());
}

function initializeFromStorage() {
  if (initialized || typeof window === "undefined") {
    return;
  }
  initialized = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      currentMode = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      currentMode = "dark";
    } else {
      currentMode = "light";
    }
  } catch {
    // Ignore storage errors; keep default "dark".
  }
  applyMode(currentMode);
}

function bindListeners() {
  if (listenersBound || typeof window === "undefined") {
    return;
  }
  listenersBound = true;

  initializeFromStorage();

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = (event: MediaQueryListEvent) => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        return;
      }
    } catch {
      // Ignore storage errors and fall back to media query.
    }
    currentMode = event.matches ? "dark" : "light";
    applyMode(currentMode);
    notify();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    const value = event.newValue;
    if (value !== "dark" && value !== "light") {
      return;
    }
    currentMode = value;
    applyMode(currentMode);
    notify();
  };

  mediaQuery.addEventListener("change", handleMediaChange);
  window.addEventListener("storage", handleStorage);
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  initializeFromStorage();
  bindListeners();
  return () => {
    listeners.delete(listener);
  };
}

export function getThemeSnapshot() {
  initializeFromStorage();
  return currentMode;
}

export function getServerSnapshot(): ThemeMode {
  return "dark";
}

export function updateThemeMode(mode: ThemeMode) {
  if (mode === currentMode) {
    return;
  }
  currentMode = mode;
  applyMode(mode);
  notify();
}
