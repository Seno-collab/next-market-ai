import type {
  TrainReport,
  WatchlistResult,
  AddWatchlistRequest,
  ApiResponse,
} from "@/types/trading";

export type { TrainReport, WatchlistResult, AddWatchlistRequest };

// ── Generic fetch ─────────────────────────────────────────────────────────────

async function fetchCoinAI<T>(path: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(path, { cache: "no-store", ...init });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  if (!("data" in body) || body.data === undefined) throw new Error("Missing data in response");
  return body.data;
}

// ── API client ────────────────────────────────────────────────────────────────

export const coinAiApi = {
  /**
   * POST /api/coinai/train?symbol=BTCUSDT&interval=1h&limit=500
   * Backend expects query params — Next.js proxy converts JSON body → query.
   */
  train(
    symbol: string,
    interval = "1h",
    options?: { limit?: number; trainRatio?: number; epochs?: number },
  ): Promise<TrainReport> {
    return fetchCoinAI<TrainReport>("/api/coinai/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol:      symbol.toUpperCase(),
        interval,
        limit:       options?.limit,
        train_ratio: options?.trainRatio,
        epochs:      options?.epochs,
      }),
    });
  },

  /**
   * GET /api/coinai/watchlist
   * Backend returns { symbols: string[], count: number }.
   */
  async getWatchlist(): Promise<WatchlistResult> {
    return fetchCoinAI<WatchlistResult>("/api/coinai/watchlist");
  },

  /**
   * POST /api/coinai/watchlist  body: { symbol }
   * Backend returns { message: "OK" } with no data body.
   */
  async addToWatchlist(req: AddWatchlistRequest): Promise<void> {
    const res = await fetch("/api/coinai/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: req.symbol.toUpperCase() }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json()) as { message?: string };
      throw new Error(body.message || `HTTP ${res.status}`);
    }
  },

  /** DELETE /api/coinai/watchlist/:symbol */
  async removeFromWatchlist(symbol: string): Promise<void> {
    const res = await fetch(`/api/coinai/watchlist/${symbol.toUpperCase()}`, {
      method: "DELETE",
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json()) as { message?: string };
      throw new Error(body.message || `HTTP ${res.status}`);
    }
  },
};
