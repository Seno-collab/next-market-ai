export type ApiResponse<T> = {
  message: string;
  data?: T;
};

export type ApiError = {
  message: string;
};

export type Ticker = {
  symbol: string;
  last_price: string;
  price_change: string;
  price_change_percent: string;
  volume: string;
  quote_volume: string;
  high_price: string;
  low_price: string;
  open_price: string;
};

export type Candle = {
  open_time: number; // ms timestamp
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  close_time: number; // ms timestamp
};

export type PriceLevel = {
  price: string;
  quantity: string;
};

export type OrderBook = {
  last_update_id: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
};

export type Trade = {
  id: number;
  price: string;
  qty: string;
  time: number; // ms timestamp
  is_buyer_maker: boolean;
};

// ── Transaction types ──────────────────────────────────────────────────────

/** A saved user transaction returned by the backend. Numeric fields are strings. */
export type Transaction = {
  id: string;           // UUID
  symbol: string;       // e.g. "BTCUSDT"
  side: "BUY" | "SELL";
  quantity: string;     // decimal string
  price: string;        // decimal string
  total: string;        // quantity * price, decimal string
  fee: string;          // decimal string
  note: string;
  created_at: string;   // RFC3339 UTC
};

export type CreateTransactionRequest = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fee?: number;
  note?: string;
};

export type ListTransactionsResponse = {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
};

// ── Analysis types ──────────────────────────────────────────────────────────

export type Signal   = "BUY" | "SELL" | "HOLD";
export type Strength = "STRONG" | "MODERATE" | "WEAK";

export type RSIResult = {
  value: number;
  signal: "OVERSOLD" | "NEUTRAL" | "OVERBOUGHT";
};

export type MACDResult = {
  macd: number;
  signal: number;
  histogram: number;
  trend: "BULLISH" | "BEARISH";
};

export type EMAResult = {
  ema_20: number;
  ema_50: number;
  trend: "BULLISH" | "BEARISH";
};

export type BollingerResult = {
  upper: number;
  middle: number;
  lower: number;
  signal: "OVERBOUGHT" | "NEUTRAL" | "OVERSOLD";
};

export type VolumeResult = {
  current: number;
  average: number;
  trend: "HIGH" | "NORMAL" | "LOW";
};

export type IndicatorsResult = {
  rsi: RSIResult;
  macd: MACDResult;
  ema: EMAResult;
  bollinger: BollingerResult;
  volume: VolumeResult;
};

export type AnalysisResult = {
  symbol: string;
  interval: string;
  signal: Signal;
  strength: Strength;
  score: number;           // -100 to 100
  indicators: IndicatorsResult;
  best_hours: number[];    // top UTC hours by volume, e.g. [14, 10, 2]
  support: number[];
  resistance: number[];
  summary: string;
};

export type DailyReport = {
  symbol: string;
  date: string;            // YYYY-MM-DD
  interval: string;
  ticker: Ticker;
  analysis: AnalysisResult;
  candles: Candle[];
  generated_at: string;    // RFC3339 UTC
};

// ── CoinAI types ────────────────────────────────────────────────────────────

export type CoinAISignal = "BUY" | "SELL" | "HOLD";

export type BacktestResult = {
  total_trades: number;
  win_rate: number;       // 0-100 percentage
  profit_factor: number;
  max_drawdown: number;   // percentage
  total_return: number;   // percentage
};

export type TrainReport = {
  symbol: string;
  interval: string;
  signal: CoinAISignal;
  predicted_return: number; // percentage
  confidence: number;       // 0-100
  model_name: string;
  trained_at: string;       // RFC3339 UTC
  backtest: BacktestResult;
};

export type WatchlistItem = {
  symbol: string;
  interval: string;
  added_at: string;         // RFC3339 UTC
  last_signal?: CoinAISignal;
  last_trained_at?: string; // RFC3339 UTC
};

export type AddWatchlistRequest = {
  symbol: string;
  interval?: string;        // default "1h"
};
