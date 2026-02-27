export class CoinAiValidationError extends Error {
  readonly status: number;

  constructor(message: string) {
    super(message);
    this.status = 400;
    this.name = "CoinAiValidationError";
  }
}

export const COIN_AI_ALGORITHMS = ["auto", "linear", "ensemble"] as const;
export type CoinAiAlgorithmValue = (typeof COIN_AI_ALGORITHMS)[number];

export const COIN_AI_INTERVALS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
] as const;

const SYMBOL_REGEX = /^[A-Z0-9]{5,20}$/;
const REFRESH_DURATION_REGEX = /^(\d+)([sm])$/i;
const REFRESH_MIN_MS = 5 * 1000;
const REFRESH_MAX_MS = 10 * 60 * 1000;

export function resolveCoinAiAlgorithm(
  algorithm: unknown,
  fallback: CoinAiAlgorithmValue,
): CoinAiAlgorithmValue {
  if (algorithm === undefined || algorithm === null || algorithm === "") {
    return fallback;
  }
  if (COIN_AI_ALGORITHMS.includes(algorithm as CoinAiAlgorithmValue)) {
    return algorithm as CoinAiAlgorithmValue;
  }
  throw new CoinAiValidationError(
    "algorithm must be one of auto, linear, or ensemble",
  );
}

export function normalizeCoinAiSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (!SYMBOL_REGEX.test(normalized)) {
    throw new CoinAiValidationError(
      "symbol must match pattern ^[A-Z0-9]{5,20}$",
    );
  }
  return normalized;
}

export function normalizeCoinAiInterval(interval: string): string {
  const normalized = interval.trim();
  if (!(COIN_AI_INTERVALS as readonly string[]).includes(normalized)) {
    throw new CoinAiValidationError(
      `interval must be one of ${COIN_AI_INTERVALS.join(" ")}`,
    );
  }
  return normalized;
}

export function normalizeCoinAiRefreshDuration(refresh: string): string {
  const normalized = refresh.trim().toLowerCase();
  const match = REFRESH_DURATION_REGEX.exec(normalized);
  if (!match) {
    throw new CoinAiValidationError("refresh must be a duration in range 5s..10m");
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new CoinAiValidationError("refresh must be a duration in range 5s..10m");
  }

  const unit = match[2].toLowerCase();
  const milliseconds = unit === "m" ? amount * 60_000 : amount * 1000;
  if (milliseconds < REFRESH_MIN_MS || milliseconds > REFRESH_MAX_MS) {
    throw new CoinAiValidationError("refresh must be a duration in range 5s..10m");
  }

  return `${amount}${unit}`;
}
