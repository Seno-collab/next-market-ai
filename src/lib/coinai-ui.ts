import type {
  ReliabilityAdjustmentReason,
  SignalReliability,
} from "@/types/coinai";

export function reliabilityReasonText(
  reason?: ReliabilityAdjustmentReason,
): string {
  switch (reason) {
    case "trusted":
      return "Signal passed trust checks";
    case "hold_signal":
      return "Model already returned HOLD";
    case "score_below_threshold":
      return "Reliability score below minimum threshold";
    case "weak_signal_strength":
      return "Prediction is too close to threshold";
    case "risk_stop_triggered":
      return "Backtest hit max drawdown risk stop";
    case "no_trade_history":
      return "Backtest had no executed trades";
    default:
      return "Unknown reliability reason";
  }
}

export function reliabilityBadgeColor(
  rel: SignalReliability,
): "green" | "gold" | "red" {
  if (!rel.is_trusted) return "red";
  if (rel.level === "HIGH") return "green";
  return "gold";
}

export function formatPercent(
  v: number | string | undefined | null,
  digits = 2,
): string {
  const parsed =
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(parsed)) {
    return "N/A";
  }
  return `${(parsed * 100).toFixed(digits)}%`;
}

export function shouldRenderAdjustmentReason(
  rawSignal: string,
  finalSignal: string,
): boolean {
  return rawSignal !== finalSignal;
}
