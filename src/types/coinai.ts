export type ApiResponse<T> = {
  message: string;
  data?: T;
};

export type ApiError = {
  message: string;
};

export type CoinAISignal = "BUY" | "SELL" | "HOLD";
export type CoinAIAlgorithm = "auto" | "linear" | "ensemble";

export type BacktestResult = {
  total_return: number;
  win_rate: number;
  max_drawdown: number;
  sharpe: number;
  trades: number;
};

export type ReliabilityComponents = {
  directional_acc_score: number;
  error_score: number;
  sharpe_score: number;
  drawdown_score: number;
  signal_strength_score: number;
  trade_support_score: number;
};

export type ReliabilityAdjustmentReason =
  | "trusted"
  | "hold_signal"
  | "score_below_threshold"
  | "weak_signal_strength"
  | "risk_stop_triggered"
  | "no_trade_history";

export type SignalReliability = {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  is_trusted: boolean;
  min_trusted_score: number;
  adjustment_reason?: ReliabilityAdjustmentReason;
  components: ReliabilityComponents;
};

export type ThresholdOptimizationResult = {
  used: boolean;
  base_long_threshold: number;
  base_short_threshold: number;
  applied_long_threshold: number;
  applied_short_threshold: number;
  candidate_pairs: number;
  score: number;
  validation_backtest: BacktestResult;
};

export type WatchlistResult = {
  symbols: string[];
  count: number;
};

export type TrainReport = {
  symbol: string;
  interval: string;
  model_algorithm: CoinAIAlgorithm;
  applied_long_threshold: number;
  applied_short_threshold: number;
  candles: number;
  train_samples: number;
  val_samples: number;
  test_samples: number;
  feature_names: string[];
  train_loss: number;
  val_loss: number;
  best_epoch: number;
  test_mse: number;
  test_directional_acc: number;
  backtest: BacktestResult;
  threshold_optimization?: ThresholdOptimizationResult;
  next_predicted_return: number;
  raw_signal: CoinAISignal;
  signal: CoinAISignal;
  reliability: SignalReliability;
  generated_at: string;
};

export type MultiSymbolSignal = {
  symbol: string;
  next_predicted_return: number;
  raw_signal: CoinAISignal;
  signal: CoinAISignal;
  reliability: SignalReliability;
};

export type MultiTrainReport = {
  symbols: string[];
  interval: string;
  model_algorithm: CoinAIAlgorithm;
  applied_long_threshold: number;
  applied_short_threshold: number;
  total_candles: number;
  train_samples: number;
  val_samples: number;
  test_samples: number;
  feature_names: string[];
  train_loss: number;
  val_loss: number;
  best_epoch: number;
  test_mse: number;
  test_directional_acc: number;
  backtest: BacktestResult;
  threshold_optimization?: ThresholdOptimizationResult;
  signals: MultiSymbolSignal[];
  generated_at: string;
};

export type TrainMultiRequest = {
  symbols: string[];
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
