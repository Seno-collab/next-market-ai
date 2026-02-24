"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BookDelta,
  BookSnapshot,
  KlineUpdate,
  OrderBookState,
  TickerUpdate,
  TradeUpdate,
  WsMessage,
} from "@/types/trading";

// ── Config ────────────────────────────────────────────────────────────────────

// Exponential backoff: 1s → 2s → 4s → … → 30s cap, ±20% jitter.
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 20;
// Force-reconnect if the server goes silent for this long.
const HEARTBEAT_TIMEOUT_MS = 45_000;
// How long to keep ▲▼ change indicators visible after a delta arrives.
const BOOK_CHANGE_TTL_MS = 600;
// Max trades to keep in memory.
const MAX_TRADES = 50;

function reconnectDelay(attempt: number): number {
  const base = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
  return base * (0.8 + Math.random() * 0.4); // ±20% jitter
}

function tradeFingerprint(t: TradeUpdate): string {
  return `${t.id}:${t.time}:${t.is_buyer ? 1 : 0}:${t.price}:${t.qty}`;
}

function getWsBase(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) return apiUrl.replace(/^http/, "ws").replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin.replace(/^http/, "ws");
  return "ws://localhost:8080";
}

// ── Book helpers ──────────────────────────────────────────────────────────────

function snapshotToState(snap: BookSnapshot): OrderBookState {
  return {
    lastUpdateId: snap.last_update_id,
    bids: new Map(snap.bids.map((l) => [l.price, l.quantity])),
    asks: new Map(snap.asks.map((l) => [l.price, l.quantity])),
    bestBid: snap.best_bid,
    bestAsk: snap.best_ask,
    spread: snap.spread,
    spreadPercent: snap.spread_percent,
    midPrice: snap.mid_price,
    totalBidQty: snap.total_bid_qty,
    totalAskQty: snap.total_ask_qty,
  };
}

// ── Public types ──────────────────────────────────────────────────────────────

/** Direction of a size change on a price level from the last book_delta. */
export type BookChange = "up" | "down";
/**
 * Map of price → change direction — populated after each book_delta,
 * auto-cleared after BOOK_CHANGE_TTL_MS so ▲▼ indicators fade out.
 */
export type BookChangeMap = Map<string, BookChange>;

export type TradingStreamState = {
  ticker: TickerUpdate | null;
  orderBook: OrderBookState | null;
  /** Size changes from the most-recent book_delta (price → "up"|"down"). */
  bookChanges: BookChangeMap;
  trades: TradeUpdate[];
  liveCandle: KlineUpdate | null;
  connected: boolean;
  /** True while waiting to re-attempt after a drop. */
  reconnecting: boolean;
  /** True after first successful connection — gates "Connection lost" banner. */
  everConnected: boolean;
};

export type TradingStreamReturn = TradingStreamState & {
  reconnect: () => void;
};

const EMPTY_CHANGES: BookChangeMap = new Map();

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTradingStream(symbol: string): TradingStreamReturn {
  const [state, setState] = useState<TradingStreamState>({
    ticker: null,
    orderBook: null,
    bookChanges: EMPTY_CHANGES,
    trades: [],
    liveCandle: null,
    connected: false,
    reconnecting: false,
    everConnected: false,
  });

  const wsRef            = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Deltas buffered while waiting for book_snapshot.
  const pendingDeltas    = useRef<BookDelta[]>([]);

  // ── Timers ──────────────────────────────────────────────────────────────────

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) { clearTimeout(heartbeatTimer.current); heartbeatTimer.current = null; }
  }, []);

  const clearChangeReset = useCallback(() => {
    if (changeResetTimer.current) { clearTimeout(changeResetTimer.current); changeResetTimer.current = null; }
  }, []);

  const resetHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimer.current = setTimeout(() => {
      wsRef.current?.close();
    }, HEARTBEAT_TIMEOUT_MS);
  }, [clearHeartbeat]);

  const scheduleChangeClear = useCallback(() => {
    clearChangeReset();
    changeResetTimer.current = setTimeout(() => {
      changeResetTimer.current = null;
      setState((s) => s.bookChanges.size === 0 ? s : { ...s, bookChanges: EMPTY_CHANGES });
    }, BOOK_CHANGE_TTL_MS);
  }, [clearChangeReset]);

  // ── closeSocket ─────────────────────────────────────────────────────────────

  const closeSocket = useCallback(
    (detach = false) => {
      clearHeartbeat();
      clearChangeReset();
      const ws = wsRef.current;
      if (!ws) return;
      if (detach) wsRef.current = null;
      ws.close();
    },
    [clearHeartbeat, clearChangeReset],
  );

  // ── applyDelta: returns new OrderBookState + BookChangeMap ──────────────────

  const applyDelta = useCallback(
    (book: OrderBookState, delta: BookDelta): { book: OrderBookState; changes: BookChangeMap } => {
      const bids    = new Map(book.bids);
      const asks    = new Map(book.asks);
      const changes = new Map<string, BookChange>();

      for (const [price, qty] of delta.bids) {
        if (qty === "0" || qty === "0.00000000") {
          bids.delete(price);
        } else {
          const prev = bids.get(price);
          if (prev !== undefined)
            changes.set(price, parseFloat(qty) > parseFloat(prev) ? "up" : "down");
          bids.set(price, qty);
        }
      }
      for (const [price, qty] of delta.asks) {
        if (qty === "0" || qty === "0.00000000") {
          asks.delete(price);
        } else {
          const prev = asks.get(price);
          if (prev !== undefined)
            changes.set(price, parseFloat(qty) > parseFloat(prev) ? "up" : "down");
          asks.set(price, qty);
        }
      }

      return {
        book: { ...book, lastUpdateId: delta.last_update_id, bids, asks },
        changes,
      };
    },
    [],
  );

  // ── handleMessage ────────────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: WsMessage;
      try { msg = JSON.parse(raw) as WsMessage; } catch { return; }

      switch (msg.type) {

        // ── book_snapshot ──────────────────────────────────────────────────────
        case "book_snapshot": {
          const snap = msg.data as BookSnapshot;
          let book   = snapshotToState(snap);

          // Apply buffered deltas that arrived before the snapshot.
          const allChanges = new Map<string, BookChange>();
          for (const delta of pendingDeltas.current) {
            if (delta.last_update_id <= snap.last_update_id) continue; // stale
            if (delta.first_update_id > snap.last_update_id + 1) break; // gap
            const { book: nb, changes } = applyDelta(book, delta);
            book = nb;
            for (const [k, v] of changes) allChanges.set(k, v);
          }
          pendingDeltas.current = [];
          setState((s) => ({ ...s, orderBook: book, bookChanges: allChanges }));
          if (allChanges.size > 0) scheduleChangeClear();
          break;
        }

        // ── ticker_update ──────────────────────────────────────────────────────
        case "ticker_update":
          setState((s) => ({ ...s, ticker: msg.data as TickerUpdate }));
          break;

        // ── trade_update ───────────────────────────────────────────────────────
        case "trade_update":
          setState((s) => {
            const incoming = msg.data as TradeUpdate;
            const seen     = new Set<string>();
            const deduped: TradeUpdate[] = [];
            for (const t of [incoming, ...s.trades]) {
              const key = tradeFingerprint(t);
              if (seen.has(key)) continue;
              seen.add(key);
              deduped.push(t);
              if (deduped.length >= MAX_TRADES) break;
            }
            return { ...s, trades: deduped };
          });
          break;

        // ── book_delta ─────────────────────────────────────────────────────────
        case "book_delta": {
          const delta = msg.data as BookDelta;
          let gapDetected = false;
          let hasChanges  = false;
          setState((s) => {
            if (!s.orderBook) {
              pendingDeltas.current.push(delta);
              return s;
            }
            if (delta.last_update_id <= s.orderBook.lastUpdateId) return s; // stale
            if (delta.first_update_id > s.orderBook.lastUpdateId + 1) {
              // Gap → reset, wait for new snapshot.
              pendingDeltas.current = [];
              gapDetected = true;
              return { ...s, orderBook: null, bookChanges: EMPTY_CHANGES };
            }
            const { book, changes } = applyDelta(s.orderBook, delta);
            hasChanges = changes.size > 0;
            return { ...s, orderBook: book, bookChanges: changes };
          });
          // Side effects outside setState — idempotent, safe in Strict Mode.
          if (gapDetected) closeSocket();
          if (hasChanges) scheduleChangeClear();
          break;
        }

        // ── kline_update ───────────────────────────────────────────────────────
        case "kline_update":
          setState((s) => ({ ...s, liveCandle: msg.data as KlineUpdate }));
          break;

        // ── stream_reconnected ─────────────────────────────────────────────────
        // Server Binance upstream reconnected — reset book and buffer new deltas
        // until a fresh book_snapshot arrives.
        case "stream_reconnected":
          pendingDeltas.current = [];
          setState((s) => ({ ...s, orderBook: null, bookChanges: EMPTY_CHANGES }));
          break;
      }
    },
    [applyDelta, closeSocket, scheduleChangeClear],
  );

  // ── connect ──────────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!symbol || wsRef.current) return;
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }

    const ws = new WebSocket(`${getWsBase()}/ws/trading?symbol=${symbol.toUpperCase()}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      reconnectAttempts.current = 0;
      resetHeartbeat();
      setState((s) => ({ ...s, connected: true, reconnecting: false, everConnected: true }));
    };

    ws.onmessage = (e) => {
      if (wsRef.current !== ws) return;
      resetHeartbeat();
      handleMessage(e.data as string);
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      clearHeartbeat();
      clearChangeReset();

      const willRetry = reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS;
      setState((s) => ({ ...s, connected: false, reconnecting: willRetry }));
      pendingDeltas.current = [];

      if (willRetry) {
        const delay = reconnectDelay(reconnectAttempts.current);
        reconnectAttempts.current += 1;
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => { reconnectTimer.current = null; connect(); }, delay);
      }
    };

    ws.onerror = () => { if (wsRef.current !== ws) return; ws.close(); };
  }, [symbol, handleMessage, resetHeartbeat, clearHeartbeat, clearChangeReset]);

  // ── reconnect (manual) ───────────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    clearHeartbeat();
    clearChangeReset();
    closeSocket(true);
    reconnectAttempts.current = 0;
    pendingDeltas.current = [];
    setState((s) => ({ ...s, connected: false, reconnecting: true }));
    connect();
  }, [closeSocket, connect, clearHeartbeat, clearChangeReset]);

  // ── effect: mount / symbol change ────────────────────────────────────────────

  useEffect(() => {
    setState({
      ticker: null, orderBook: null, bookChanges: EMPTY_CHANGES,
      trades: [], liveCandle: null,
      connected: false, reconnecting: false, everConnected: false,
    });
    pendingDeltas.current = [];
    reconnectAttempts.current = 0;
    connect();

    return () => {
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
      clearHeartbeat();
      clearChangeReset();
      closeSocket(true);
    };
  }, [closeSocket, connect, clearHeartbeat, clearChangeReset]);

  return { ...state, reconnect };
}
