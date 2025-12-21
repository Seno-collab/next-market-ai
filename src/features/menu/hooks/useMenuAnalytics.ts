"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/client";
import type { MenuAnalytics } from "@/features/menu/types";

type MenuAnalyticsResponse = { analytics: MenuAnalytics };

export function useMenuAnalytics() {
  const [data, setData] = useState<MenuAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchJson<MenuAnalyticsResponse>("/api/menu/analytics", {
        cache: "no-store",
      });
      setData(response.analytics);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải analytics";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
