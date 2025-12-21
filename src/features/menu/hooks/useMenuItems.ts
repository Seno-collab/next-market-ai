"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/client";
import type { MenuItem, MenuItemInput, MenuItemUpdate } from "@/features/menu/types";

type MenuItemsResponse = { items: MenuItem[] };

type MenuItemResponse = { item: MenuItem };

type MenuAction = "fetch" | "create" | "update" | "delete" | "toggle";

export function useMenuItems() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<MenuAction | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setAction("fetch");
    setLoading(true);
    setError(null);
    try {
      const response = await fetchJson<MenuItemsResponse>("/api/menu/items", { cache: "no-store" });
      setItems(response.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải menu";
      setError(message);
    } finally {
      setLoading(false);
      setAction(null);
    }
  }, []);

  const createItem = useCallback(async (payload: MenuItemInput) => {
    setAction("create");
    setError(null);
    try {
      const response = await fetchJson<MenuItemResponse>("/api/menu/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setItems((prev) => [response.item, ...prev]);
      return response.item;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tạo món";
      setError(message);
      throw err;
    } finally {
      setAction(null);
    }
  }, []);

  const updateItem = useCallback(async (id: string, payload: MenuItemUpdate) => {
    setAction("update");
    setPendingId(id);
    setError(null);
    try {
      const response = await fetchJson<MenuItemResponse>(`/api/menu/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setItems((prev) => prev.map((item) => (item.id === id ? response.item : item)));
      return response.item;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật món";
      setError(message);
      throw err;
    } finally {
      setPendingId(null);
      setAction(null);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setAction("delete");
    setPendingId(id);
    setError(null);
    try {
      await fetchJson<{ message: string }>(`/api/menu/items/${id}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể xoá món";
      setError(message);
      throw err;
    } finally {
      setPendingId(null);
      setAction(null);
    }
  }, []);

  const toggleAvailability = useCallback(
    async (id: string, available: boolean) => {
      setAction("toggle");
      setPendingId(id);
      setError(null);
      try {
        const response = await fetchJson<MenuItemResponse>(`/api/menu/items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available }),
        });
        setItems((prev) => prev.map((item) => (item.id === id ? response.item : item)));
        return response.item;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không thể cập nhật trạng thái";
        setError(message);
        throw err;
      } finally {
        setPendingId(null);
        setAction(null);
      }
    },
    [],
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    action,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    toggleAvailability,
    pendingId,
  };
}
