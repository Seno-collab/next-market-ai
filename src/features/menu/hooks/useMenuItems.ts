"use client";

import type {
  MenuItem,
  MenuItemInput,
  MenuItemUpdate,
} from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import {
  RESTAURANT_ID_CHANGE_EVENT,
  fetchApiJson,
  getStoredRestaurantId,
  notifyError,
  notifySuccess,
} from "@/lib/api/client";
import { useCallback, useEffect, useRef, useState } from "react";

type MenuItemsResponse = {
  items?: unknown[];
  data?: unknown;
  message?: string;
  response_code?: string | number;
};

type MenuActionResponse = {
  message?: string;
  response_code?: string | number;
};

type MenuItemResponse = { item: MenuItem } & MenuActionResponse;
type MenuStatusResponse = {
  item?: MenuItem;
  data?: unknown;
} & MenuActionResponse;

type MenuAction =
  | "fetch"
  | "search"
  | "create"
  | "update"
  | "delete"
  | "toggle";

type MenuItemsRefreshPayload =
  | MenuItemsResponse
  | MenuItem[]
  | { data?: unknown }
  | Record<string, unknown>;

type MenuSearchParams = {
  category?: string;
  filter?: string;
  isActive?: boolean;
  limit?: number;
  page?: number;
};

type MenuSearchResponse = {
  items?: unknown[];
  data?: {
    items?: unknown[];
    limit?: number;
    page?: number;
    total_items?: number;
    total_pages?: number;
    totalItems?: number;
    totalPages?: number;
    data?: unknown;
  } | null;
  message?: string;
  response_code?: string | number;
};

type MenuSearchMeta = {
  limit: number | null;
  page: number | null;
  totalItems: number | null;
  totalPages: number | null;
};

type MenuItemRecord = Record<string, unknown>;

const MENU_ITEM_SEARCH_PATH = "/api/menu/items/search";

type UseMenuItemsOptions = {
  autoFetch?: boolean;
};

function buildMenuRequestPayload(payload: MenuItemInput | MenuItemUpdate) {
  const { available, category, imageUrl, ...rest } = payload as Record<string, unknown>;
  const requestPayload: Record<string, unknown> = { ...rest };

  if (typeof available === "boolean") {
    requestPayload.is_active = available;
  }
  if (typeof category === "string") {
    requestPayload.type = category;
  }
  if (typeof imageUrl === "string") {
    requestPayload.image_url = imageUrl;
  }
  if (typeof payload.price === "string") {
    const parsedPrice = Number(payload.price);
    requestPayload.price = Number.isFinite(parsedPrice) ? parsedPrice : undefined;
  } else if (typeof payload.price === "number") {
    requestPayload.price = Number.isFinite(payload.price) ? payload.price : undefined;
  }

  return requestPayload;
}

function parseResponseCode(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readRecord(value: unknown): MenuItemRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as MenuItemRecord;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (
      ["true", "1", "yes", "y", "on", "active", "enabled"].includes(normalized)
    ) {
      return true;
    }
    if (
      ["false", "0", "no", "n", "off", "inactive", "disabled"].includes(
        normalized
      )
    ) {
      return false;
    }
  }
  return null;
}

function sanitizeImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return encodeURI(trimmed).replace(/#/g, "%23");
}

function normalizeCategory(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "dish":
    case "extra":
    case "beverage":
    case "combo":
      return normalized;
    case "coffee":
    case "tea":
      return "beverage";
    case "dessert":
    case "food":
      return "dish";
    case "other":
      return "extra";
    default:
      return normalized;
  }
}

function readMenuItemId(record: MenuItemRecord) {
  const idValue =
    record.id ??
    record.menu_item_id ??
    record.item_id ??
    record.menuItemId ??
    record.sku ??
    record.sku_code ??
    record.code;
  if (typeof idValue === "string" && idValue.trim()) {
    return idValue;
  }
  if (typeof idValue === "number" && Number.isFinite(idValue)) {
    return String(idValue);
  }
  return null;
}

function mapMenuItemRecord(record: MenuItemRecord): MenuItem | null {
  const id = readMenuItemId(record);
  if (!id) {
    return null;
  }
  const name = readString(record.name ?? record.title) ?? "";
  const description =
    readString(record.description ?? record.desc ?? record.detail) ?? "";
  const typeValue = readString(record.type);
  const categoryRaw = readString(record.category ?? record.category_code);
  const category =
    normalizeCategory(categoryRaw) ??
    normalizeCategory(typeValue) ??
    "extra";
  const price =
    readNumber(
      record.price ??
        record.price_value ??
        record.price_vnd ??
        record.priceValue
    ) ?? 0;
  const sku = readString(record.sku ?? record.sku_code ?? record.code) ?? "";
  const topicId = readNumber(
    record.topic_id ?? record.topicId ?? record.menu_topic_id
  );
  const available =
    readBoolean(
      record.available ??
        record.is_available ??
        record.is_active ??
        record.active ??
        record.status
    ) ?? true;
  const imageUrl =
    readString(
      record.image_url ??
        record.imageUrl ??
        record.image ??
        record.thumbnail_url
    ) ?? "";
  const createdAt =
    readString(record.created_at ?? record.createdAt) ??
    new Date().toISOString();
  const updatedAt =
    readString(record.updated_at ?? record.updatedAt) ?? createdAt;

  return {
    id,
    name,
    description: description || undefined,
    category,
    price,
    sku: sku || undefined,
    topicId: topicId ?? undefined,
    available,
    is_active: available,
    imageUrl: imageUrl ? sanitizeImageUrl(imageUrl) : undefined,
    createdAt,
    updatedAt,
  };
}

function extractMenuItem(payload: unknown): MenuItem | null {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return null;
  }
  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const itemRecord = readRecord(
      record.item ??
        record.menu_item ??
        record.menuItem ??
        record.data ??
        record.result
    );
    if (itemRecord) {
      return mapMenuItemRecord(itemRecord);
    }
    return mapMenuItemRecord(record as MenuItemRecord);
  }
  return null;
}

function extractMenuItems(payload: unknown): MenuItem[] | null {
  if (!payload) {
    return null;
  }
  if (Array.isArray(payload)) {
    return payload
      .map((item) => mapMenuItemRecord(item as MenuItemRecord))
      .filter(Boolean) as MenuItem[];
  }
  if (typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) {
    return record.items
      .map((item) => mapMenuItemRecord(item as MenuItemRecord))
      .filter(Boolean) as MenuItem[];
  }
  if (Array.isArray(record.data)) {
    return record.data
      .map((item) => mapMenuItemRecord(item as MenuItemRecord))
      .filter(Boolean) as MenuItem[];
  }
  if (record.data && typeof record.data === "object") {
    const dataRecord = record.data as Record<string, unknown>;
    if (Array.isArray(dataRecord.items)) {
      return dataRecord.items
        .map((item) => mapMenuItemRecord(item as MenuItemRecord))
        .filter(Boolean) as MenuItem[];
    }
    if (Array.isArray(dataRecord.data)) {
      return dataRecord.data
        .map((item) => mapMenuItemRecord(item as MenuItemRecord))
        .filter(Boolean) as MenuItem[];
    }
    if (dataRecord.data && typeof dataRecord.data === "object") {
      const nestedRecord = dataRecord.data as Record<string, unknown>;
      if (Array.isArray(nestedRecord.items)) {
        return nestedRecord.items
          .map((item) => mapMenuItemRecord(item as MenuItemRecord))
          .filter(Boolean) as MenuItem[];
      }
    }
  }
  return null;
}

function resolveMenuItemFromResponse(payload: unknown): MenuItem | null {
  return extractMenuItem(payload) ?? extractMenuItem((payload as Record<string, unknown> | null)?.data);
}

function extractMenuSearchItems(payload: MenuSearchResponse) {
  const direct = extractMenuItems(payload);
  if (direct !== null) {
    return direct;
  }
  const nested = extractMenuItems(payload.data);
  if (nested !== null) {
    return nested;
  }
  const dataRecord = readRecord(payload.data);
  const deepNested = extractMenuItems(dataRecord?.data);
  return deepNested ?? [];
}

function handleMenuActionResponse(
  response: MenuActionResponse,
  fallbackMessage: string
) {
  const responseCode = parseResponseCode(response.response_code);
  if (responseCode !== null && responseCode !== 200) {
    const message =
      typeof response.message === "string" ? response.message : fallbackMessage;
    notifyError(message);
    throw new Error(message);
  }
  if (typeof response.message === "string") {
    notifySuccess(response.message);
  }
}

export function useMenuItems(options: UseMenuItemsOptions = {}) {
  const { t } = useLocale();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<MenuAction | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [searchMeta, setSearchMeta] = useState<MenuSearchMeta | null>(null);
  const lastSearchParamsRef = useRef<MenuSearchParams | null>(null);
  const restaurantIdRef = useRef<string | null>(getStoredRestaurantId());
  const autoFetch = options.autoFetch !== false;

  const fetchItems = useCallback(async () => {
    setAction("fetch");
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApiJson<MenuItemsResponse>("/api/menu/items", {
        cache: "no-store",
      });
      const nextItems = extractMenuItems(response) ?? [];
      setItems(nextItems);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("menu.errors.loadFailed");
      setError(message);
    } finally {
      setLoading(false);
      setAction(null);
    }
  }, [t]);

  const searchItems = useCallback(
    async (params: MenuSearchParams = {}) => {
      lastSearchParamsRef.current = params;
      setAction("search");
      setLoading(true);
      setError(null);
      const payload: Record<string, unknown> = {};
      const filter = params.filter?.trim();
      if (filter) {
        payload.filter = filter;
      }
      if (params.category) {
        payload.category = params.category;
      }
      if (typeof params.isActive === "boolean") {
        payload.is_active = params.isActive;
      }
      if (typeof params.limit === "number") {
        payload.limit = params.limit;
      }
      if (typeof params.page === "number") {
        payload.page = params.page;
      }
      try {
        const response = await fetchApiJson<MenuSearchResponse>(
          MENU_ITEM_SEARCH_PATH,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const responseCode = parseResponseCode(response.response_code);
        if (responseCode !== null && responseCode !== 200) {
          const message =
            typeof response.message === "string"
              ? response.message
              : t("menu.errors.loadFailed");
          notifyError(message);
          setError(message);
          return;
        }
        const nextItems = extractMenuSearchItems(response);
        setItems(nextItems);
        const dataRecord = readRecord(response.data);
        const nestedDataRecord = readRecord(dataRecord?.data);
        const metaSource = nestedDataRecord ?? dataRecord;
        setSearchMeta({
          limit: readNumber(metaSource?.limit) ?? null,
          page: readNumber(metaSource?.page) ?? null,
          totalItems:
            readNumber(metaSource?.total_items ?? metaSource?.totalItems) ??
            null,
          totalPages:
            readNumber(metaSource?.total_pages ?? metaSource?.totalPages) ??
            null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.loadFailed");
        setError(message);
      } finally {
        setLoading(false);
        setAction(null);
      }
    },
    [t]
  );

  const rerunLastQuery = useCallback(async () => {
    if (lastSearchParamsRef.current) {
      await searchItems({ ...lastSearchParamsRef.current });
      return;
    }
    await searchItems({});
  }, [searchItems]);

  const createItem = useCallback(
    async (payload: MenuItemInput) => {
      setAction("create");
      setError(null);
      try {
        const response = await fetchApiJson<MenuItemResponse>("/api/menu/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildMenuRequestPayload(payload)),
        });
        handleMenuActionResponse(response, t("menu.errors.createFailed"));
        const newItem = resolveMenuItemFromResponse(response);
        let refreshed = false;
        try {
          const refreshedPayload = await fetchApiJson<MenuItemsRefreshPayload>(
            "/menu/restaurant/items",
            { cache: "no-store" }
          );
          const refreshedItems = extractMenuItems(refreshedPayload);
          if (refreshedItems !== null) {
            setItems(refreshedItems);
            refreshed = true;
          }
        } catch {
          // Ignore refresh errors; fallback to local optimistic update.
        }
        if (!refreshed && newItem) {
          setItems((prev) => [newItem, ...prev.filter(Boolean)]);
        }
        if (!newItem && !refreshed) {
          await fetchItems();
        }
        await rerunLastQuery();
        return newItem;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.createFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [fetchItems, rerunLastQuery, t]
  );

  const updateItem = useCallback(
    async (id: string, payload: MenuItemUpdate) => {
      setAction("update");
      setPendingId(id);
      setError(null);
      try {
        const response = await fetchApiJson<MenuItemResponse>(
          `/api/menu/items/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildMenuRequestPayload(payload)),
          }
        );
        handleMenuActionResponse(response, t("menu.errors.updateFailed"));
        const updatedItem = resolveMenuItemFromResponse(response);
        if (updatedItem) {
          setItems((prev) =>
            prev
              .map((item) => (item.id === id ? updatedItem : item))
              .filter(Boolean) as MenuItem[]
          );
          await rerunLastQuery();
          return updatedItem;
        }
        setItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) {
              return item;
            }
            const nextAvailable =
              typeof payload.available === "boolean"
                ? payload.available
                : typeof (payload as { is_active?: boolean }).is_active === "boolean"
                  ? (payload as { is_active: boolean }).is_active
                  : item.available;
            const nextCategory =
              typeof payload.category === "string"
                ? payload.category
                : typeof (payload as { type?: string }).type === "string"
                  ? (payload as { type: string }).type
                  : item.category;
            const nextImageUrl =
              typeof (payload as { imageUrl?: string }).imageUrl === "string"
                ? (payload as { imageUrl: string }).imageUrl
                : typeof (payload as { image_url?: string }).image_url === "string"
                  ? (payload as { image_url: string }).image_url
                  : item.imageUrl;
            const nextPrice =
              typeof payload.price === "number"
                ? payload.price
                : typeof payload.price === "string" && Number.isFinite(Number(payload.price))
                  ? Number(payload.price)
                  : item.price;
            return {
              ...item,
              ...payload,
              category: nextCategory ?? item.category,
              available: nextAvailable,
              is_active: nextAvailable,
              imageUrl: nextImageUrl,
              price: nextPrice,
            } as MenuItem;
          })
        );
        await rerunLastQuery();
        return null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.updateFailed");
        setError(message);
        throw err;
      } finally {
        setPendingId(null);
        setAction(null);
      }
    },
    [fetchItems, rerunLastQuery, t]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      setAction("delete");
      setPendingId(id);
      setError(null);
      try {
        const response = await fetchApiJson<MenuActionResponse>(
          `/api/menu/items/${id}`,
          {
            method: "DELETE",
          }
        );
        handleMenuActionResponse(response, t("menu.errors.deleteFailed"));
        setItems((prev) => prev.filter((item) => item.id !== id));
        await rerunLastQuery();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("menu.errors.deleteFailed");
        setError(message);
        throw err;
      } finally {
        setPendingId(null);
        setAction(null);
      }
    },
    [rerunLastQuery, t]
  );

  const toggleAvailability = useCallback(
    async (id: string, available: boolean) => {
      setAction("toggle");
      setPendingId(id);
      setError(null);
      try {
        const response = await fetchApiJson<MenuStatusResponse>(
          `/api/menu/items/${id}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: available }),
          }
        );
        handleMenuActionResponse(
          response,
          t("menu.errors.updateStatusFailed")
        );
        const updatedItem =
          response.item ??
          extractMenuItem(response) ??
          extractMenuItem(response.data);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? updatedItem ?? { ...item, available }
              : item
          )
        );
        await rerunLastQuery();
        return updatedItem ?? null;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("menu.errors.updateStatusFailed");
        setError(message);
        throw err;
      } finally {
        setPendingId(null);
        setAction(null);
      }
    },
    [rerunLastQuery, t]
  );

  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    fetchItems();
  }, [autoFetch, fetchItems]);

  useEffect(() => {
    const handleRestaurantChange = () => {
      const stored = getStoredRestaurantId();
      restaurantIdRef.current = stored;
      if (lastSearchParamsRef.current) {
        void searchItems({ ...lastSearchParamsRef.current });
      } else if (autoFetch) {
        void fetchItems();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener(RESTAURANT_ID_CHANGE_EVENT, handleRestaurantChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(RESTAURANT_ID_CHANGE_EVENT, handleRestaurantChange);
      }
    };
  }, [autoFetch, fetchItems, searchItems]);

  return {
    items,
    loading,
    error,
    action,
    fetchItems,
    searchItems,
    createItem,
    updateItem,
    deleteItem,
    toggleAvailability,
    pendingId,
    searchMeta,
  };
}
