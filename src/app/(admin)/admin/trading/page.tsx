"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Spin } from "antd";
import { useTheme } from "@/hooks/useTheme";
import { tradingApi, candleToChart } from "@/lib/api/trading";
import { useTradingStream } from "@/hooks/useTradingStream";
import type { KlineUpdate, PriceLevel } from "@/types/trading";
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

const PERIODS = ["1m", "5m", "15m", "1h", "4h", "1d", "1M", "6M", "1Y"] as const;
type Period = (typeof PERIODS)[number];

type CandleBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

const PERIOD_CONFIG: Record<Period, { interval: string; limit: number }> = {
  "1m":  { interval: "1m",  limit: 60  },
  "5m":  { interval: "5m",  limit: 60  },
  "15m": { interval: "15m", limit: 60  },
  "1h":  { interval: "1h",  limit: 100 },
  "4h":  { interval: "4h",  limit: 90  },
  "1d":  { interval: "1d",  limit: 90  },
  "1M":  { interval: "1d",  limit: 30  },
  "6M":  { interval: "1d",  limit: 180 },
  "1Y":  { interval: "1d",  limit: 365 },
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
  if (n >= 1_000)     return (n / 1_000).toFixed(2) + "K";
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

/* ── cumulative depth ── */
function buildCumulative(levels: PriceLevel[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (const l of levels) { sum += parseFloat(l.quantity); out.push(sum); }
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
    return new URLSearchParams(window.location.search).get("symbol") ?? "BTCUSDT";
  });
  const [period, setPeriod] = useState<Period>("1h");
  const [candles, setCandles] = useState<CandleBar[]>([]);
  const [candleLoading, setCandleLoading] = useState(true);
  const [candleError, setCandleError] = useState<string | null>(null);
  const [chartHeight, setChartHeight] = useState(460);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Real-time stream ── */
  const { ticker, trades, orderBook, liveCandle, connected, reconnecting, reconnect } = useTradingStream(symbol);

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
  const fetchCandles = useCallback(async (sig: AbortSignal) => {
    const { interval, limit } = PERIOD_CONFIG[period];
    setCandleLoading(true);
    setCandleError(null);
    try {
      const raw = await tradingApi.getOHLCV(symbol, interval, limit, sig);
      setCandles(raw.map(candleToChart));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setCandleError((e as Error).message);
    } finally {
      setCandleLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void fetchCandles(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchCandles]);

  /* ── Apply kline_update to live chart (only for 1m period) ── */
  useEffect(() => {
    if (!liveCandle || period !== "1m") return;
    const bar = klineToBar(liveCandle);
    if (liveCandle.is_closed) {
      setCandles((prev) => {
        const last = prev[prev.length - 1];
        if (last?.time === bar.time) return prev;
        return [...prev, bar];
      });
    } else {
      setCandles((prev) => {
        if (prev.length === 0) return [bar];
        const last = prev[prev.length - 1];
        return last.time === bar.time
          ? [...prev.slice(0, -1), bar]
          : [...prev, bar];
      });
    }
  }, [liveCandle, period]);

  /* ── Convert WS orderBook Maps → sorted PriceLevel[] (top 10) ── */
  const bids: PriceLevel[] = orderBook
    ? [...orderBook.bids.entries()]
        .sort(([a], [b]) => Number(b) - Number(a))
        .slice(0, 10)
        .map(([price, quantity]) => ({ price, quantity }))
    : [];
  const asks: PriceLevel[] = orderBook
    ? [...orderBook.asks.entries()]
        .sort(([a], [b]) => Number(a) - Number(b))
        .slice(0, 10)
        .map(([price, quantity]) => ({ price, quantity }))
    : [];

  // True when we have data but the stream has dropped — show stale treatment.
  const isStale = !connected && (ticker !== null || orderBook !== null || trades.length > 0);

  const priceChange = ticker ? parseFloat(ticker.price_change_percent) : 0;
  const isUp        = priceChange >= 0;

  const asksCum   = buildCumulative(asks);
  const bidsCum   = buildCumulative(bids);
  const maxAskCum = asksCum.at(-1) ?? 0;
  const maxBidCum = bidsCum.at(-1) ?? 0;

  const spread =
    asks.length && bids.length
      ? parseFloat(asks[0].price) - parseFloat(bids[0].price)
      : null;
  const spreadPct =
    spread !== null && ticker
      ? (spread / parseFloat(ticker.last_price)) * 100
      : null;

  const bidPct =
    maxBidCum + maxAskCum > 0
      ? Math.round((maxBidCum / (maxBidCum + maxAskCum)) * 100)
      : 50;

  const maxTradeQty = trades.length > 0
    ? Math.max(...trades.map((t) => parseFloat(t.qty)))
    : 0;
  const buyCount = trades.filter((t) => t.is_buyer).length;
  const tradeRatioPct = trades.length > 0
    ? Math.round((buyCount / trades.length) * 100)
    : 50;

  return (
    <div className="tp-shell">

      {/* ── Ticker bar ─────────────────────────────────────────────────── */}
      <div className={`tp-ticker-bar${isStale ? " tp-stale-bar" : ""}`}>
        {/* Symbol picker */}
        <div className="tp-symbol-block">
          <SymbolSearch value={symbol} onChange={setSymbol} />
        </div>

        {/* Live stats */}
        {ticker ? (
          <div className={`tp-stats-strip${isStale ? " tp-stale" : ""}`}>
            <div className="tp-price-block">
              <span className={`tp-price${isUp ? " tp-up" : " tp-dn"}`}>
                {fmt(ticker.last_price)}
              </span>
              <span className={`tp-change${isUp ? " tp-up" : " tp-dn"}`}>
                {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {priceChange > 0 ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
            </div>
            <div className="tp-stat-item tp-hide-xs">
              <span className="tp-stat-label">24h Vol</span>
              <span className="tp-stat-value">{fmtQty(ticker.volume)}</span>
            </div>
            <div className="tp-stat-item tp-hide-sm">
              <span className="tp-stat-label">High</span>
              <span className="tp-stat-value tp-up">{fmt(ticker.high_price)}</span>
            </div>
            <div className="tp-stat-item tp-hide-sm">
              <span className="tp-stat-label">Low</span>
              <span className="tp-stat-value tp-dn">{fmt(ticker.low_price)}</span>
            </div>
            {isStale && (
              <span className="tp-ticker-stale-tag">⏸ Stale</span>
            )}
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
              const ctrl = new AbortController();
              void fetchCandles(ctrl.signal);
            }}
            title="Refresh candles"
          >
            <ReloadOutlined />
          </button>
          <span
            className={`tp-ws-dot${connected ? " tp-ws-live" : reconnecting ? " tp-ws-reconnecting" : " tp-ws-dead"}`}
            title={connected ? "Live" : reconnecting ? "Reconnecting…" : "Connection lost"}
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
      {!connected && !reconnecting && (
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
            <TradingChart candles={candles} isDark={isDark} height={chartHeight} />
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
                const cum     = asksCum[origIdx] ?? 0;
                const pct     = maxAskCum > 0 ? (cum / maxAskCum) * 100 : 0;
                return (
                  <div key={row.price} className="tp-book-row tp-ask-row">
                    <div className="tp-depth-bar tp-ask-bar" style={{ width: `${pct}%` }} />
                    <span className="tp-book-price tp-dn">{fmt(row.price)}</span>
                    <span className="tp-book-size">{fmtQty(row.quantity)}</span>
                    <span className="tp-book-total">{fmtQty(String(cum))}</span>
                  </div>
                );
              })}
            </div>

            {/* Last price + spread row */}
            <div className="tp-mid-row">
              <div className="tp-mid-price">
                <span className={isUp ? "tp-up" : "tp-dn"}>
                  {ticker ? fmt(ticker.last_price) : "—"}
                </span>
                {isUp
                  ? <ArrowUpOutlined className="tp-mid-arrow tp-up" />
                  : <ArrowDownOutlined className="tp-mid-arrow tp-dn" />}
              </div>
              {spread !== null && (
                <div className="tp-mid-spread">
                  <span className="tp-mid-spread-lbl">Spread</span>
                  <span className="tp-mid-spread-val">
                    {spread.toFixed(4)}
                    {spreadPct !== null && (
                      <span className="tp-mid-spread-pct"> ({spreadPct.toFixed(3)}%)</span>
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
                    <div className="tp-depth-bar tp-bid-bar" style={{ width: `${pct}%` }} />
                    <span className="tp-book-price tp-up">{fmt(row.price)}</span>
                    <span className="tp-book-size">{fmtQty(row.quantity)}</span>
                    <span className="tp-book-total">{fmtQty(String(cum))}</span>
                  </div>
                );
              })}
            </div>

            {/* Buy/Sell pressure gauge */}
            <div className="tp-pressure">
              <div className="tp-pressure-track">
                <div className="tp-pressure-bid" style={{ width: `${bidPct}%` }} />
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
                const isBuy  = t.is_buyer;
                const tradeKey = `${t.id}-${t.time}-${isBuy ? "b" : "s"}-${t.price}-${t.qty}`;
                const volPct = maxTradeQty > 0
                  ? (parseFloat(t.qty) / maxTradeQty) * 100
                  : 0;
                return (
                  <div
                    key={tradeKey}
                    className={`tp-trade-row${isBuy ? " tp-trade-buy" : " tp-trade-sell"}`}
                  >
                    <div
                      className={`tp-trade-vol-bar${isBuy ? " tp-vol-buy" : " tp-vol-sell"}`}
                      style={{ width: `${volPct}%` }}
                    />
                    <span className={`tp-trade-price${isBuy ? " tp-up" : " tp-dn"}`}>
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
