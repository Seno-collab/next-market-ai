"use client";

import type { ThemeMode } from "./types";
import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY } from "./constants";

let currentMode: ThemeMode = DEFAULT_THEME_MODE;
let initialized = false;

function applyMode(mode: ThemeMode) {
	if (typeof document !== "undefined") {
		document.documentElement.dataset.theme = mode;
	}
	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem(THEME_STORAGE_KEY, mode);
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
	currentMode = DEFAULT_THEME_MODE;
	applyMode(currentMode);
}

function bindListeners() {
	if (listenersBound || typeof window === "undefined") {
		return;
	}
	listenersBound = true;
	initializeFromStorage();
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
	return DEFAULT_THEME_MODE;
}

export function updateThemeMode(mode: ThemeMode) {
	const nextMode: ThemeMode = mode === "dark" ? "dark" : DEFAULT_THEME_MODE;
	if (nextMode === currentMode) {
		return;
	}
	currentMode = nextMode;
	applyMode(nextMode);
	notify();
}
