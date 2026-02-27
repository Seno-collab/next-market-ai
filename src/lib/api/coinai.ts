import type {
  AddWatchlistRequest,
  CoinAIAlgorithm,
  ApiResponse,
  MultiTrainReport,
  TrainMultiRequest,
  TrainReport,
  WatchlistResult,
} from "@/types/trading";
import {
  CoinAiValidationError,
  normalizeCoinAiInterval,
  normalizeCoinAiRefreshDuration,
  normalizeCoinAiSymbol,
  resolveCoinAiAlgorithm,
} from "./coinai.validation";

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
  onError?: (message: string, status?: number) => void;
  onNetworkError?: () => void;
};

type ApiMessageBody<T> = ApiResponse<T> & { message?: string };
const DEFAULT_TRAIN_RATIO = 0.7;
const DEFAULT_LONG_THRESHOLD = 0.0015;
const DEFAULT_SHORT_THRESHOLD = -0.0015;
const MAX_UPDATES_DEFAULT = 180;

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

function withValidation<T>(callback: () => T): T {
  try {
    return callback();
  } catch (error) {
    if (error instanceof CoinAiValidationError) {
      throw new CoinAiRequestError(400, error.message);
    }
    throw error;
  }
}

function resolveAlgorithm(
  algorithm: unknown,
  fallback: CoinAIAlgorithm,
): CoinAIAlgorithm {
  return withValidation(() => resolveCoinAiAlgorithm(algorithm, fallback));
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

function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeSymbol(symbol: string): string {
  return withValidation(() => normalizeCoinAiSymbol(symbol));
}

function normalizeInterval(interval: string): string {
  return withValidation(() => normalizeCoinAiInterval(interval));
}

function assertIntegerRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new CoinAiRequestError(
      400,
      `${fieldName} must be an integer in range ${min}..${max}`,
    );
  }
}

function assertRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
  bounds: "inclusive" | "exclusiveMin" = "inclusive",
) {
  const isValid =
    bounds === "exclusiveMin"
      ? value > min && value <= max
      : value >= min && value <= max;
  if (!isValid) {
    const text =
      bounds === "exclusiveMin"
        ? `${fieldName} must be in range (${min},${max}]`
        : `${fieldName} must be in range ${min}..${max}`;
    throw new CoinAiRequestError(400, text);
  }
}

function validateTrainAndValRatio(
  trainRatio: number | undefined,
  valRatio: number | undefined,
  options: { allowTrainRatioZero?: boolean } = {},
) {
  const allowTrainRatioZero = options.allowTrainRatioZero ?? false;
  if (trainRatio !== undefined && !hasNumber(trainRatio)) {
    throw new CoinAiRequestError(400, "train_ratio must be a number");
  }
  if (valRatio !== undefined && !hasNumber(valRatio)) {
    throw new CoinAiRequestError(400, "val_ratio must be a number");
  }
  if (hasNumber(trainRatio)) {
    if (allowTrainRatioZero && trainRatio === 0) {
      // 0 means backend default (0.7) for train/multi.
    } else if (trainRatio <= 0 || trainRatio >= 1) {
      throw new CoinAiRequestError(400, "train_ratio must be in range (0,1)");
    }
  }

  if (hasNumber(valRatio) && (valRatio < 0 || valRatio >= 1)) {
    throw new CoinAiRequestError(400, "val_ratio must be in range [0,1)");
  }

  if (hasNumber(valRatio)) {
    const effectiveTrainRatio = hasNumber(trainRatio)
      ? allowTrainRatioZero && trainRatio === 0
        ? DEFAULT_TRAIN_RATIO
        : trainRatio
      : DEFAULT_TRAIN_RATIO;
    if (effectiveTrainRatio + valRatio >= 1) {
      throw new CoinAiRequestError(
        400,
        "train_ratio + val_ratio must be < 1",
      );
    }
  }
}

function validateThresholds(longThreshold?: number, shortThreshold?: number) {
  if (longThreshold !== undefined && !hasNumber(longThreshold)) {
    throw new CoinAiRequestError(400, "long_threshold must be a number");
  }
  if (shortThreshold !== undefined && !hasNumber(shortThreshold)) {
    throw new CoinAiRequestError(400, "short_threshold must be a number");
  }
  const longValue = longThreshold ?? DEFAULT_LONG_THRESHOLD;
  const shortValue = shortThreshold ?? DEFAULT_SHORT_THRESHOLD;
  if (!(longValue > shortValue)) {
    throw new CoinAiRequestError(
      400,
      "long_threshold must be greater than short_threshold",
    );
  }
}

function validateRefreshDuration(refresh: string): string {
  return withValidation(() => normalizeCoinAiRefreshDuration(refresh));
}

function validateTrainParams(
  options: TrainParams | undefined,
  cfg: { allowLimitZero?: boolean; allowTrainRatioZero?: boolean; allowEpochZero?: boolean } = {},
) {
  const allowLimitZero = cfg.allowLimitZero ?? false;
  const allowTrainRatioZero = cfg.allowTrainRatioZero ?? false;
  const allowEpochZero = cfg.allowEpochZero ?? false;

  if (options?.limit !== undefined && !hasNumber(options.limit)) {
    throw new CoinAiRequestError(400, "limit must be a number");
  }
  if (hasNumber(options?.limit)) {
    if (allowLimitZero && options.limit === 0) {
      // 0 means backend default.
    } else {
      assertIntegerRange(options.limit, 50, 1000, "limit");
    }
  }

  validateTrainAndValRatio(options?.trainRatio, options?.valRatio, {
    allowTrainRatioZero,
  });

  if (options?.minTrustScore !== undefined && !hasNumber(options.minTrustScore)) {
    throw new CoinAiRequestError(400, "min_trust_score must be a number");
  }
  if (hasNumber(options?.minTrustScore)) {
    assertRange(options.minTrustScore, 0, 1, "min_trust_score");
  }

  if (options?.epochs !== undefined && !hasNumber(options.epochs)) {
    throw new CoinAiRequestError(400, "epochs must be a number");
  }
  if (hasNumber(options?.epochs)) {
    if (allowEpochZero && options.epochs === 0) {
      // 0 means backend default.
    } else {
      assertIntegerRange(options.epochs, 1, 3000, "epochs");
    }
  }

  validateThresholds(options?.longThreshold, options?.shortThreshold);

  if (options?.slippageBps !== undefined && !hasNumber(options.slippageBps)) {
    throw new CoinAiRequestError(400, "slippage_bps must be a number");
  }
  if (hasNumber(options?.slippageBps)) {
    assertRange(options.slippageBps, 0, 1000, "slippage_bps");
  }
  if (options?.latencyBars !== undefined && !hasNumber(options.latencyBars)) {
    throw new CoinAiRequestError(400, "latency_bars must be a number");
  }
  if (hasNumber(options?.latencyBars)) {
    assertIntegerRange(options.latencyBars, 0, 50, "latency_bars");
  }
  if (
    options?.maxDrawdownStop !== undefined &&
    !hasNumber(options.maxDrawdownStop)
  ) {
    throw new CoinAiRequestError(400, "max_drawdown_stop must be a number");
  }
  if (hasNumber(options?.maxDrawdownStop)) {
    assertRange(options.maxDrawdownStop, 0, 1, "max_drawdown_stop");
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
    const normalizedSymbol = normalizeSymbol(symbol);
    const normalizedInterval = normalizeInterval(interval);
    const algorithm = resolveAlgorithm(options?.algorithm, "auto");
    validateTrainParams(options);
    return fetchCoinAIData<TrainReport>("/api/coinai/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: normalizedSymbol,
        interval: normalizedInterval,
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
    const symbols = Array.isArray(req.symbols)
      ? req.symbols.map((symbol) => normalizeSymbol(symbol))
      : [];
    if (symbols.length < 2 || symbols.length > 20) {
      throw new CoinAiRequestError(400, "symbols must contain 2..20 entries");
    }
    if (new Set(symbols).size !== symbols.length) {
      throw new CoinAiRequestError(
        400,
        "symbols must contain unique uppercase values",
      );
    }
    const algorithm = resolveAlgorithm(req.algorithm, "auto");
    const interval = req.interval ? normalizeInterval(req.interval) : undefined;
    validateTrainParams(
      {
        limit: req.limit,
        trainRatio: req.train_ratio,
        valRatio: req.val_ratio,
        minTrustScore: req.min_trust_score,
        epochs: req.epochs,
        longThreshold: req.long_threshold,
        shortThreshold: req.short_threshold,
        slippageBps: req.slippage_bps,
        latencyBars: req.latency_bars,
        maxDrawdownStop: req.max_drawdown_stop,
      },
      {
        allowLimitZero: true,
        allowTrainRatioZero: true,
        allowEpochZero: true,
      },
    );
    return fetchCoinAIData<MultiTrainReport>("/api/coinai/train/multi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...req,
        algorithm,
        interval,
        symbols,
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

    const normalizedSymbol = normalizeSymbol(symbol);
    const algorithm = resolveAlgorithm(options.algorithm, "linear");
    const interval = options.interval ? normalizeInterval(options.interval) : undefined;
    validateTrainParams(options);

    const params = new URLSearchParams();
    params.set("symbol", normalizedSymbol);
    params.set("algorithm", algorithm);
    if (interval) params.set("interval", interval);
    if (options.refresh) params.set("refresh", validateRefreshDuration(options.refresh));
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
    const maxUpdates = options.maxUpdates ?? MAX_UPDATES_DEFAULT;
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
        const payload = parseJson<{ message?: string; status?: number }>(data);
        const status =
          typeof payload?.status === "number" && Number.isFinite(payload.status)
            ? payload.status
            : undefined;
        handlers.onError?.(
          payload?.message || (status ? `HTTP ${status}` : data),
          status,
        );
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
    const symbol = normalizeSymbol(req.symbol);
    await fetchCoinAI<null>("/api/coinai/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
  },

  /** DELETE /api/coinai/watchlist/:symbol */
  async removeFromWatchlist(symbol: string): Promise<void> {
    const normalized = normalizeSymbol(symbol);
    await fetchCoinAI<null>(
      `/api/coinai/watchlist/${encodeURIComponent(normalized)}`,
      {
        method: "DELETE",
      },
    );
  },
};
