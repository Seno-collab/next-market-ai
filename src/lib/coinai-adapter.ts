import type { CoinAIModelAlgorithm, TrainReport } from "@/types/coinai";
import { reliabilityReasonText } from "@/lib/coinai-ui";

export type CoinAIViewModel = {
  symbol: string;
  interval: string;
  signal: "BUY" | "SELL" | "HOLD";
  rawSignal: "BUY" | "SELL" | "HOLD";
  adjusted: boolean;
  score: number;
  scoreLevel: "LOW" | "MEDIUM" | "HIGH";
  scoreReason: string;
  minTrustedScore: number;
  nextPredictedReturn: number;
  modelAlgorithm: CoinAIModelAlgorithm;
  thresholds: {
    long: number;
    short: number;
  };
  optimizationUsed: boolean;
  orderBookAnomalous: boolean;
  riskStopped: boolean;
};

export function toCoinAIViewModel(r: TrainReport): CoinAIViewModel {
  return {
    symbol: r.symbol,
    interval: r.interval,
    signal: r.signal,
    rawSignal: r.raw_signal,
    adjusted: r.raw_signal !== r.signal,
    score: r.reliability.score,
    scoreLevel: r.reliability.level,
    scoreReason: reliabilityReasonText(r.reliability.adjustment_reason),
    minTrustedScore: r.reliability.min_trusted_score,
    nextPredictedReturn: r.next_predicted_return,
    modelAlgorithm: r.model_algorithm,
    thresholds: {
      long: r.applied_long_threshold,
      short: r.applied_short_threshold,
    },
    optimizationUsed: Boolean(r.threshold_optimization?.used),
    orderBookAnomalous: Boolean(r.orderbook_anomaly?.is_anomalous),
    riskStopped: r.backtest.stopped_by_risk,
  };
}
