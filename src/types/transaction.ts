// ─────────────────────────────────────────────────────────────────────────────
// Transaction
// ─────────────────────────────────────────────────────────────────────────────

export type Transaction = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";

  // Số liệu tại thời điểm giao dịch
  quantity: string;
  price: string; // entry price
  total: string; // quantity × entry price
  fee: string;

  note: string;
  created_at: string; // RFC3339 UTC

  // ── Live market fields ───────────────────────────────────────────────────
  // Chuỗi rỗng "" nếu chưa có giá trong cache.
  current_price: string; // giá thị trường hiện tại
  current_value: string; // quantity × current_price

  // Chỉ có giá trị với BUY. SELL luôn = "0".
  pnl: string; // current_value - total
  pnl_pct: string; // (current_price - entry_price) / entry_price × 100
};

// ─────────────────────────────────────────────────────────────────────────────
// Request
// ─────────────────────────────────────────────────────────────────────────────

export type CreateTransactionRequest = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number; // số thực, > 0
  price: number; // số thực, > 0
  fee?: number; // optional
  note?: string; // optional
};

// ─────────────────────────────────────────────────────────────────────────────
// List response
// ─────────────────────────────────────────────────────────────────────────────

export type ListTransactionsResponse = {
  transactions: Transaction[];
  total: number; // tổng record (để tính trang)
  page: number;
  per_page: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// History snapshot (10 giây / điểm)
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionHistoryPoint = {
  id: string;
  tx_count: number;
  watermark_version: string;
  change_kind: "initial" | "transaction_changed" | "market_tick";
  total_invested: number;
  total_current_value: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_fees: number;
  delta_invested: number;
  delta_current_value: number;
  delta_unrealized_pnl: number;
  recorded_at: string; // RFC3339 UTC
};

export type ListTransactionHistoryResponse = {
  interval_seconds: number; // currently fixed at 10
  items: TransactionHistoryPoint[];
  total: number;
  page: number;
  per_page: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// API wrapper
// ─────────────────────────────────────────────────────────────────────────────

export type ApiResponse<T> = {
  message: string;
  data?: T;
};
