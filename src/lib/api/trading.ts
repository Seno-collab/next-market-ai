import type {
  ApiResponse,
  ApiError,
  Ticker,
  Candle,
  OrderBook,
  Trade,
} from "@/types/trading";

// Resolves to "" when running same-domain (Nginx proxy) or the env var for standalone dev.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function fetchTrading<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const body = (await res.json()) as ApiResponse<T> | ApiError;

  if (!res.ok) {
    throw new Error((body as ApiError).message || `HTTP ${res.status}`);
  }

  if (!("data" in body) || body.data === undefined) {
    throw new Error("Missing data in API response");
  }

  return body.data;
}

export const tradingApi = {
  /**
   * GET /api/trading/ticker/:symbol
   * Poll every 3–5 s.
   */
  getTicker: (symbol: string, signal?: AbortSignal) =>
    fetchTrading<Ticker>(`/api/trading/ticker/${symbol.toUpperCase()}`, signal),

  /**
   * GET /api/trading/ohlcv/:symbol?interval=1h&limit=100
   * interval: "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" …
   * limit: 1–1000 (backend default 100)
   * Poll: ~5–10 s for 1m, 30–60 s for ≥15m.
   */
  getOHLCV: (
    symbol: string,
    interval = "1h",
    limit = 100,
    signal?: AbortSignal,
  ) =>
    fetchTrading<Candle[]>(
      `/api/trading/ohlcv/${symbol.toUpperCase()}?interval=${interval}&limit=${limit}`,
      signal,
    ),

  /**
   * GET /api/trading/orderbook/:symbol?limit=20
   * limit: 1–5000 (backend default 20)
   * Poll every 1–2 s.
   */
  getOrderBook: (symbol: string, limit = 20, signal?: AbortSignal) =>
    fetchTrading<OrderBook>(
      `/api/trading/orderbook/${symbol.toUpperCase()}?limit=${limit}`,
      signal,
    ),

  /**
   * GET /api/trading/trades/:symbol?limit=50
   * limit: 1–1000 (backend default 50)
   * Poll every 1–2 s.
   */
  getTrades: (symbol: string, limit = 50, signal?: AbortSignal) =>
    fetchTrading<Trade[]>(
      `/api/trading/trades/${symbol.toUpperCase()}?limit=${limit}`,
      signal,
    ),
};

/* ── Render helpers ───────────────────────────────────────────────────────── */

/**
 * Convert a Candle to the format expected by lightweight-charts / recharts.
 * time is seconds (unix), open/high/low/close are numbers.
 */
export function candleToChart(c: Candle) {
  return {
    time: Math.floor(c.open_time / 1000),
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: Number(c.volume),
  };
}

/**
 * Derive trade side from is_buyer_maker.
 * is_buyer_maker === true  → seller is aggressor → "SELL"
 * is_buyer_maker === false → buyer  is aggressor → "BUY"
 */
export function tradeSide(isBuyerMaker: boolean): "BUY" | "SELL" {
  return isBuyerMaker ? "SELL" : "BUY";
}
