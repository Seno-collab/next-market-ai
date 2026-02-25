"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { tradingApi } from "@/lib/api/trading";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ThunderboltOutlined,
  AlertOutlined,
  ClockCircleOutlined,
  FireOutlined,
  RiseOutlined,
  GlobalOutlined,
  DotChartOutlined,
  SafetyOutlined,
  RadarChartOutlined,
  AreaChartOutlined,
} from "@ant-design/icons";
import Sparkline from "@/components/ui/Sparkline";

const DashboardGlobeScene = dynamic(
  () => import("@/features/admin/components/DashboardGlobeScene"),
  {
    ssr: false,
    loading: () => (
      <div className="db-scene-load">
        <Spin />
      </div>
    ),
  },
);
const DashboardParticleField = dynamic(
  () => import("@/features/admin/components/DashboardParticleField"),
  { ssr: false },
);

/* ─────────────────────────── data ─────────────────────────── */

type TickerItem = {
  symbol: string; // display label  e.g. "BTC/USDT"
  apiSym: string; // backend symbol e.g. "BTCUSDT"
  price: string; // formatted for display
  change: number; // price_change_percent as a number
  up: boolean;
  history: number[]; // rolling price buffer (capped at HISTORY_MAX)
};

const HISTORY_MAX = 15;
const POLL_INTERVAL_MS = 4_000;

/** Seed / fallback – shown immediately and while the first fetch is in flight. */
const TICKER_SEED: TickerItem[] = [
  {
    symbol: "BTC/USDT",
    apiSym: "BTCUSDT",
    price: "97,420",
    change: 2.44,
    up: true,
    history: [
      91200, 92800, 91500, 93400, 94100, 93700, 95200, 95800, 96100, 95400,
      96800, 97000, 96500, 97100, 97420,
    ],
  },
  {
    symbol: "ETH/USDT",
    apiSym: "ETHUSDT",
    price: "4,010",
    change: 1.76,
    up: true,
    history: [
      3720, 3780, 3750, 3810, 3870, 3840, 3900, 3880, 3920, 3960, 3940, 3980,
      3970, 4000, 4010,
    ],
  },
  {
    symbol: "SOL/USDT",
    apiSym: "SOLUSDT",
    price: "235.40",
    change: -0.84,
    up: false,
    history: [
      228, 234, 240, 238, 242, 244, 241, 239, 237, 240, 238, 236, 237, 236, 235,
    ],
  },
  {
    symbol: "XRP/USDT",
    apiSym: "XRPUSDT",
    price: "1.12",
    change: 0.91,
    up: true,
    history: [
      1.04, 1.06, 1.05, 1.07, 1.08, 1.07, 1.09, 1.1, 1.09, 1.11, 1.1, 1.12,
      1.11, 1.12, 1.12,
    ],
  },
  {
    symbol: "BNB/USDT",
    apiSym: "BNBUSDT",
    price: "412.30",
    change: -1.23,
    up: false,
    history: [
      420, 418, 422, 419, 417, 421, 418, 415, 416, 414, 416, 413, 415, 413, 412,
    ],
  },
  {
    symbol: "LINK/USDT",
    apiSym: "LINKUSDT",
    price: "31.45",
    change: 3.14,
    up: true,
    history: [
      28.2, 28.9, 28.5, 29.3, 29.8, 29.5, 30.1, 30.6, 30.3, 30.8, 31.0, 30.7,
      31.1, 31.3, 31.45,
    ],
  },
];

function fmtPrice(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n >= 10_000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1_000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (n >= 10) return n.toFixed(2);
  return n.toPrecision(4);
}

const KPI_CARDS = [
  {
    label: "Total Market Cap",
    value: "$2.43T",
    delta: "+2.1%",
    up: true,
    color: "blue",
    history: [
      2.1, 2.15, 2.08, 2.2, 2.25, 2.3, 2.28, 2.35, 2.38, 2.4, 2.39, 2.43,
    ],
  },
  {
    label: "BTC Dominance",
    value: "57.2%",
    delta: "+0.6%",
    up: true,
    color: "amber",
    history: [55, 55.5, 56, 55.8, 56.2, 56.5, 56.8, 57, 56.9, 57.1, 57.0, 57.2],
  },
  {
    label: "24h Spot Volume",
    value: "$138.9B",
    delta: "-4.8%",
    up: false,
    color: "purple",
    history: [150, 148, 145, 152, 149, 143, 141, 138, 140, 137, 139, 138],
  },
  {
    label: "Futures Open Int.",
    value: "$91.4B",
    delta: "+3.3%",
    up: true,
    color: "cyan",
    history: [82, 83, 85, 84, 87, 86, 88, 89, 88, 90, 91, 91.4],
  },
] as const;

const POSITIONS = [
  {
    pair: "BTC/USDT",
    side: "LONG",
    size: "0.5 BTC",
    entry: "$96,100",
    current: "$97,420",
    pnl: "+$660",
    pct: "+0.69%",
    liq: "$91,200",
  },
  {
    pair: "ETH/USDT",
    side: "LONG",
    size: "5 ETH",
    entry: "$3,870",
    current: "$4,010",
    pnl: "+$700",
    pct: "+3.62%",
    liq: "$3,480",
  },
  {
    pair: "SOL/USDT",
    side: "SHORT",
    size: "20 SOL",
    entry: "$240",
    current: "$235",
    pnl: "+$100",
    pct: "+2.08%",
    liq: "$258",
  },
] as const;

const TRADES = [
  {
    time: "08:42",
    type: "buy",
    pair: "BTC/USDT",
    size: "0.25 BTC",
    pnl: "+$241",
  },
  {
    time: "08:35",
    type: "sell",
    pair: "ETH/USDT",
    size: "3.0 ETH",
    pnl: "+$88",
  },
  { time: "08:21", type: "buy", pair: "SOL/USDT", size: "12 SOL", pnl: "-$18" },
  { time: "08:09", type: "sell", pair: "BNB/USDT", size: "2 BNB", pnl: "+$57" },
  { time: "07:58", type: "signal", pair: "XRP/USDT", size: "—", pnl: "LONG" },
] as const;

const SECTORS = [
  { name: "Layer 1", pct: 72, move: 2.8, color: "#22d3ee" },
  { name: "AI Tokens", pct: 85, move: 8.4, color: "#a78bfa" },
  { name: "DeFi", pct: 55, move: 1.9, color: "#34d399" },
  { name: "Memecoins", pct: 28, move: -3.6, color: "#f87171" },
  { name: "RWA", pct: 62, move: 4.1, color: "#fbbf24" },
] as const;

// ─── from Observatory ───
const WATCHLIST = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: "$97,420",
    c24: 2.44,
    c7d: 6.12,
    vol: "$46.1B",
    signal: "Momentum intact",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: "$4,010",
    c24: 1.76,
    c7d: 4.35,
    vol: "$22.5B",
    signal: "L2 driven bid",
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: "$235",
    c24: -0.84,
    c7d: 9.28,
    vol: "$8.3B",
    signal: "High beta risk",
  },
  {
    symbol: "XRP",
    name: "XRP",
    price: "$1.12",
    c24: 0.91,
    c7d: -1.87,
    vol: "$4.1B",
    signal: "Range rotation",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    price: "$31.45",
    c24: 3.14,
    c7d: 12.9,
    vol: "$1.4B",
    signal: "Oracle breakout",
  },
] as const;

type Severity = "high" | "medium" | "low";
const ALERTS: {
  time: string;
  title: string;
  detail: string;
  severity: Severity;
}[] = [
  {
    time: "08:12 UTC",
    severity: "high",
    title: "Funding rate spike — BTC perps",
    detail: "Funding reached 0.041%, above caution threshold.",
  },
  {
    time: "08:45 UTC",
    severity: "medium",
    title: "ETH spot inflow acceleration",
    detail: "Exchange net inflow switched positive for first time in 6h.",
  },
  {
    time: "09:02 UTC",
    severity: "high",
    title: "SOL liquidation wall approaching",
    detail: "High leverage cluster detected around $239–$242.",
  },
  {
    time: "09:34 UTC",
    severity: "low",
    title: "RWA basket trend confirmation",
    detail: "3-session momentum crossed above medium-term baseline.",
  },
  {
    time: "10:05 UTC",
    severity: "medium",
    title: "BTC open interest expanding rapidly",
    detail: "OI up 3.3% in 2h — watch for volatility spike.",
  },
];

const COLOR_MAP: Record<string, string> = {
  blue: "#60a5fa",
  amber: "#fbbf24",
  purple: "#a78bfa",
  cyan: "#22d3ee",
};

/* ─────────────────────────── helpers ─────────────────────────── */

function Chg({ v, size = "sm" }: { v: number; size?: "sm" | "xs" }) {
  const up = v >= 0;
  return (
    <span className={`db-chg ${up ? "up" : "dn"} ${size === "xs" ? "xs" : ""}`}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {Math.abs(v).toFixed(2)}%
    </span>
  );
}

function SevDot({ s }: { s: Severity }) {
  return <span className={`db-sev-dot db-sev-${s}`} />;
}

/* ─────────────────────────── page ─────────────────────────── */

export default function AdminDashboardPage() {
  const [tickers, setTickers] = useState<TickerItem[]>(TICKER_SEED);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const results = await Promise.allSettled(
        TICKER_SEED.map((t) => tradingApi.getTicker(t.apiSym)),
      );
      if (cancelled) return;

      setTickers((prev) =>
        prev.map((item, i) => {
          const r = results[i];
          if (r.status !== "fulfilled") return item; // keep last good value on error
          const api = r.value;
          const newPrice = Number(api.last_price);
          const newChange = Number(api.price_change_percent);
          return {
            ...item,
            price: fmtPrice(api.last_price),
            change: newChange,
            up: newChange >= 0,
            history: [...item.history, newPrice].slice(-HISTORY_MAX),
          };
        }),
      );
    }

    poll(); // immediate first fetch
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  /** Look up live ticker by backend symbol (e.g. "BTCUSDT"). */
  function getLive(apiSym: string): TickerItem | undefined {
    return tickers.find((t) => t.apiSym === apiSym);
  }

  return (
    <div className="db-shell">
      <div className="db-bg">
        <DashboardParticleField />
      </div>

      <div className="db-body">
        {/* ── 1. Ticker ── */}
        <div className="db-ticker">
          <span className="db-ticker-live">
            <ThunderboltOutlined /> LIVE
          </span>
          <div className="db-ticker-track">
            {[...tickers, ...tickers].map((t, i) => (
              <span key={i} className="db-ticker-item">
                <span className="db-ticker-sym">{t.symbol}</span>
                <Sparkline
                  data={[...t.history]}
                  width={52}
                  height={22}
                  color={t.up ? "#34d399" : "#f87171"}
                />
                <span className="db-ticker-price">${t.price}</span>
                <Chg v={t.change} />
              </span>
            ))}
          </div>
        </div>

        {/* ── 2. Hero ── */}
        <section className="db-hero">
          <div className="db-hero-left">
            <div className="db-eyebrow">
              <DotChartOutlined /> AI + SMART TRADING
            </div>
            <h1 className="db-hero-title">
              Market
              <br />
              <span className="db-hero-accent">Command Center</span>
            </h1>
            <p className="db-hero-sub">
              Real-time portfolio tracking, AI signals, and market structure in
              one view.
            </p>
            <div className="db-portfolio-row">
              <div className="db-ring-wrap">
                <svg
                  viewBox="0 0 80 80"
                  width="80"
                  height="80"
                  className="db-ring-svg"
                >
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="rgba(34,211,238,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="url(#rg)"
                    strokeWidth="8"
                    strokeDasharray="201"
                    strokeDashoffset="56"
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="db-ring-pct">72%</span>
              </div>
              <div className="db-portfolio-stats">
                <div className="db-pstat">
                  <span className="db-pstat-label">Portfolio</span>
                  <span className="db-pstat-val">$248,510</span>
                  <Chg v={8.2} />
                </div>
                <div className="db-pstat">
                  <span className="db-pstat-label">P&amp;L Today</span>
                  <span className="db-pstat-val green">+$3,120</span>
                  <Chg v={1.29} />
                </div>
                <div className="db-pstat">
                  <span className="db-pstat-label">Win Rate</span>
                  <span className="db-pstat-val">72.4%</span>
                  <Chg v={3.1} />
                </div>
                <div className="db-pstat">
                  <span className="db-pstat-label">Open Pos.</span>
                  <span className="db-pstat-val">
                    3 <span className="db-pstat-active">active</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="globe-container">
              <div className="globe-glow-ring" />
              <DashboardGlobeScene />
              <div className="globe-label">
                <GlobalOutlined /> Global Markets Active
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. KPI cards ── */}
        <section className="db-kpi-row">
          {KPI_CARDS.map((c) => (
            <div key={c.label} className={`db-kpi-card db-kpi-${c.color}`}>
              <div className="db-kpi-top">
                <span className="db-kpi-label">{c.label}</span>
                <Chg v={parseFloat(c.delta)} />
              </div>
              <div className="db-kpi-val">{c.value}</div>
              <Sparkline
                data={[...c.history]}
                width={120}
                height={36}
                color={COLOR_MAP[c.color]}
              />
            </div>
          ))}
        </section>

        {/* ── 4. Positions + Sidebar ── */}
        <section className="db-main-grid">
          {/* left: positions + trades */}
          <div className="db-panel">
            <div className="db-panel-hd">
              <span className="db-panel-title">
                <RiseOutlined /> Open Positions
              </span>
              <span className="db-live-pill">
                <span className="db-live-dot" />
                LIVE
              </span>
            </div>
            <div className="db-pos-wrap">
              <table className="db-pos-table">
                <thead>
                  <tr>
                    <th>Pair</th>
                    <th>Side</th>
                    <th>Size</th>
                    <th>Entry</th>
                    <th>Current</th>
                    <th>Liq.</th>
                    <th>P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {POSITIONS.map((p) => (
                    <tr key={p.pair}>
                      <td>
                        <b className="db-sym">{p.pair}</b>
                      </td>
                      <td>
                        <span
                          className={`db-side ${p.side === "LONG" ? "long" : "short"}`}
                        >
                          {p.side === "LONG" ? (
                            <ArrowUpOutlined />
                          ) : (
                            <ArrowDownOutlined />
                          )}{" "}
                          {p.side}
                        </span>
                      </td>
                      <td className="db-soft">{p.size}</td>
                      <td className="db-soft">{p.entry}</td>
                      <td className="db-main">{p.current}</td>
                      <td className="db-soft db-liq">{p.liq}</td>
                      <td>
                        <div
                          className={`db-pnl-cell ${p.pnl.startsWith("+") ? "up" : "dn"}`}
                        >
                          {p.pnl} <span className="db-pnl-pct">{p.pct}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="db-section-lbl">
              <ClockCircleOutlined /> Recent Trades
            </div>
            <div className="db-trade-feed">
              {TRADES.map((t, i) => (
                <div key={i} className="db-trade-row">
                  <span className="db-trade-time">{t.time}</span>
                  <span className={`db-trade-badge ${t.type}`}>
                    {t.type === "signal" ? (
                      <AlertOutlined />
                    ) : t.type === "buy" ? (
                      <ArrowUpOutlined />
                    ) : (
                      <ArrowDownOutlined />
                    )}
                    {t.type.toUpperCase()}
                  </span>
                  <span className="db-trade-pair">{t.pair}</span>
                  <span className="db-soft">{t.size}</span>
                  <span
                    className={`db-trade-pnl ${t.pnl.startsWith("+") || t.pnl === "LONG" ? "up" : "dn"}`}
                  >
                    {t.pnl}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* right col */}
          <div className="db-right-col">
            {/* watchlist sparklines */}
            <div className="db-panel">
              <div className="db-panel-hd">
                <span className="db-panel-title">
                  <FireOutlined /> Watchlist
                </span>
              </div>
              <div className="db-watch-list">
                {tickers.map((t) => (
                  <div key={t.symbol} className="db-watch-row">
                    <span className="db-watch-sym">{t.symbol}</span>
                    <Sparkline
                      data={[...t.history]}
                      width={60}
                      height={24}
                      color={t.up ? "#34d399" : "#f87171"}
                    />
                    <div className="db-watch-right">
                      <span className="db-watch-price">${t.price}</span>
                      <Chg v={t.change} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* sector heat */}
            <div className="db-panel">
              <div className="db-panel-hd">
                <span className="db-panel-title">
                  <DotChartOutlined /> Sector Heat
                </span>
                <span className="db-panel-sub">Narrative flow</span>
              </div>
              <div className="db-sector-list">
                {SECTORS.map((s) => (
                  <div key={s.name} className="db-sector-row">
                    <div className="db-sector-top">
                      <span className="db-sector-name">{s.name}</span>
                      <Chg v={s.move} size="xs" />
                    </div>
                    <div className="db-sector-bar-bg">
                      <div
                        className="db-sector-bar-fill"
                        style={{ width: `${s.pct}%`, background: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="db-section-lbl" style={{ marginTop: 14 }}>
                <SafetyOutlined /> System Health
              </div>
              {[
                { label: "API Latency", val: "42ms", pct: 96, color: "" },
                { label: "Server Load", val: "18%", pct: 18, color: "green" },
                { label: "Memory", val: "58%", pct: 58, color: "yellow" },
                { label: "Cache Hit", val: "95%", pct: 95, color: "" },
              ].map((m) => (
                <div key={m.label} className="metric-item">
                  <span className="metric-label">{m.label}</span>
                  <span className="metric-value">{m.val}</span>
                  <div className="metric-bar">
                    <div
                      className={`metric-fill ${m.color}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Bottom: Watchlist table + Risk Alerts ── */}
        <section className="db-bottom-grid">
          {/* Full watchlist table (from Observatory) */}
          <div className="db-panel">
            <div className="db-panel-hd">
              <span className="db-panel-title">
                <AreaChartOutlined /> Top Coin Watchlist
              </span>
              <span className="db-live-pill">
                <span className="db-live-dot" />
                Live ranking
              </span>
            </div>
            <div className="db-pos-wrap">
              <table className="db-pos-table db-watch-table">
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Price</th>
                    <th>24h</th>
                    <th>7d</th>
                    <th>Volume</th>
                    <th>AI Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {WATCHLIST.map((w) => {
                    const live = getLive(`${w.symbol}USDT`);
                    return (
                      <tr key={w.symbol}>
                        <td>
                          <div className="db-coin-cell">
                            <span className="db-coin-badge">{w.symbol}</span>
                            <span className="db-soft">{w.name}</span>
                          </div>
                        </td>
                        <td className="db-main">
                          ${live ? live.price : w.price}
                        </td>
                        <td>
                          <Chg v={live ? live.change : w.c24} size="xs" />
                        </td>
                        <td>
                          <Chg v={w.c7d} size="xs" />
                        </td>
                        <td className="db-soft">{w.vol}</td>
                        <td>
                          <span className="db-signal-chip">{w.signal}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Alert feed (from Observatory) */}
          <div className="db-panel">
            <div className="db-panel-hd">
              <span className="db-panel-title">
                <RadarChartOutlined /> Event Timeline
              </span>
              <span className="db-panel-sub">Risk alerts</span>
            </div>
            <div className="db-alert-feed">
              {ALERTS.map((a, i) => (
                <div key={i} className="db-alert-row">
                  <SevDot s={a.severity} />
                  <div className="db-alert-body">
                    <div className="db-alert-head">
                      <strong>{a.title}</strong>
                      <span className="db-alert-time">{a.time}</span>
                    </div>
                    <p className="db-alert-detail">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
