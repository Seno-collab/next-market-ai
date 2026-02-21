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
