"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Spin } from "antd";
import { useTheme } from "@/hooks/useTheme";
import { tradingApi, candleToChart } from "@/lib/api/trading";
import { useTradingStream } from "@/hooks/useTradingStream";
import type { KlineUpdate, OrderBookState, PriceLevel } from "@/types/trading";
import SymbolSearch from "@/features/trading/components/SymbolSearch";

const TradingChart = dynamic(
  () => import("@/features/trading/components/TradingChart"),
  {
    ssr: false,
    loading: () => (
      <div className="tp-chart-spin" style={{ height: 460 }}>
        <Spin size="large" />
      </div>
    ),
  },
);

const PERIODS = [
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "12h",
  "1d", "1w",
  "1M", "6M", "1Y", "2Y", "3Y",
] as const;
type Period = (typeof PERIODS)[number];

type CandleBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

const PERIOD_CONFIG: Record<Period, { interval: string; limit: number }> = {
  // ── Intraday ───────────────────────────────────────────────────────────────
  "1m":  { interval: "1m",  limit: 120 },  // 2 h of 1m candles
  "3m":  { interval: "3m",  limit: 120 },  // 6 h of 3m candles
  "5m":  { interval: "5m",  limit: 120 },  // 10 h of 5m candles
  "15m": { interval: "15m", limit: 96  },  // 24 h of 15m candles
  "30m": { interval: "30m", limit: 96  },  // 48 h of 30m candles
  // ── Multi-day ──────────────────────────────────────────────────────────────
  "1h":  { interval: "1h",  limit: 168 },  // 1 week of 1h candles
  "2h":  { interval: "2h",  limit: 120 },  // 10 days of 2h candles
  "4h":  { interval: "4h",  limit: 120 },  // 20 days of 4h candles
  "6h":  { interval: "6h",  limit: 120 },  // 30 days of 6h candles
  "12h": { interval: "12h", limit: 120 },  // 60 days of 12h candles
  // ── Long-term ──────────────────────────────────────────────────────────────
  "1d":  { interval: "1d",  limit: 180 },  // 6 months of daily candles
  "1w":  { interval: "1w",  limit: 104 },  // 2 years of weekly candles
  "1M":  { interval: "1d",  limit: 30  },  // last 30 days
  "6M":  { interval: "1d",  limit: 180 },  // last 180 days
  "1Y":  { interval: "1d",  limit: 365 },  // last 1 year
  "2Y":  { interval: "1d",  limit: 730 },  // last 2 years
  "3Y":  { interval: "1w",  limit: 156 },  // 3 years of weekly candles
};

/* ── helpers ── */
function fmt(v: string | number, decimals = 2) {
  return parseFloat(String(v)).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function fmtQty(v: string | number) {
  const n = parseFloat(String(v));
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(4);
}
function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

/* ── cumulative depth ── */
function buildCumulative(levels: PriceLevel[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (const l of levels) {
    sum += parseFloat(l.quantity);
    out.push(sum);
  }
  return out;
}

/* ── kline → CandleBar ── */
function klineToBar(k: KlineUpdate): CandleBar {
  return {
    time: Math.floor(k.open_time / 1000),
    open: Number(k.open),
    high: Number(k.high),
    low: Number(k.low),
    close: Number(k.close),
  };
}

export default function TradingPage() {
  const { isDark } = useTheme();
  const [symbol, setSymbol] = useState(() => {
    if (typeof window === "undefined") return "BTCUSDT";
    return (
      new URLSearchParams(window.location.search).get("symbol") ?? "BTCUSDT"
    );
  });
  const [period, setPeriod] = useState<Period>("1h");
  const [candles, setCandles] = useState<CandleBar[]>([]);
  const [candleLoading, setCandleLoading] = useState(true);
  const [candleError, setCandleError] = useState<string | null>(null);
  const [chartHeight, setChartHeight] = useState(460);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Real-time stream ── */
  const {
    tickerSnapshot,
    ticker,
    trades,
    orderBook,
    bookChanges,
    liveCandle,
    connected,
    reconnecting,
    everConnected,
    reconnect,
  } = useTradingStream(symbol);

  // tickerSnapshot: initial data sent on connect (available immediately).
  // ticker: live updates ~1/s (overrides snapshot).
  // displayTicker: use live data when available, fall back to snapshot.
  const displayTicker = ticker ?? tickerSnapshot;

  /* ── REST fallback: load order book via REST if WS snapshot is slow ── */
  const [restBook, setRestBook] = useState<OrderBookState | null>(null);

  useEffect(() => {
    // WS book arrived — REST fallback no longer needed.
    if (orderBook) { setRestBook(null); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const book = await tradingApi.getOrderBook(symbol, 20, ctrl.signal);
        setRestBook({
          lastUpdateId: book.last_update_id,
          bids: new Map(book.bids.map((l) => [l.price, l.quantity])),
          asks: new Map(book.asks.map((l) => [l.price, l.quantity])),
          bestBid: book.best_bid,
          bestAsk: book.best_ask,
          spread: book.spread,
          spreadPercent: book.spread_percent,
          midPrice: book.mid_price,
          totalBidQty: book.total_bid_qty,
          totalAskQty: book.total_ask_qty,
        });
      } catch { /* WS snapshot will eventually arrive */ }
    }, 3_000);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [orderBook, symbol]);

  useEffect(() => { setRestBook(null); }, [symbol]);

  // Use WS book when available; fall back to REST snapshot while waiting.
  const displayBook = orderBook ?? restBook;

  /* ── Resize handler ── */
  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      setChartHeight(w < 480 ? 240 : w < 768 ? 320 : 460);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Fetch OHLCV via REST on symbol / period change ── */
  const fetchCandles = useCallback(
    async (sig: AbortSignal) => {
      const { interval, limit } = PERIOD_CONFIG[period];
      setCandleLoading(true);
      setCandleError(null);
      try {
        const raw = await tradingApi.getOHLCV(symbol, interval, limit, sig);
        setCandles(raw.map(candleToChart));
      } catch (e) {
        if ((e as Error).name !== "AbortError")
          setCandleError((e as Error).message);
      } finally {
        setCandleLoading(false);
      }
    },
    [symbol, period],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void fetchCandles(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchCandles]);

  /* ── Live candle bar passed directly to TradingChart via series.update() ── */
  // Only 1m period: the WS stream sends 1m klines regardless of chart period.
  // series.update() is O(1) — no full data reload on each tick.
  const liveBar = period === "1m" && liveCandle ? klineToBar(liveCandle) : null;

  /* ── Convert order book Maps → sorted PriceLevel[] (top 10) ── */
  const bids: PriceLevel[] = displayBook
    ? [...displayBook.bids.entries()]
        .sort(([a], [b]) => Number(b) - Number(a))
        .slice(0, 10)
        .map(([price, quantity]) => ({ price, quantity }))
    : [];
  const asks: PriceLevel[] = displayBook
    ? [...displayBook.asks.entries()]
        .sort(([a], [b]) => Number(a) - Number(b))
        .slice(0, 10)
        .map(([price, quantity]) => ({ price, quantity }))
    : [];

  // True when we have data but the stream has dropped — show stale treatment.
  const isStale =
    !connected && (displayTicker !== null || displayBook !== null || trades.length > 0);

  // price_direction is server-computed — no need to re-derive on frontend.
  const changeDirection = displayTicker?.price_direction ?? "flat";
  const changeClass =
    changeDirection === "up" ? " tp-up" : changeDirection === "down" ? " tp-dn" : "";
  const rawPriceChange = toFiniteNumber(displayTicker?.price_change_percent);
  const changeText =
    rawPriceChange === null
      ? "—"
      : `${rawPriceChange > 0 ? "+" : rawPriceChange < 0 ? "-" : ""}${Math.abs(rawPriceChange).toFixed(2)}%`;

  const asksCum = buildCumulative(asks);
  const bidsCum = buildCumulative(bids);
  const maxAskCum = asksCum.at(-1) ?? 0;
  const maxBidCum = bidsCum.at(-1) ?? 0;

  // Use server-computed spread fields from the snapshot (more accurate than top-1 diff).
  const spread    = displayBook ? parseFloat(displayBook.spread) : null;
  const spreadPct = displayBook ? parseFloat(displayBook.spreadPercent) : null;

  // Use total_bid/ask_qty from snapshot for pressure gauge (full depth, not just top 10).
  const totalBid = displayBook ? parseFloat(displayBook.totalBidQty) : 0;
  const totalAsk = displayBook ? parseFloat(displayBook.totalAskQty) : 0;
  const bidPct =
    totalBid + totalAsk > 0
      ? Math.round((totalBid / (totalBid + totalAsk)) * 100)
      : 50;

  const maxTradeQty =
    trades.length > 0 ? Math.max(...trades.map((t) => parseFloat(t.qty))) : 0;
  const buyCount = trades.filter((t) => t.is_buyer).length;
  const tradeRatioPct =
    trades.length > 0 ? Math.round((buyCount / trades.length) * 100) : 50;

  return (
    <div className="tp-shell">
      {/* ── Ticker bar ─────────────────────────────────────────────────── */}
      <div className={`tp-ticker-bar${isStale ? " tp-stale-bar" : ""}`}>
        {/* Symbol picker */}
        <div className="tp-symbol-block">
          <SymbolSearch value={symbol} onChange={setSymbol} />
        </div>

        {/* Live stats */}
        {displayTicker ? (
          <div className={`tp-stats-strip${isStale ? " tp-stale" : ""}${!ticker && tickerSnapshot ? " tp-snapshot" : ""}`}>
            <div className="tp-price-block">
              <span className={`tp-price${changeClass}`}>
                {fmt(displayTicker.last_price)}
              </span>
              <span className={`tp-change${changeClass}`}>
                {changeDirection === "up" ? (
                  <ArrowUpOutlined />
                ) : changeDirection === "down" ? (
                  <ArrowDownOutlined />
                ) : (
                  <MinusOutlined />
                )}
                {changeText}
              </span>
            </div>
            <div className="tp-stat-item tp-hide-xs">
              <span className="tp-stat-label">24h Vol</span>
              <span className="tp-stat-value">{fmtQty(displayTicker.volume)}</span>
            </div>
            <div className="tp-stat-item tp-hide-sm">
              <span className="tp-stat-label">High</span>
              <span className="tp-stat-value tp-up">{fmt(displayTicker.high_price)}</span>
            </div>
            <div className="tp-stat-item tp-hide-sm">
              <span className="tp-stat-label">Low</span>
              <span className="tp-stat-value tp-dn">{fmt(displayTicker.low_price)}</span>
            </div>
            <div className="tp-stat-item tp-hide-sm">
              <span className="tp-stat-label">VWAP</span>
              <span className="tp-stat-value">{fmt(displayTicker.weighted_avg_price)}</span>
            </div>
            <div className="tp-stat-item tp-hide-sm">
              <span className="tp-stat-label">Trades</span>
              <span className="tp-stat-value">{displayTicker.trade_count.toLocaleString()}</span>
            </div>
            {/* 24h range bar — shows where last_price sits in [low, high] */}
            <div className="tp-stat-item tp-hide-sm" style={{ gap: 4 }}>
              <span className="tp-stat-label">Range</span>
              <span className="tp-range-track">
                <span
                  className="tp-range-fill"
                  style={{ width: `${displayTicker.range_percent}%` }}
                />
              </span>
              <span className="tp-stat-value" style={{ fontSize: 10 }}>
                {parseFloat(displayTicker.range_percent).toFixed(0)}%
              </span>
            </div>
            {isStale && <span className="tp-ticker-stale-tag">⏸ Stale</span>}
          </div>
        ) : (
          <div className="tp-stats-strip">
            <Spin size="small" />
          </div>
        )}

        {/* Period pills + refresh + connection indicator */}
        <div className="tp-controls-block">
          <div className="tp-period-row">
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`tp-period-btn${period === p ? " tp-period-active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="tp-refresh-btn"
            onClick={() => {
              if (abortRef.current) abortRef.current.abort();
              const ctrl = new AbortController();
              abortRef.current = ctrl;
              void fetchCandles(ctrl.signal);
            }}
            title="Refresh candles"
          >
            <ReloadOutlined />
          </button>
          <span
            className={`tp-ws-dot${connected ? " tp-ws-live" : reconnecting ? " tp-ws-reconnecting" : " tp-ws-dead"}`}
            title={
              connected
                ? "Live"
                : reconnecting
                  ? "Reconnecting…"
                  : "Connection lost"
            }
          />
        </div>
      </div>

      {/* ── Status banners ─────────────────────────────────────────────── */}
      {reconnecting && !connected && (
        <div className="tp-reconnect-banner">
          <span className="tp-reconnect-spinner" />
          Reconnecting to live stream…
        </div>
      )}
      {!connected && !reconnecting && everConnected && (
        <div className="tp-lost-banner">
          <span className="tp-lost-icon">⚠</span>
          Connection lost — data is stale
          <button className="tp-reconnect-btn" onClick={reconnect}>
            Reconnect
          </button>
        </div>
      )}
      {candleError && (
        <div className="tp-error-banner">
          Failed to load candles: {candleError}
        </div>
      )}

      {/* ── Main content: chart + book + trades ────────────────────────── */}
      <div className="tp-main-grid">
        {/* Chart */}
        <div className="tp-chart-card">
          {candleLoading && candles.length === 0 ? (
            <div className="tp-chart-spin" style={{ height: chartHeight }}>
              <Spin size="large" />
            </div>
          ) : (
            <TradingChart
              candles={candles}
              isDark={isDark}
              height={chartHeight}
              liveBar={liveBar}
            />
          )}
        </div>

        {/* Right column: order book + trades */}
        <div className="tp-right-col">
          {/* Order book */}
          <div className={`tp-book-card${isStale ? " tp-stale" : ""}`}>
            {/* Header */}
            <div className="tp-book-header">
              <span className="tp-book-title">Order Book</span>
              <div className="tp-book-header-right">
                {isStale && <span className="tp-stale-chip">STALE</span>}
                <span className="tp-book-pair">{symbol}</span>
              </div>
            </div>

            {/* Column labels */}
            <div className="tp-book-cols">
              <span>Price</span>
              <span>Size</span>
              <span>Total</span>
            </div>

            {/* Asks — reversed so lowest ask (best) is at the bottom */}
            <div className="tp-asks">
              {[...asks].reverse().map((row, j) => {
                const origIdx = asks.length - 1 - j;
                const cum = asksCum[origIdx] ?? 0;
                const pct = maxAskCum > 0 ? (cum / maxAskCum) * 100 : 0;
                return (
                  <div key={row.price} className="tp-book-row tp-ask-row">
                    <div
                      className="tp-depth-bar tp-ask-bar"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="tp-book-price tp-dn">
                      {fmt(row.price)}
                    </span>
                    <span className="tp-book-size">
                      {fmtQty(row.quantity)}
                      {bookChanges.get(row.price) === "up" && (
                        <span key={`u-${row.price}`} className="tp-chg-ind tp-chg-up">▲</span>
                      )}
                      {bookChanges.get(row.price) === "down" && (
                        <span key={`d-${row.price}`} className="tp-chg-ind tp-chg-dn">▼</span>
                      )}
                    </span>
                    <span className="tp-book-total">{fmtQty(String(cum))}</span>
                  </div>
                );
              })}
            </div>

            {/* Mid price + spread row */}
            <div className="tp-mid-row">
              <div className="tp-mid-price">
                <span className={changeClass.trim()}>
                  {displayTicker ? fmt(displayTicker.last_price) : (displayBook ? fmt(displayBook.midPrice) : "—")}
                </span>
                {changeDirection === "up" ? (
                  <ArrowUpOutlined className="tp-mid-arrow tp-up" />
                ) : changeDirection === "down" ? (
                  <ArrowDownOutlined className="tp-mid-arrow tp-dn" />
                ) : (
                  <MinusOutlined className="tp-mid-arrow" />
                )}
              </div>
              {spread !== null && (
                <div className="tp-mid-spread">
                  <span className="tp-mid-spread-lbl">Spread</span>
                  <span className="tp-mid-spread-val">
                    {spread.toFixed(4)}
                    {spreadPct !== null && (
                      <span className="tp-mid-spread-pct">
                        {" "}({spreadPct.toFixed(3)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Bids */}
            <div className="tp-bids">
              {bids.map((row, i) => {
                const cum = bidsCum[i] ?? 0;
                const pct = maxBidCum > 0 ? (cum / maxBidCum) * 100 : 0;
                return (
                  <div key={row.price} className="tp-book-row tp-bid-row">
                    <div
                      className="tp-depth-bar tp-bid-bar"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="tp-book-price tp-up">
                      {fmt(row.price)}
                    </span>
                    <span className="tp-book-size">
                      {fmtQty(row.quantity)}
                      {bookChanges.get(row.price) === "up" && (
                        <span key={`u-${row.price}`} className="tp-chg-ind tp-chg-up">▲</span>
                      )}
                      {bookChanges.get(row.price) === "down" && (
                        <span key={`d-${row.price}`} className="tp-chg-ind tp-chg-dn">▼</span>
                      )}
                    </span>
                    <span className="tp-book-total">{fmtQty(String(cum))}</span>
                  </div>
                );
              })}
            </div>

            {/* Buy/Sell pressure gauge */}
            <div className="tp-pressure">
              <div className="tp-pressure-track">
                <div
                  className="tp-pressure-bid"
                  style={{ width: `${bidPct}%` }}
                />
              </div>
              <div className="tp-pressure-labels">
                <span className="tp-up">{bidPct}% B</span>
                <span className="tp-dn">{100 - bidPct}% S</span>
              </div>
            </div>
          </div>

          {/* Recent trades */}
          <div className={`tp-trades-card${isStale ? " tp-stale" : ""}`}>
            {/* Header */}
            <div className="tp-trades-header">
              <span className="tp-trades-title">Recent Trades</span>
              {connected ? (
                <span className="tp-trades-live">
                  <span className="tp-live-dot" />
                  LIVE
                </span>
              ) : isStale ? (
                <span className="tp-trades-paused">PAUSED</span>
              ) : null}
            </div>

            {/* Column labels */}
            <div className="tp-trades-cols">
              <span>Price</span>
              <span>Qty</span>
              <span>Time</span>
            </div>

            {/* Trade rows */}
            <div className="tp-trades-list">
              {trades.slice(0, 20).map((t) => {
                const isBuy = t.is_buyer;
                const tradeKey = `${t.id}-${t.time}-${isBuy ? "b" : "s"}-${t.price}-${t.qty}`;
                const volPct =
                  maxTradeQty > 0 ? (parseFloat(t.qty) / maxTradeQty) * 100 : 0;
                return (
                  <div
                    key={tradeKey}
                    className={`tp-trade-row${isBuy ? " tp-trade-buy" : " tp-trade-sell"}`}
                  >
                    <div
                      className={`tp-trade-vol-bar${isBuy ? " tp-vol-buy" : " tp-vol-sell"}`}
                      style={{ width: `${volPct}%` }}
                    />
                    <span
                      className={`tp-trade-price${isBuy ? " tp-up" : " tp-dn"}`}
                    >
                      {fmt(t.price)}
                    </span>
                    <span className="tp-trade-qty">{fmtQty(t.qty)}</span>
                    <span className="tp-trade-time">{fmtTime(t.time)}</span>
                  </div>
                );
              })}
            </div>

            {/* Buy / Sell ratio from recent trades */}
            {trades.length > 0 && (
              <div className="tp-trades-ratio">
                <div className="tp-trades-ratio-track">
                  <div
                    className="tp-trades-ratio-buy"
                    style={{ width: `${tradeRatioPct}%` }}
                  />
                </div>
                <div className="tp-trades-ratio-labels">
                  <span className="tp-up">B {tradeRatioPct}%</span>
                  <span className="tp-dn">S {100 - tradeRatioPct}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
