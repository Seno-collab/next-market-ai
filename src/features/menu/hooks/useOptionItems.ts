"use client";

import { useCallback, useState } from "react";
import { fetchApiJson, notifyError, notifySuccess } from "@/lib/api/client";
import type { OptionItem, OptionItemInput, OptionItemUpdate } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";

type OptionItemsResponse = { items: OptionItem[] };
type OptionItemActionResponse = {
  message?: string;
  response_code?: string | number;
};

type OptionItemAction = "fetch" | "create" | "update" | "delete";

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

export function useOptionItems() {
  const { t } = useLocale();
  const [items, setItems] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<OptionItemAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActionResponse = useCallback(
    (response: OptionItemActionResponse, fallbackMessage: string) => {
      const responseCode = parseResponseCode(response.response_code);
      if (responseCode !== null && responseCode !== 200) {
        const message = typeof response.message === "string" ? response.message : fallbackMessage;
        notifyError(message);
        throw new Error(message);
      }
      if (typeof response.message === "string") {
        notifySuccess(response.message);
      }
    },
    [],
  );

  const fetchItems = useCallback(
    async (groupId: number) => {
      setAction("fetch");
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemsResponse>(
          `/api/menu/option-group/${groupId}/option-items`,
          { cache: "no-store" },
        );
        setItems(response.items ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.loadItemsFailed");
        setError(message);
      } finally {
        setLoading(false);
        setAction(null);
      }
    },
    [t],
  );

  const createItem = useCallback(
    async (payload: OptionItemInput) => {
      setAction("create");
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemActionResponse>("/api/menu/option-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        handleActionResponse(response, t("variants.errors.createItemFailed"));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.createItemFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  const updateItem = useCallback(
    async (id: number, payload: OptionItemUpdate) => {
      setAction("update");
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemActionResponse>(`/api/menu/option-item/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        handleActionResponse(response, t("variants.errors.updateItemFailed"));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.updateItemFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  const deleteItem = useCallback(
    async (id: number) => {
      setAction("delete");
      setError(null);
      try {
        const response = await fetchApiJson<OptionItemActionResponse>(`/api/menu/option-item/${id}`, {
          method: "DELETE",
        });
        handleActionResponse(response, t("variants.errors.deleteItemFailed"));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("variants.errors.deleteItemFailed");
        setError(message);
        throw err;
      } finally {
        setAction(null);
      }
    },
    [handleActionResponse, t],
  );

  return {
    items,
    loading,
    error,
    action,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  };
}
