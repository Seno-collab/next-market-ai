import type {
  AddWatchlistRequest,
  CoinAIAlgorithm,
  ApiResponse,
  MultiTrainReport,
  TrainMultiRequest,
  TrainReport,
  WatchlistResult,
} from "@/types/trading";

export type {
  AddWatchlistRequest,
  CoinAIAlgorithm,
  MultiTrainReport,
  TrainMultiRequest,
  TrainReport,
  WatchlistResult,
};

type TrainParams = {
  algorithm?: CoinAIAlgorithm;
  limit?: number;
  trainRatio?: number;
  valRatio?: number;
  minTrustScore?: number;
  epochs?: number;
  longThreshold?: number;
  shortThreshold?: number;
  slippageBps?: number;
  latencyBars?: number;
  maxDrawdownStop?: number;
};

export type TrainRealtimeOptions = TrainParams & {
  interval?: string;
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

type ApiMessageBody<T> = ApiResponse<T> & { message?: string };
const COIN_AI_ALGORITHMS = ["auto", "linear", "ensemble"] as const;

function normalizeAlgorithm(
  algorithm: unknown,
  fallback: CoinAIAlgorithm,
): CoinAIAlgorithm {
  return COIN_AI_ALGORITHMS.includes(algorithm as CoinAIAlgorithm)
    ? (algorithm as CoinAIAlgorithm)
    : fallback;
}

export class CoinAiRequestError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.name = "CoinAiRequestError";
  }
}

export function isCoinAiRequestError(
  error: unknown,
): error is CoinAiRequestError {
  return error instanceof CoinAiRequestError;
}

async function readApiBody<T>(res: Response): Promise<ApiMessageBody<T>> {
  try {
    return (await res.json()) as ApiMessageBody<T>;
  } catch {
    return { message: "" } as ApiMessageBody<T>;
  }
}

// ── Generic fetch ─────────────────────────────────────────────────────────────

async function fetchCoinAI<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiMessageBody<T>> {
  const res = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    ...init,
  });
  const body = await readApiBody<T>(res);

  if (!res.ok) {
    let retryAfterMs: number | undefined;
    const retryAfter = res.headers.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) {
        retryAfterMs = Math.ceil(seconds * 1000);
      } else {
        const asDate = Date.parse(retryAfter);
        if (Number.isFinite(asDate)) {
          const delta = asDate - Date.now();
          if (delta > 0) retryAfterMs = delta;
        }
      }
    }
    throw new CoinAiRequestError(
      res.status,
      body.message || `HTTP ${res.status}`,
      retryAfterMs,
    );
  }
  return body;
}

async function fetchCoinAIData<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await fetchCoinAI<T>(path, init);
  if (!("data" in body) || body.data === undefined) {
    throw new CoinAiRequestError(500, "Missing data in response");
  }
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
    options?: TrainParams,
  ): Promise<TrainReport> {
    const algorithm = normalizeAlgorithm(options?.algorithm, "auto");
    return fetchCoinAIData<TrainReport>("/api/coinai/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: symbol.toUpperCase(),
        interval,
        algorithm,
        limit: options?.limit,
        train_ratio: options?.trainRatio,
        val_ratio: options?.valRatio,
        min_trust_score: options?.minTrustScore,
        epochs: options?.epochs,
        long_threshold: options?.longThreshold,
        short_threshold: options?.shortThreshold,
        slippage_bps: options?.slippageBps,
        latency_bars: options?.latencyBars,
        max_drawdown_stop: options?.maxDrawdownStop,
      }),
    });
  },

  /** POST /api/coinai/train/multi */
  trainMulti(req: TrainMultiRequest): Promise<MultiTrainReport> {
    const algorithm = normalizeAlgorithm(req.algorithm, "auto");
    return fetchCoinAIData<MultiTrainReport>("/api/coinai/train/multi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...req,
        algorithm,
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
    params.set("algorithm", normalizeAlgorithm(options.algorithm, "linear"));
    if (options.interval) params.set("interval", options.interval);
    if (options.refresh) params.set("refresh", options.refresh);
    if (typeof options.limit === "number") {
      params.set("limit", String(options.limit));
    }
    if (typeof options.trainRatio === "number") {
      params.set("train_ratio", String(options.trainRatio));
    }
    if (typeof options.valRatio === "number") {
      params.set("val_ratio", String(options.valRatio));
    }
    if (typeof options.minTrustScore === "number") {
      params.set("min_trust_score", String(options.minTrustScore));
    }
    if (typeof options.epochs === "number") {
      params.set("epochs", String(options.epochs));
    }
    if (typeof options.longThreshold === "number") {
      params.set("long_threshold", String(options.longThreshold));
    }
    if (typeof options.shortThreshold === "number") {
      params.set("short_threshold", String(options.shortThreshold));
    }
    if (typeof options.slippageBps === "number") {
      params.set("slippage_bps", String(options.slippageBps));
    }
    if (typeof options.latencyBars === "number") {
      params.set("latency_bars", String(options.latencyBars));
    }
    if (typeof options.maxDrawdownStop === "number") {
      params.set("max_drawdown_stop", String(options.maxDrawdownStop));
    }
    const maxUpdates = options.maxUpdates ?? 180;
    if (
      !Number.isFinite(maxUpdates) ||
      !Number.isInteger(maxUpdates) ||
      maxUpdates < 1 ||
      maxUpdates > 1000
    ) {
      throw new CoinAiRequestError(
        400,
        "max_updates must be an integer in range 1..1000",
      );
    }
    params.set("max_updates", String(maxUpdates));

    const stream = new EventSource(`/api/coinai/train/realtime?${params.toString()}`, {
      withCredentials: true,
    });

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
    const body = await fetchCoinAI<WatchlistResult>("/api/coinai/watchlist");
    return body.data ?? { symbols: [], count: 0 };
  },

  /**
   * POST /api/coinai/watchlist  body: { symbol }
   * Backend returns { message: "OK" } with no data body.
   */
  async addToWatchlist(req: AddWatchlistRequest): Promise<void> {
    await fetchCoinAI<null>("/api/coinai/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: req.symbol.toUpperCase() }),
    });
  },

  /** DELETE /api/coinai/watchlist/:symbol */
  async removeFromWatchlist(symbol: string): Promise<void> {
    await fetchCoinAI<null>(`/api/coinai/watchlist/${symbol.toUpperCase()}`, {
      method: "DELETE",
    });
  },
};
