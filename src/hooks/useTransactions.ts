"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, transactionApi } from "@/lib/transaction-api";
import type { ListTransactionsResponse } from "@/types/transaction";

export interface UseTransactionsOptions {
  token: string | null;
  symbol?: string;
  page?: number;
  perPage?: number;
  /** ms — set > 0 for auto polling when not using WS. Default: 0 (off) */
  pollIntervalMs?: number;
}

interface UseTransactionsResult {
  data: ListTransactionsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTransactions({
  token,
  symbol,
  page = 1,
  perPage = 20,
  pollIntervalMs = 0,
}: UseTransactionsOptions): UseTransactionsResult {
  const [data, setData] = useState<ListTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!token) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const result = await transactionApi.list(token, {
        symbol,
        page,
        per_page: perPage,
      });
      setData(result);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to load transactions");
      }
    } finally {
      setLoading(false);
    }
  }, [token, symbol, page, perPage]);

  const refetch = useCallback(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    setLoading(true);
    void fetchList();
    if (pollIntervalMs > 0) {
      const id = setInterval(refetch, pollIntervalMs);
      return () => clearInterval(id);
    }
    return undefined;
  }, [fetchList, pollIntervalMs, refetch]);

  return { data, loading, error, refetch };
}
