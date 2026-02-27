import {
  coinAiApi as legacyCoinAiApi,
  isCoinAiRequestError,
  type TrainRealtimeHandlers,
  type TrainRealtimeOptions,
} from "@/lib/api/coinai";
import type {
  CoinAIAlgorithm,
  MultiTrainReport,
  TrainMultiRequest,
  TrainReport,
  WatchlistResult,
} from "@/types/coinai";

export { isCoinAiRequestError as isCoinAiApiError };

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

export type TrainSingleParams = {
  symbol: string;
  interval?: string;
  algorithm?: CoinAIAlgorithm;
  limit?: number;
  train_ratio?: number;
  val_ratio?: number;
  min_trust_score?: number;
  epochs?: number;
  long_threshold?: number;
  short_threshold?: number;
  slippage_bps?: number;
  latency_bars?: number;
  max_drawdown_stop?: number;
};

function mapTrainSingleParams(params: TrainSingleParams): {
  symbol: string;
  interval: string;
  options: TrainParams;
} {
  return {
    symbol: params.symbol,
    interval: params.interval ?? "1h",
    options: {
      algorithm: params.algorithm,
      limit: params.limit,
      trainRatio: params.train_ratio,
      valRatio: params.val_ratio,
      minTrustScore: params.min_trust_score,
      epochs: params.epochs,
      longThreshold: params.long_threshold,
      shortThreshold: params.short_threshold,
      slippageBps: params.slippage_bps,
      latencyBars: params.latency_bars,
      maxDrawdownStop: params.max_drawdown_stop,
    },
  };
}

export async function trainSingle(
  params: TrainSingleParams,
): Promise<TrainReport> {
  const mapped = mapTrainSingleParams(params);
  return legacyCoinAiApi.train(mapped.symbol, mapped.interval, mapped.options);
}

export const coinAiApi = {
  train(
    symbol: string,
    interval = "1h",
    options?: TrainParams,
  ): Promise<TrainReport> {
    return legacyCoinAiApi.train(symbol, interval, options);
  },
  trainSingle,
  trainMulti(req: TrainMultiRequest): Promise<MultiTrainReport> {
    return legacyCoinAiApi.trainMulti(req);
  },
  subscribeTrainRealtime(
    symbol: string,
    options: TrainRealtimeOptions = {},
    handlers: TrainRealtimeHandlers = {},
  ): () => void {
    return legacyCoinAiApi.subscribeTrainRealtime(symbol, options, handlers);
  },
  getWatchlist(): Promise<WatchlistResult> {
    return legacyCoinAiApi.getWatchlist();
  },
  addToWatchlist(req: { symbol: string }): Promise<void> {
    return legacyCoinAiApi.addToWatchlist(req);
  },
  removeFromWatchlist(symbol: string): Promise<void> {
    return legacyCoinAiApi.removeFromWatchlist(symbol);
  },
};
