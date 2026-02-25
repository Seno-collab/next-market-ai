export type ApiResponse<T> = {
	message: string;
	data?: T;
};

// ── WebSocket stream types ────────────────────────────────────────────────

export type WsEventType =
	| "ticker_snapshot"
	| "book_snapshot"
	| "trade_snapshot"
	| "ticker_update"
	| "trade_update"
	| "book_delta"
	| "kline_update"
	| "stream_reconnected";

export type WsMessage<T = unknown> = {
	type: WsEventType;
	symbol: string;
	data: T;
};

/**
 * WS ticker_snapshot — sent once on connect, same shape as REST Ticker.
 * Use as initial display while waiting for the first ticker_update.
 */
export type TickerSnapshot = Ticker;

/** WS ticker_update — same shape as REST Ticker, sent ~1/s. */
export type TickerUpdate = Ticker;

/** WS book_snapshot — same shape as REST OrderBook (includes server-computed fields). */
export type BookSnapshot = OrderBook;

/** WS trade_snapshot — bootstrap recent trades sent on connect. */
export type TradeSnapshot = TradeUpdate[];

/** WS stream_reconnected — server Binance upstream đã reconnect, reset orderBook. */
export type StreamReconnected = Record<string, never>;

/**
 * Real-time trade from WS stream.
 * NOTE: uses `is_buyer` (true=BUY), opposite naming from REST `is_buyer_maker`.
 */
export type TradeUpdate = {
	id: number;
	price: string;
	qty: string;
	time: number; // ms timestamp
	is_buyer: boolean; // true=BUY, false=SELL
};

/**
 * Incremental order-book update.
 * bids/asks are array-of-arrays [[price, qty], ...].
 * qty="0.00000000" means remove that price level.
 */
export type BookDelta = {
	first_update_id: number;
	last_update_id: number;
	bids: [string, string][];
	asks: [string, string][];
};

/** Live 1m candle. is_closed=true when the candle period ends. */
export type KlineUpdate = {
	open_time: number;
	close_time: number;
	open: string;
	high: string;
	low: string;
	close: string;
	volume: string;
	is_closed: boolean;
};

export type ApiError = {
	message: string;
};

export type Ticker = {
	symbol: string;

	// Price
	last_price: string;
	open_price: string;
	high_price: string;
	low_price: string;

	// 24h change
	price_change: string;
	price_change_percent: string;

	// Volume
	volume: string; // base asset (e.g. BTC)
	quote_volume: string; // quote asset (e.g. USDT)

	// Advanced
	weighted_avg_price: string; // VWAP 24h
	last_qty: string; // last trade qty
	trade_count: number; // number of trades 24h

	// Inside market (best bid/ask at snapshot time)
	best_bid: string;
	best_bid_qty: string;
	best_ask: string;
	best_ask_qty: string;

	// Time window
	open_time: number; // ms timestamp
	close_time: number; // ms timestamp

	// Server-computed — no need to calculate on frontend
	price_direction: "up" | "down" | "flat";
	range_percent: string; // % position of last_price in [low, high]. "0"=bottom "100"=top
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
	bids: PriceLevel[]; // sorted high → low
	asks: PriceLevel[]; // sorted low → high

	// Server-computed — no need to calculate on frontend
	best_bid: string;
	best_bid_qty: string;
	best_ask: string;
	best_ask_qty: string;
	spread: string; // best_ask - best_bid (absolute)
	spread_percent: string; // spread / mid_price × 100 (4 decimal)
	mid_price: string; // (best_bid + best_ask) / 2
	total_bid_qty: string; // sum qty all bid levels
	total_ask_qty: string; // sum qty all ask levels
};

/**
 * In-memory order book maintained by useTradingStream.
 * bids/asks stored as Maps for O(1) delta apply.
 * Convenience fields copied from the most recent book_snapshot.
 */
export type OrderBookState = {
	lastUpdateId: number;
	bids: Map<string, string>; // price → qty
	asks: Map<string, string>; // price → qty
	// From latest snapshot (not updated by deltas — deltas only touch bids/asks Maps)
	bestBid: string;
	bestAsk: string;
	spread: string;
	spreadPercent: string;
	midPrice: string;
	totalBidQty: string;
	totalAskQty: string;
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
	id: string; // UUID
	symbol: string; // e.g. "BTCUSDT"
	side: "BUY" | "SELL";
	quantity: string; // decimal string
	price: string; // decimal string (entry price)
	total: string; // quantity * entry price, decimal string
	fee: string; // decimal string
	note: string;
	created_at: string; // RFC3339 UTC

	// ── Live market fields (enriched by server from Redis ticker cache) ────────
	// Empty string "" when price is not yet in cache.
	current_price: string; // live market price
	current_value: string; // quantity × current_price
	pnl: string; // current_value - total (BUY only; "0" for SELL)
	pnl_pct: string; // (current_price - price) / price × 100 (BUY only; "0" for SELL)
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

export type Signal = "BUY" | "SELL" | "HOLD";
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
	score: number; // -100 to 100
	indicators: IndicatorsResult;
	best_hours: number[]; // top UTC hours by volume, e.g. [14, 10, 2]
	support: number[];
	resistance: number[];
	summary: string;
};

export type DailyReport = {
	symbol: string;
	date: string; // YYYY-MM-DD
	interval: string;
	ticker: Ticker;
	analysis: AnalysisResult;
	candles: Candle[];
	generated_at: string; // RFC3339 UTC
};

// ── Symbol browser types ─────────────────────────────────────────────────────

export type SymbolItem = {
	symbol: string; // e.g. "BTCUSDT"
	base_asset: string; // e.g. "BTC"
	quote_asset: string; // e.g. "USDT"
};

export type SymbolsResponse = {
	symbols: SymbolItem[];
	count: number;
};

export type QuoteItem = {
	quote_asset: string; // e.g. "USDT"
	symbol_count: number; // number of pairs in this quote line
};

export type QuotesResponse = {
	quotes: QuoteItem[];
	count: number;
};

// ── CoinAI types ────────────────────────────────────────────────────────────

export type CoinAISignal = "BUY" | "SELL" | "HOLD";

export type BacktestResult = {
	total_return: number; // decimal  e.g. 0.082 = +8.2%
	win_rate: number; // decimal  e.g. 0.56  = 56%
	max_drawdown: number; // decimal, negative  e.g. -0.041 = -4.1%
	sharpe: number;
	trades: number;
};

export type TrainReport = {
	symbol: string;
	interval: string;
	candles: number;
	train_samples: number;
	val_samples: number;
	test_samples: number;
	feature_names: string[];
	train_loss: number;
	val_loss: number; // 0 when no validation split
	best_epoch: number; // 0 when no early stopping
	test_mse: number;
	test_directional_acc: number; // decimal  e.g. 0.537 = 53.7%
	backtest: BacktestResult;
	next_predicted_return: number; // decimal  e.g. 0.0018 = +0.18%
	signal: CoinAISignal;
	generated_at: string; // RFC3339 UTC
};

/** GET /api/coinai/watchlist response */
export type WatchlistResult = {
	symbols: string[];
	count: number;
};

export type AddWatchlistRequest = {
	symbol: string;
};

// ── Portfolio types ─────────────────────────────────────────────────────────

export type PositionRow = {
	symbol: string;
	total_buy_qty: number;
	total_sell_qty: number;
	net_qty: number;
	avg_buy_price: number;
	total_fees: number;
	total_invested: number;
	realized_pnl: number;
	current_price: number;
	price_change_24h_pct: number;
	current_value: number;
	unrealized_pnl: number;
	unrealized_pnl_pct: number;
};

export type PortfolioData = {
	positions: PositionRow[];
	total_invested: number;
	total_current_value: number;
	total_unrealized_pnl: number;
	total_realized_pnl: number;
	total_fees: number;
	generated_at: string;
};
