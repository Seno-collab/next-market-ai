"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPortfolio, ApiError } from "@/lib/portfolio-api";
import type { PortfolioResponse } from "@/types/portfolio";

export function usePortfolio(token: string | null, pollMs = 0) {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setData(null);
      return;
    }
    try {
      setData(await fetchPortfolio(token));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    if (pollMs > 0) {
      const id = setInterval(() => {
        void load();
      }, pollMs);
      return () => clearInterval(id);
    }
  }, [load, pollMs]);

  const openPositions = useMemo(
    () => data?.positions.filter((p) => p.net_qty > 0) ?? [],
    [data],
  );
  const closedPositions = useMemo(
    () => data?.positions.filter((p) => p.net_qty === 0) ?? [],
    [data],
  );

  return { data, openPositions, closedPositions, loading, error, refetch: load };
}
