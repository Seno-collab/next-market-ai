"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPortfolio, ApiError } from "@/lib/portfolio-api";
import type { LivePortfolio, LivePositionRow, PositionRow } from "@/types/portfolio";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8080";
const RECONNECT_DELAY_MS = 3_000;
const THROTTLE_MS = 200; // tối đa 5 re-render/giây

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toLiveRow(p: PositionRow): LivePositionRow {
  return {
    ...p,
    live_price: p.current_price,
    live_value: p.current_value,
    live_unrealized_pnl: p.unrealized_pnl,
    live_unrealized_pnl_pct: p.unrealized_pnl_pct,
    live_change_24h_pct: p.price_change_24h_pct,
  };
}

function recalcTotals(positions: LivePositionRow[]) {
  let totalValue = 0;
  let totalPnl = 0;
  for (const p of positions) {
    if (p.net_qty > 0) {
      totalValue += p.live_value;
      totalPnl += p.live_unrealized_pnl;
    }
  }
  return {
    total_live_value: totalValue,
    total_live_unrealized_pnl: totalPnl,
  };
}

// Throttle: gom các update trong THROTTLE_MS thành 1 re-render
function useThrottledPortfolio() {
  const [portfolio, setPortfolio] = useState<LivePortfolio | null>(null);
  const pending = useRef<LivePortfolio | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttledSet = useCallback((next: LivePortfolio) => {
    pending.current = next;
    if (!timer.current) {
      timer.current = setTimeout(() => {
        if (pending.current) setPortfolio(pending.current);
        timer.current = null;
        pending.current = null;
      }, THROTTLE_MS);
    }
  }, []);

  return { portfolio, setPortfolio, throttledSet };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePortfolioStream(token: string | null) {
  const { portfolio, setPortfolio, throttledSet } = useThrottledPortfolio();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map: symbol → { ws, reconnectTimer }
  const wsMap = useRef<Map<string, { ws: WebSocket; timer: ReturnType<typeof setTimeout> | null }>>(
    new Map(),
  );

  // ── close all WS ────────────────────────────────────────────────────────

  const closeAll = useCallback(() => {
    wsMap.current.forEach(({ ws, timer }) => {
      if (timer) clearTimeout(timer);
      ws.close();
    });
    wsMap.current.clear();
  }, []);

  // ── subscribe one symbol (with reconnect) ───────────────────────────────

  const subscribe = useCallback(
    (symbol: string) => {
      if (wsMap.current.has(symbol)) return;

      const connect = () => {
        const ws = new WebSocket(`${WS_BASE}/ws/trading?symbol=${symbol}`);
        const entry = { ws, timer: null as ReturnType<typeof setTimeout> | null };
        wsMap.current.set(symbol, entry);

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data as string) as {
              type: string;
              data: { last_price: string; price_change_percent: string };
            };
            if (msg.type !== "ticker_update" && msg.type !== "ticker_snapshot") return;

            const livePrice = Number(msg.data.last_price);
            const liveChangePct = Number(msg.data.price_change_percent);
            if (!livePrice) return;

            setPortfolio((prev) => {
              if (!prev) return prev;

              let changed = false;
              const positions = prev.positions.map((p) => {
                if (p.symbol !== symbol || p.net_qty <= 0) return p;
                const liveValue = p.net_qty * livePrice;
                const livePnl = liveValue - p.total_invested;
                const livePnlPct =
                  p.total_invested !== 0 ? (livePnl / p.total_invested) * 100 : 0;
                changed = true;
                return {
                  ...p,
                  live_price: livePrice,
                  live_value: liveValue,
                  live_unrealized_pnl: livePnl,
                  live_unrealized_pnl_pct: livePnlPct,
                  live_change_24h_pct: liveChangePct,
                };
              });

              if (!changed) return prev;
              const next = { ...prev, positions, ...recalcTotals(positions) };
              throttledSet(next);
              return next;
            });
          } catch {
            // ignore parse errors
          }
        };

        ws.onclose = () => {
          // Auto-reconnect sau RECONNECT_DELAY_MS
          if (wsMap.current.has(symbol)) {
            const t = setTimeout(() => {
              wsMap.current.delete(symbol);
              connect();
            }, RECONNECT_DELAY_MS);
            const cur = wsMap.current.get(symbol);
            if (cur) cur.timer = t;
          }
        };

        ws.onerror = () => ws.close();
      };

      connect();
    },
    [setPortfolio, throttledSet],
  );

  // ── initial load ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setPortfolio(null);
      closeAll();
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPortfolio(token);

      const positions = data.positions.map(toLiveRow);
      const totals = recalcTotals(positions);

      const live: LivePortfolio = {
        ...data,
        positions,
        ...totals,
      };

      setPortfolio(live);
      setError(null);

      // Re-subscribe: đóng các kết nối cũ, mở lại cho positions mới
      closeAll();
      for (const p of data.positions) {
        if (p.net_qty > 0) subscribe(p.symbol);
      }
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError("Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, [token, setPortfolio, closeAll, subscribe]);

  useEffect(() => {
    void load();
    return closeAll;
  }, [load, closeAll]);

  // ── derived helpers (stable references) ─────────────────────────────────

  const openPositions = useMemo(
    () => portfolio?.positions.filter((p) => p.net_qty > 0) ?? [],
    [portfolio],
  );

  const closedPositions = useMemo(
    () => portfolio?.positions.filter((p) => p.net_qty === 0) ?? [],
    [portfolio],
  );

  const totalPnl = useMemo(
    () =>
      portfolio
        ? portfolio.total_live_unrealized_pnl + portfolio.total_realized_pnl
        : 0,
    [portfolio],
  );

  const roiPct = useMemo(
    () =>
      portfolio && portfolio.total_invested > 0
        ? (portfolio.total_live_unrealized_pnl / portfolio.total_invested) * 100
        : 0,
    [portfolio],
  );

  return {
    portfolio,
    openPositions,
    closedPositions,
    totalPnl,
    roiPct,
    loading,
    error,
    refetch: load,
  };
}
