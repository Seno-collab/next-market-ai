"use client";

import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  AreaChartOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  DotChartOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  TrophyOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import Sparkline from "@/components/ui/Sparkline";

/* ─────────────────── data ─────────────────── */

const PERF_STATS = [
  { label: "Total P&L",        value: "+$24,310", sub: "All time",      up: true,  color: "green",  history: [800,1200,950,1800,2200,1600,3100,2800,3500,3900,4200,4800] },
  { label: "Win Rate",         value: "72.4%",    sub: "Last 90 days",  up: true,  color: "cyan",   history: [60,62,65,64,68,70,69,71,72,71,73,72] },
  { label: "Avg. R:R Ratio",   value: "1 : 2.4",  sub: "Risk / Reward", up: true,  color: "blue",   history: [1.8,1.9,2.0,1.9,2.1,2.2,2.1,2.3,2.4,2.3,2.4,2.4] },
  { label: "Max Drawdown",     value: "-8.3%",    sub: "Peak to trough",up: false, color: "amber",  history: [4,5,6,5.5,7,8,7.5,8.3,7,6.5,7,8.3] },
] as const;

const MONTHLY_PNL = [
  { month:"Sep", pnl: 1820, up: true  },
  { month:"Oct", pnl: 3400, up: true  },
  { month:"Nov", pnl:-1200, up: false },
  { month:"Dec", pnl: 4100, up: true  },
  { month:"Jan", pnl: 2900, up: true  },
  { month:"Feb", pnl: 3610, up: true  },
] as const;

const ASSET_BREAKDOWN = [
  { asset:"BTC",  alloc:42, pnl:"+$9,810", winRate:76, trades:38, color:"#f59e0b" },
  { asset:"ETH",  alloc:28, pnl:"+$6,140", winRate:70, trades:24, color:"#60a5fa" },
  { asset:"SOL",  alloc:14, pnl:"+$2,980", winRate:68, trades:19, color:"#a78bfa" },
  { asset:"LINK", alloc:10, pnl:"+$1,920", winRate:74, trades:12, color:"#34d399" },
  { asset:"Other",alloc: 6, pnl:"+$1,460", winRate:65, trades:15, color:"#94a3b8" },
] as const;

const TRADE_HISTORY = [
  { date:"2026-02-20", pair:"BTC/USDT", side:"LONG",  entry:"$95,200", exit:"$97,420", pnl:"+$1,110", pct:"+2.33%", dur:"4h 12m" },
  { date:"2026-02-19", pair:"ETH/USDT", side:"LONG",  entry:"$3,870",  exit:"$4,010",  pnl:"+$700",   pct:"+3.62%", dur:"6h 05m" },
  { date:"2026-02-19", pair:"SOL/USDT", side:"SHORT", entry:"$242",    exit:"$235",    pnl:"+$140",   pct:"+2.89%", dur:"2h 48m" },
  { date:"2026-02-18", pair:"BNB/USDT", side:"LONG",  entry:"$418",    exit:"$412",    pnl:"-$120",   pct:"-1.44%", dur:"1h 30m" },
  { date:"2026-02-17", pair:"BTC/USDT", side:"SHORT", entry:"$98,100", exit:"$96,400", pnl:"+$850",   pct:"+1.73%", dur:"3h 22m" },
  { date:"2026-02-16", pair:"XRP/USDT", side:"LONG",  entry:"$1.08",   exit:"$1.12",   pnl:"+$80",    pct:"+3.70%", dur:"8h 00m" },
  { date:"2026-02-15", pair:"ETH/USDT", side:"SHORT", entry:"$4,020",  exit:"$4,100",  pnl:"-$160",   pct:"-1.99%", dur:"5h 10m" },
] as const;

const AI_INSIGHTS = [
  { icon: <TrophyOutlined />,  color:"#fbbf24", title:"Best performing pair",    body:"BTC/USDT — 76% win rate, avg +2.1% per trade over 38 trades." },
  { icon: <AlertOutlined />,   color:"#f87171", title:"Risk alert",              body:"Max drawdown reached 8.3% — consider reducing position size on SOL." },
  { icon: <DotChartOutlined />,color:"#22d3ee", title:"Optimal trading window",  body:"74% of wins occur between 06:00–12:00 UTC. Avoid 20:00–00:00 UTC." },
  { icon: <SafetyOutlined />,  color:"#34d399", title:"R:R improvement",        body:"Trades held >3h show 2.6 avg R:R vs 1.8 for trades <1h. Hold longer." },
] as const;

const COLOR_MAP: Record<string, string> = {
  green:"#34d399", cyan:"#22d3ee", blue:"#60a5fa", amber:"#fbbf24",
};

const MAX_PNL = Math.max(...MONTHLY_PNL.map((m) => Math.abs(m.pnl)));

/* ─────────────────── helpers ─────────────────── */

function Chg({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span className={`db-chg ${up ? "up" : "dn"}`}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {Math.abs(v).toFixed(2)}%
    </span>
  );
}

/* ─────────────────── page ─────────────────── */

export default function AnalyticsPage() {
  return (
    <div className="an-shell">

      {/* ── header ── */}
      <div className="an-header">
        <div>
          <div className="an-eyebrow"><AreaChartOutlined /> TRADING ANALYTICS</div>
          <h1 className="an-title">Performance Overview</h1>
          <p className="an-subtitle">
            Full breakdown of your trading history, win rates, and AI-generated insights.
          </p>
        </div>
        <div className="an-header-meta">
          <span className="an-meta-chip"><ClockCircleOutlined /> Last 90 days</span>
          <span className="an-meta-chip"><ThunderboltOutlined /> 108 trades</span>
        </div>
      </div>

      {/* ── 1. Performance stat cards ── */}
      <section className="an-kpi-row">
        {PERF_STATS.map((s) => (
          <div key={s.label} className={`an-kpi-card an-kpi-${s.color}`}>
            <div className="an-kpi-top">
              <span className="an-kpi-label">{s.label}</span>
              <span className="an-kpi-sub">{s.sub}</span>
            </div>
            <div className={`an-kpi-val ${!s.up ? "dn" : ""}`}>{s.value}</div>
            <Sparkline
              data={[...s.history]}
              width={130}
              height={38}
              color={COLOR_MAP[s.color]}
            />
          </div>
        ))}
      </section>

      {/* ── 2. Monthly P&L bar chart + Asset breakdown ── */}
      <section className="an-mid-grid">

        {/* Monthly P&L */}
        <div className="an-panel">
          <div className="an-panel-hd">
            <span className="an-panel-title"><RiseOutlined /> Monthly P&amp;L</span>
            <span className="an-panel-sub">Last 6 months</span>
          </div>
          <div className="an-bar-chart">
            {MONTHLY_PNL.map((m) => {
              const heightPct = (Math.abs(m.pnl) / MAX_PNL) * 100;
              return (
                <div key={m.month} className="an-bar-col">
                  <span className={`an-bar-label-top ${m.up ? "up" : "dn"}`}>
                    {m.up ? "+" : ""}{(m.pnl / 1000).toFixed(1)}k
                  </span>
                  <div className="an-bar-track">
                    <div
                      className={`an-bar-fill ${m.up ? "up" : "dn"}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="an-bar-month">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asset breakdown */}
        <div className="an-panel">
          <div className="an-panel-hd">
            <span className="an-panel-title"><DotChartOutlined /> Asset Breakdown</span>
            <span className="an-panel-sub">By allocation</span>
          </div>

          {/* donut-style allocation bars */}
          <div className="an-alloc-list">
            {ASSET_BREAKDOWN.map((a) => (
              <div key={a.asset} className="an-alloc-row">
                <div className="an-alloc-left">
                  <span className="an-alloc-dot" style={{ background: a.color }} />
                  <span className="an-alloc-name">{a.asset}</span>
                  <span className="an-alloc-pct-label">{a.alloc}%</span>
                </div>
                <div className="an-alloc-bar-bg">
                  <div
                    className="an-alloc-bar-fill"
                    style={{ width: `${a.alloc * 2}%`, background: a.color }}
                  />
                </div>
                <div className="an-alloc-right">
                  <span className="an-alloc-pnl up">{a.pnl}</span>
                  <span className="an-alloc-wr">{a.winRate}% WR</span>
                </div>
              </div>
            ))}
          </div>

          {/* summary row */}
          <div className="an-alloc-summary">
            <div className="an-summary-pill">
              <span>Total trades</span><strong>108</strong>
            </div>
            <div className="an-summary-pill">
              <span>Wins</span><strong className="up">78</strong>
            </div>
            <div className="an-summary-pill">
              <span>Losses</span><strong className="dn">30</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Trade history table ── */}
      <div className="an-panel">
        <div className="an-panel-hd">
          <span className="an-panel-title"><ClockCircleOutlined /> Trade History</span>
          <span className="an-live-pill">
            <span className="an-live-dot" />Recent 7 trades
          </span>
        </div>
        <div className="an-table-wrap">
          <table className="an-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pair</th>
                <th>Side</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Duration</th>
                <th>P&amp;L</th>
                <th>Return</th>
              </tr>
            </thead>
            <tbody>
              {TRADE_HISTORY.map((t, i) => (
                <tr key={i}>
                  <td className="an-soft">{t.date}</td>
                  <td><strong className="an-sym">{t.pair}</strong></td>
                  <td>
                    <span className={`an-side ${t.side === "LONG" ? "long" : "short"}`}>
                      {t.side === "LONG" ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {t.side}
                    </span>
                  </td>
                  <td className="an-soft">{t.entry}</td>
                  <td className="an-main">{t.exit}</td>
                  <td className="an-soft">{t.dur}</td>
                  <td className={t.pnl.startsWith("+") ? "an-up" : "an-dn"}>{t.pnl}</td>
                  <td><Chg v={parseFloat(t.pct)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. AI Insights ── */}
      <section className="an-insights-grid">
        <div className="an-insights-header">
          <span className="an-panel-title"><ThunderboltOutlined /> AI Insights</span>
          <span className="an-panel-sub">Powered by market analysis</span>
        </div>
        {AI_INSIGHTS.map((ins, i) => (
          <div key={i} className="an-insight-card">
            <div className="an-insight-icon" style={{ color: ins.color, borderColor: `${ins.color}33`, background: `${ins.color}12` }}>
              {ins.icon}
            </div>
            <div>
              <div className="an-insight-title">{ins.title}</div>
              <p className="an-insight-body">{ins.body}</p>
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}
