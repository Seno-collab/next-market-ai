import type { TrainReport } from "@/types/coinai";
import { reliabilityReasonText } from "@/lib/coinai-ui";

export type CoinAIViewModel = {
  symbol: string;
  interval: string;
  signal: "BUY" | "SELL" | "HOLD";
  rawSignal: "BUY" | "SELL" | "HOLD";
  score: number;
  scoreLevel: "LOW" | "MEDIUM" | "HIGH";
  scoreReason: string;
  modelAlgorithm: "auto" | "linear" | "ensemble";
  thresholds: {
    long: number;
    short: number;
  };
  optimizationUsed: boolean;
};

export function toCoinAIViewModel(r: TrainReport): CoinAIViewModel {
  return {
    symbol: r.symbol,
    interval: r.interval,
    signal: r.signal,
    rawSignal: r.raw_signal,
    score: r.reliability.score,
    scoreLevel: r.reliability.level,
    scoreReason: reliabilityReasonText(r.reliability.adjustment_reason),
    modelAlgorithm: r.model_algorithm,
    thresholds: {
      long: r.applied_long_threshold,
      short: r.applied_short_threshold,
    },
    optimizationUsed: Boolean(r.threshold_optimization?.used),
  };
}
