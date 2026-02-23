"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WsMessage,
  TickerUpdate,
  TradeUpdate,
  BookSnapshot,
  BookDelta,
  KlineUpdate,
} from "@/types/trading";

const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 10;

function tradeFingerprint(trade: TradeUpdate): string {
  return `${trade.id}:${trade.time}:${trade.is_buyer ? 1 : 0}:${trade.price}:${trade.qty}`;
}

/**
 * Resolve the WebSocket base URL.
 * Priority:
 *   1. NEXT_PUBLIC_WS_BASE_URL  — explicit WS override (e.g. "ws://localhost:8080")
 *   2. NEXT_PUBLIC_API_URL      — HTTP API URL; http→ws substitution applied
 *   3. window.location.origin   — same-origin fallback (works behind Nginx in prod)
 */
function getWsBase(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, ""); // strip trailing slash

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) return apiUrl.replace(/^http/, "ws").replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/^http/, "ws");
  }
  return "ws://localhost:8080";
}

export type StreamOrderBook = {
  lastUpdateId: number;
  bids: Map<string, string>;
  asks: Map<string, string>;
};

export type TradingStreamState = {
  ticker: TickerUpdate | null;
  trades: TradeUpdate[];
  orderBook: StreamOrderBook | null;
  liveCandle: KlineUpdate | null;
  connected: boolean;
  /** True while waiting to attempt a reconnect after a drop. */
  reconnecting: boolean;
};

export type TradingStreamReturn = TradingStreamState & {
  /** Manually reset the attempt counter and reconnect immediately. */
  reconnect: () => void;
};

export function useTradingStream(symbol: string): TradingStreamReturn {
  const [state, setState] = useState<TradingStreamState>({
    ticker: null,
    trades: [],
    orderBook: null,
    liveCandle: null,
    connected: false,
    reconnecting: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deltas that arrived before the book_snapshot — buffered for later merge.
  const pendingDeltas = useRef<BookDelta[]>([]);

  const applyDelta = useCallback(
    (book: StreamOrderBook, delta: BookDelta): StreamOrderBook => {
      const bids = new Map(book.bids);
      const asks = new Map(book.asks);
      for (const [price, qty] of delta.bids) {
        if (qty === "0" || qty === "0.00000000") bids.delete(price);
        else bids.set(price, qty);
      }
      for (const [price, qty] of delta.asks) {
        if (qty === "0" || qty === "0.00000000") asks.delete(price);
        else asks.set(price, qty);
      }
      return { lastUpdateId: delta.last_update_id, bids, asks };
    },
    [],
  );

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(raw) as WsMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case "book_snapshot": {
          const snap = msg.data as BookSnapshot;
          const bids = new Map(snap.bids.map((l) => [l.price, l.quantity]));
          const asks = new Map(snap.asks.map((l) => [l.price, l.quantity]));

          // Apply buffered deltas that arrived before the snapshot.
          let book: StreamOrderBook = { lastUpdateId: snap.last_update_id, bids, asks };
          for (const delta of pendingDeltas.current) {
            if (delta.last_update_id <= snap.last_update_id) continue;
            if (delta.first_update_id > snap.last_update_id + 1) break; // gap
            book = applyDelta(book, delta);
          }
          pendingDeltas.current = [];

          setState((s) => ({ ...s, orderBook: book }));
          break;
        }

        case "ticker_update":
          setState((s) => ({ ...s, ticker: msg.data as TickerUpdate }));
          break;

        case "trade_update":
          setState((s) => {
            const incoming = msg.data as TradeUpdate;
            const seen = new Set<string>();
            const deduped: TradeUpdate[] = [];

            for (const trade of [incoming, ...s.trades]) {
              const key = tradeFingerprint(trade);
              if (seen.has(key)) continue;
              seen.add(key);
              deduped.push(trade);
              if (deduped.length >= 100) break;
            }

            return { ...s, trades: deduped };
          });
          break;

        case "book_delta": {
          const delta = msg.data as BookDelta;
          setState((s) => {
            if (!s.orderBook) {
              // Snapshot not yet received — buffer the delta.
              pendingDeltas.current.push(delta);
              return s;
            }
            if (delta.last_update_id <= s.orderBook.lastUpdateId) return s;
            if (delta.first_update_id > s.orderBook.lastUpdateId + 1) {
              // Gap detected → force reconnect.
              pendingDeltas.current = [];
              wsRef.current?.close();
              return { ...s, orderBook: null };
            }
            return { ...s, orderBook: applyDelta(s.orderBook, delta) };
          });
          break;
        }

        case "kline_update":
          setState((s) => ({ ...s, liveCandle: msg.data as KlineUpdate }));
          break;
      }
    },
    [applyDelta],
  );

  const connect = useCallback(() => {
    if (!symbol) return;
    const url = `${getWsBase()}/ws/trading?symbol=${symbol.toUpperCase()}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
      setState((s) => ({ ...s, connected: true, reconnecting: false }));
    };

    ws.onmessage = (e) => handleMessage(e.data as string);

    ws.onclose = () => {
      const willRetry = reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS;
      // Keep ticker + orderBook so stale data stays visible; UI marks it as stale.
      setState((s) => ({ ...s, connected: false, reconnecting: willRetry }));
      pendingDeltas.current = [];

      if (willRetry) {
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => ws.close();
  }, [symbol, handleMessage]);

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    wsRef.current = null;
    reconnectAttempts.current = 0;
    pendingDeltas.current = [];
    setState((s) => ({ ...s, connected: false, reconnecting: true }));
    connect();
  }, [connect]);

  useEffect(() => {
    // Full reset on symbol change.
    setState({ ticker: null, trades: [], orderBook: null, liveCandle: null, connected: false, reconnecting: false });
    pendingDeltas.current = [];
    reconnectAttempts.current = 0;

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { ...state, reconnect };
}
