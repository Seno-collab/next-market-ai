// ─────────────────────────────────────────────────────────────────────────────
// PositionRow — 1 symbol, aggregated từ tất cả transactions (từ REST)
// ─────────────────────────────────────────────────────────────────────────────

export type PositionRow = {
  symbol: string;

  // Aggregated từ DB (bất biến cho đến khi refetch)
  total_buy_qty: number;
  total_sell_qty: number;
  net_qty: number; // > 0 = đang giữ (open long), = 0 = đã đóng
  avg_buy_price: number; // AVCO weighted average cost
  total_fees: number;
  total_invested: number; // avg_buy_price × net_qty
  realized_pnl: number; // P&L đã chốt theo phương pháp AVCO

  // Live market — tất cả = 0 khi net_qty == 0
  current_price: number;
  price_change_24h_pct: number;
  current_value: number; // current_price × net_qty
  unrealized_pnl: number; // current_value - total_invested
  unrealized_pnl_pct: number; // unrealized_pnl / total_invested × 100
};

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioResponse — shape của REST /api/trading/portfolio
// ─────────────────────────────────────────────────────────────────────────────

export type PortfolioResponse = {
  positions: PositionRow[];
  total_invested: number;
  total_current_value: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_fees: number;
  generated_at: string; // ISO 8601 UTC
  watermark: {
    tx_count: number;
    last_transaction_at?: string; // ISO 8601 UTC
    version: string; // đổi khi DB transactions thay đổi
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// LivePositionRow — PositionRow với live_* fields được WS ghi đè ~1/s
// ─────────────────────────────────────────────────────────────────────────────

export type LivePositionRow = PositionRow & {
  live_price: number;
  live_value: number;
  live_unrealized_pnl: number;
  live_unrealized_pnl_pct: number;
  live_change_24h_pct: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// LivePortfolio — state trả về bởi usePortfolioStream
// ─────────────────────────────────────────────────────────────────────────────

export type LivePortfolio = {
  positions: LivePositionRow[];
  total_invested: number;
  total_live_value: number;
  total_live_unrealized_pnl: number;
  total_realized_pnl: number;
  total_fees: number;
  generated_at: string;
  watermark: PortfolioResponse["watermark"];
};

export type ApiResponse<T> = {
  message: string;
  data?: T;
};
