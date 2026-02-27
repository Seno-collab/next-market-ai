"use client";

import { useEffect, useRef } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import type { UseTransactionsOptions } from "@/hooks/useTransactions";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8080";

/**
 * Same as useTransactions, but refetches when ticker updates arrive over WS.
 * Useful for realtime pnl/current_value updates.
 */
export function useTransactionStream(options: UseTransactionsOptions) {
  const result = useTransactions(options);
  const wsRef = useRef<WebSocket | null>(null);
  const refetchRef = useRef(result.refetch);

  useEffect(() => {
    refetchRef.current = result.refetch;
  }, [result.refetch]);

  useEffect(() => {
    if (!options.symbol) return undefined;

    const ws = new WebSocket(
      `${WS_BASE}/ws/trading?symbol=${options.symbol.toUpperCase()}`,
    );
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as { type: string };
        if (msg.type === "ticker_update" || msg.type === "ticker_snapshot") {
          refetchRef.current();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [options.symbol]);

  return result;
}
