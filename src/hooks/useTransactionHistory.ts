"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, transactionApi } from "@/lib/transaction-api";
import type { ListTransactionHistoryResponse } from "@/types/transaction";

export function useTransactionHistory(token: string | null, limit = 120) {
  const [data, setData] = useState<ListTransactionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      const res = await transactionApi.history(token, { limit });
      setData(res);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to load history");
      }
    } finally {
      setLoading(false);
    }
  }, [token, limit]);

  useEffect(() => {
    void fetchHistory();
    const id = setInterval(fetchHistory, 10_000);
    return () => clearInterval(id);
  }, [fetchHistory]);

  return { data, loading, error, refetch: fetchHistory };
}
