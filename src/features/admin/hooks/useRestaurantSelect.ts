"use client";

import { useEffect, useRef, useState } from "react";
import type { SelectProps } from "antd";
import { useLocale } from "@/hooks/useLocale";
import {
  fetchJson,
  getStoredRestaurantId,
  setStoredRestaurantId,
} from "@/lib/api/client";

type RestaurantOption = { value: string; label: string };
type RestaurantResponse = {
  items?: Array<{ id: string | number; name: string }>;
  data?: unknown;
};

const optionsCache = new Map<string, RestaurantOption[]>();
const inFlightRequests = new Map<string, Promise<RestaurantOption[]>>();

function readIdValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

function readLabel(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function mapComboboxOptions(data: unknown): RestaurantOption[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = readIdValue(
        record.value ??
          record.id ??
          record.restaurant_id ??
          record.restaurantId ??
          record.code ??
          record.text
      );
      if (id === null) {
        return null;
      }
      const label =
        readLabel(
          record.text ??
            record.name ??
            record.title ??
            record.restaurant_name ??
            record.value ??
            record.id
        ) ?? String(id);
      return { value: String(id), label: String(label) };
    })
    .filter(Boolean) as RestaurantOption[];
}

function extractRestaurantOptions(response: RestaurantResponse) {
  if (response.items?.length) {
    return mapComboboxOptions(response.items);
  }
  return mapComboboxOptions(response.data);
}

function normalizeRestaurantError(err: unknown, fallback: string) {
  if (!(err instanceof Error)) {
    return fallback;
  }
  const message = err.message?.trim();
  if (!message) {
    return fallback;
  }
  const normalized = message.toLowerCase();
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  ) {
    return fallback;
  }
  return message;
}

async function requestRestaurantOptions(locale: string) {
  const cached = optionsCache.get(locale);
  if (cached) {
    return cached;
  }
  const inflight = inFlightRequests.get(locale);
  if (inflight) {
    return inflight;
  }
  const request = (async () => {
    const response = await fetchJson<RestaurantResponse>(
      "/api/restaurants/combobox",
      { cache: "no-store" }
    );
    const nextOptions = extractRestaurantOptions(response);
    optionsCache.set(locale, nextOptions);
    return nextOptions;
  })();
  inFlightRequests.set(locale, request);
  try {
    return await request;
  } finally {
    inFlightRequests.delete(locale);
  }
}

const filterOption: SelectProps["filterOption"] = (inputValue, option) => {
  const normalized = inputValue.toLowerCase();
  const optionValue = String(option?.value ?? "").toLowerCase();
  const optionLabel = String(option?.label ?? "").toLowerCase();
  return optionValue.includes(normalized) || optionLabel.includes(normalized);
};

export function useRestaurantSelect() {
  const { t, locale } = useLocale();
  const cachedOptions = optionsCache.get(locale) ?? [];
  const [options, setOptions] = useState<RestaurantOption[]>(cachedOptions);
  const [loading, setLoading] = useState(!optionsCache.has(locale));
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string | undefined>(undefined);
  const hasDefaultedRef = useRef(false);

  useEffect(() => {
    setValue(getStoredRestaurantId() ?? undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const loadRestaurants = async () => {
      const cached = optionsCache.get(locale);
      if (cached) {
        if (active) {
          setOptions(cached);
          setLoading(false);
          setError(null);
        }
        return;
      }
      if (active) {
        setLoading(true);
        setError(null);
      }
      try {
        const nextOptions = await requestRestaurantOptions(locale);
        if (active) {
          setOptions(nextOptions);
        }
      } catch (err) {
        if (active) {
          setError(
            normalizeRestaurantError(err, t("login.restaurantLoadFailed"))
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadRestaurants();
    return () => {
      active = false;
    };
  }, [locale, t]);

  useEffect(() => {
    if (hasDefaultedRef.current || options.length === 0) {
      return;
    }
    const stored = getStoredRestaurantId();
    if (stored) {
      setValue(stored);
      hasDefaultedRef.current = true;
      return;
    }
    const defaultValue = options[0]?.value;
    if (!value && defaultValue) {
      setValue(defaultValue);
      setStoredRestaurantId(defaultValue);
    }
    hasDefaultedRef.current = true;
  }, [options, value]);

  const handleChange = (nextValue: string | undefined) => {
    const normalized = nextValue?.trim();
    setValue(normalized || undefined);
    setStoredRestaurantId(normalized || null);
  };

  return {
    options,
    loading,
    error,
    value,
    handleChange,
    filterOption,
  };
}
