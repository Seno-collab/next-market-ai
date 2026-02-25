import type {
  AddWatchlistRequest,
  ApiResponse,
  MultiTrainReport,
  TrainMultiRequest,
  TrainReport,
  WatchlistResult,
} from "@/types/trading";

export type {
  AddWatchlistRequest,
  MultiTrainReport,
  TrainMultiRequest,
  TrainReport,
  WatchlistResult,
};

export type TrainRealtimeOptions = {
  interval?: string;
  limit?: number;
  trainRatio?: number;
  epochs?: number;
  refresh?: string;
  maxUpdates?: number;
};

export type TrainRealtimeHandlers = {
  onOpen?: () => void;
  onStatus?: (status: string) => void;
  onReport?: (report: TrainReport) => void;
  onError?: (message: string) => void;
  onNetworkError?: () => void;
};

// ── Generic fetch ─────────────────────────────────────────────────────────────

async function fetchCoinAI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  if (!("data" in body) || body.data === undefined)
    throw new Error("Missing data in response");
  return body.data;
}

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
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
        symbol: symbol.toUpperCase(),
        interval,
        limit: options?.limit,
        train_ratio: options?.trainRatio,
        epochs: options?.epochs,
      }),
    });
  },

  /** POST /api/coinai/train/multi */
  trainMulti(req: TrainMultiRequest): Promise<MultiTrainReport> {
    return fetchCoinAI<MultiTrainReport>("/api/coinai/train/multi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...req,
        symbols: req.symbols.map((s) => s.toUpperCase()),
      }),
    });
  },

  /** GET /api/coinai/train/realtime (SSE) */
  subscribeTrainRealtime(
    symbol: string,
    options: TrainRealtimeOptions = {},
    handlers: TrainRealtimeHandlers = {},
  ): () => void {
    if (typeof window === "undefined") {
      throw new Error("Realtime stream is only available in browser");
    }

    const params = new URLSearchParams();
    params.set("symbol", symbol.trim().toUpperCase());
    if (options.interval) params.set("interval", options.interval);
    if (options.refresh) params.set("refresh", options.refresh);
    if (typeof options.limit === "number") {
      params.set("limit", String(options.limit));
    }
    if (typeof options.trainRatio === "number") {
      params.set("train_ratio", String(options.trainRatio));
    }
    if (typeof options.epochs === "number") {
      params.set("epochs", String(options.epochs));
    }
    if (
      typeof options.maxUpdates === "number" &&
      Number.isFinite(options.maxUpdates) &&
      Number.isInteger(options.maxUpdates) &&
      options.maxUpdates > 0
    ) {
      params.set("max_updates", String(options.maxUpdates));
    }

    const stream = new EventSource(
      `/api/coinai/train/realtime?${params.toString()}`,
    );

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      stream.close();
    };

    stream.onopen = () => {
      handlers.onOpen?.();
    };

    stream.addEventListener("status", (event) => {
      const payload = parseJson<{ status?: string; message?: string }>(
        (event as MessageEvent<string>).data,
      );
      const status =
        payload?.status ??
        payload?.message ??
        (event as MessageEvent<string>).data ??
        "status";
      handlers.onStatus?.(status);
      if (status === "stream_done") {
        close();
      }
    });

    stream.addEventListener("report", (event) => {
      const payload = parseJson<ApiResponse<TrainReport>>(
        (event as MessageEvent<string>).data,
      );
      if (!payload?.data) {
        handlers.onError?.("Invalid realtime report payload");
        return;
      }
      handlers.onReport?.(payload.data);
    });

    stream.addEventListener("error", (event) => {
      const data = (event as MessageEvent<string>).data;
      if (typeof data === "string" && data.length > 0) {
        const payload = parseJson<{ message?: string }>(data);
        handlers.onError?.(payload?.message || data);
        return;
      }
      handlers.onNetworkError?.();
    });

    return close;
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
