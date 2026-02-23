"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  LineChartOutlined,
  ReloadOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Spin } from "antd";
import type { PortfolioData, PositionRow } from "@/types/trading";

/* ── Formatters ─────────────────────────────────────────────────────────── */
function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
function qty(n: number)  { return n.toFixed(8).replace(/\.?0+$/, ""); }
function sign(n: number) { return n >= 0 ? "+" : ""; }

async function fetchPortfolio(): Promise<PortfolioData> {
  const res = await fetch("/api/trading/portfolio", { cache: "no-store" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as { data: PortfolioData }).data;
}

/* ── Coin avatar colour palette ─────────────────────────────────────────── */
const LETTER_COLORS: Record<string, [string, string]> = {
  A: ["#f59e0b","#fbbf24"], B: ["#3b82f6","#60a5fa"],
  C: ["#8b5cf6","#a78bfa"], D: ["#ec4899","#f472b6"],
  E: ["#10b981","#34d399"], F: ["#f97316","#fb923c"],
  G: ["#6366f1","#818cf8"], H: ["#14b8a6","#2dd4bf"],
  I: ["#ef4444","#f87171"], J: ["#a855f7","#c084fc"],
  K: ["#06b6d4","#22d3ee"], L: ["#84cc16","#a3e635"],
  M: ["#f43f5e","#fb7185"], N: ["#22c55e","#4ade80"],
  O: ["#fb923c","#fdba74"], P: ["#818cf8","#a5b4fc"],
  Q: ["#2dd4bf","#5eead4"], R: ["#fbbf24","#fcd34d"],
  S: ["#34d399","#6ee7b7"], T: ["#60a5fa","#93c5fd"],
  U: ["#c084fc","#d8b4fe"], V: ["#4ade80","#86efac"],
  W: ["#fb7185","#fda4af"], X: ["#38bdf8","#7dd3fc"],
  Y: ["#a3e635","#bef264"], Z: ["#e879f9","#f0abfc"],
};
function coinGrad(base: string) {
  const [a, b] = LETTER_COLORS[base[0]?.toUpperCase() ?? ""] ?? ["#475569","#64748b"];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
function coinClr(base: string) {
  return LETTER_COLORS[base[0]?.toUpperCase() ?? ""]?.[0] ?? "#94a3b8";
}
function splitSymbol(symbol: string) {
  const q = ["USDT","USDC","BUSD","BTC","ETH","BNB"].find((x) => symbol.endsWith(x));
  return { base: q ? symbol.slice(0, -q.length) : symbol, quote: q ?? "" };
}

/* ── Open position card ─────────────────────────────────────────────────── */
function PositionCard({ p }: { p: PositionRow }) {
  const { base, quote } = splitSymbol(p.symbol);
  const grad   = coinGrad(base);
  const tclr   = coinClr(base);
  const chgUp  = p.price_change_24h_pct >= 0;
  const pnlUp  = p.unrealized_pnl >= 0;

  /* centre-origin P&L bar: 50% = break-even, ±1% → ±0.5% fill, capped ±50 */
  const barW  = `${Math.min(50, Math.abs(p.unrealized_pnl_pct) * 0.5)}%`;
  const barSide = pnlUp ? { left: "50%" } : { right: "50%" };

  return (
    <div className="pf-card">
      {/* Header: avatar + symbol + live price */}
      <div className="pf-card-head">
        <div className="pf-card-avatar" style={{ background: grad }}>
          {base.slice(0, 3)}
        </div>
        <div className="pf-card-name">
          <span className="pf-card-base" style={{ color: tclr }}>{base}</span>
          <span className="pf-card-quote">/{quote}</span>
        </div>
        <div className="pf-card-price-block">
          <span className="pf-card-price">{usd(p.current_price)}</span>
          <span className={`pf-card-chg ${chgUp ? "pf-up" : "pf-dn"}`}>
            {chgUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {pct(p.price_change_24h_pct)}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="pf-card-meta">
        <div className="pf-card-meta-item">
          <span className="pf-card-meta-label">Net Qty</span>
          <span className="pf-card-meta-val">{qty(p.net_qty)}</span>
        </div>
        <div className="pf-card-meta-item">
          <span className="pf-card-meta-label">Avg Buy</span>
          <span className="pf-card-meta-val">{usd(p.avg_buy_price)}</span>
        </div>
        <div className="pf-card-meta-item">
          <span className="pf-card-meta-label">Value</span>
          <span className="pf-card-meta-val">{usd(p.current_value)}</span>
        </div>
        <div className="pf-card-meta-item">
          <span className="pf-card-meta-label">Invested</span>
          <span className="pf-card-meta-val">{usd(p.total_invested)}</span>
        </div>
      </div>

      {/* Unrealized P&L + centre bar */}
      <div className={`pf-card-pnl ${pnlUp ? "pf-card-pnl-up" : "pf-card-pnl-dn"}`}>
        <div className="pf-card-pnl-row">
          <span className="pf-card-pnl-label">Unrealized P&amp;L</span>
          <span className={`pf-card-pnl-val ${pnlUp ? "pf-up" : "pf-dn"}`}>
            {sign(p.unrealized_pnl)}{usd(p.unrealized_pnl)}
            <span className="pf-card-pnl-pct">&nbsp;{pct(p.unrealized_pnl_pct)}</span>
          </span>
        </div>
        <div className="pf-card-bar-track">
          <div className="pf-card-bar-mid" />
          <div
            className={`pf-card-bar-fill ${pnlUp ? "pf-card-bar-up" : "pf-card-bar-dn"}`}
            style={{ width: barW, ...barSide }}
          />
        </div>
      </div>

      {/* Footer: realized + fees + chart link */}
      <div className="pf-card-foot">
        <div className="pf-card-foot-left">
          {p.realized_pnl !== 0 && (
            <span className={`pf-card-realized ${p.realized_pnl >= 0 ? "pf-up" : "pf-dn"}`}>
              Realized {sign(p.realized_pnl)}{usd(p.realized_pnl)}
            </span>
          )}
          {p.total_fees > 0 && (
            <span className="pf-card-fees">Fees {usd(p.total_fees)}</span>
          )}
        </div>
        <Link href={`/admin/trading?symbol=${p.symbol}`} className="pf-card-chart-btn">
          <LineChartOutlined /> Chart
        </Link>
      </div>
    </div>
  );
}

/* ── Closed position row (compact table) ────────────────────────────────── */
function ClosedRow({ p }: { p: PositionRow }) {
  const { base, quote } = splitSymbol(p.symbol);
  const grad  = coinGrad(base);
  const tclr  = coinClr(base);
  const rpnlUp = p.realized_pnl >= 0;

  return (
    <div className="pf-closed-row">
      <div className="pf-closed-sym">
        <div className="pf-closed-avatar" style={{ background: grad }}>
          {base.slice(0, 2)}
        </div>
        <span className="pf-closed-base" style={{ color: tclr }}>{base}</span>
        <span className="pf-closed-quote">/{quote}</span>
      </div>
      <span className="pf-closed-num">{usd(p.avg_buy_price)}</span>
      <span className={`pf-closed-num ${rpnlUp ? "pf-up" : "pf-dn"}`}>
        {sign(p.realized_pnl)}{usd(p.realized_pnl)}
      </span>
      <span className="pf-closed-num pf-closed-fees">{usd(p.total_fees)}</span>
    </div>
  );
}

/* ── Summary stat tile ──────────────────────────────────────────────────── */
function Tile({
  label, value, sub, positive, highlight,
}: {
  label: string; value: string; sub?: string; positive?: boolean; highlight?: boolean;
}) {
  const vCls = positive === undefined ? "pf-tile-neutral"
    : positive ? "pf-up" : "pf-dn";
  return (
    <div className={`pf-tile${highlight ? " pf-tile-hl" : ""}`}>
      <span className="pf-tile-label">{label}</span>
      <span className={`pf-tile-value ${vCls}`}>{value}</span>
      {sub && <span className={`pf-tile-sub ${vCls}`}>{sub}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function PortfolioPage() {
  const [data, setData]       = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchPortfolio();
      setData(d); setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  /* derived */
  const totalPnL    = data ? data.total_unrealized_pnl + data.total_realized_pnl : 0;
  const totalPnLPct = data && data.total_invested > 0
    ? (data.total_unrealized_pnl / data.total_invested) * 100 : 0;
  const open   = data?.positions.filter((p) => p.net_qty > 0) ?? [];
  const closed = data?.positions.filter((p) => p.net_qty === 0) ?? [];
  const pnlUp  = totalPnL >= 0;
  const updatedAt = data
    ? new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="pf-shell">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="pf-hero">
        <div className="pf-hero-top">
          <div>
            <div className="pf-eyebrow"><WalletOutlined /> PORTFOLIO</div>
            <div className="pf-hero-value-row">
              {data ? (
                <>
                  <span className="pf-hero-amount">{usd(data.total_current_value)}</span>
                  <span className={`pf-hero-pnl ${pnlUp ? "pf-up" : "pf-dn"}`}>
                    {pnlUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {sign(data.total_unrealized_pnl)}{usd(data.total_unrealized_pnl)}
                    <span className="pf-hero-pnl-pct">({pct(totalPnLPct)})</span>
                  </span>
                </>
              ) : (
                <span className="pf-hero-amount">—</span>
              )}
            </div>
            {updatedAt && <p className="pf-hero-sub">Updated {updatedAt}</p>}
          </div>
          <button
            className="pf-refresh-btn"
            onClick={() => void load()}
            disabled={loading}
            title="Refresh"
          >
            <ReloadOutlined className={loading ? "pf-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Invested vs Value progress bar */}
        {data && data.total_invested > 0 && (
          <div className="pf-hero-bar-wrap">
            <div className="pf-hero-bar-track">
              <div
                className={`pf-hero-bar-fill ${pnlUp ? "pf-hero-bar-up" : "pf-hero-bar-dn"}`}
                style={{
                  width: `${Math.min(100, (data.total_current_value / (data.total_invested * 1.5)) * 100)}%`,
                }}
              />
              <div
                className="pf-hero-bar-cost"
                style={{
                  left: `${Math.min(100, (data.total_invested / (data.total_invested * 1.5)) * 100)}%`,
                }}
              />
            </div>
            <div className="pf-hero-bar-labels">
              <span>0</span>
              <span className="pf-hero-bar-lbl-cost">Cost {usd(data.total_invested)}</span>
              <span>+50%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && <div className="pf-error">Failed to load portfolio: {error}</div>}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="pf-loading"><Spin size="large" /><span>Loading portfolio…</span></div>
      )}

      {data && (
        <>
          {/* ── Summary tiles ───────────────────────────────────────── */}
          <div className="pf-tiles">
            <Tile label="Total Invested"  value={usd(data.total_invested)}   highlight />
            <Tile label="Current Value"   value={usd(data.total_current_value)} highlight />
            <Tile
              label="Unrealized P&L"
              value={`${sign(data.total_unrealized_pnl)}${usd(data.total_unrealized_pnl)}`}
              sub={pct(totalPnLPct)}
              positive={data.total_unrealized_pnl >= 0}
            />
            <Tile
              label="Realized P&L"
              value={`${sign(data.total_realized_pnl)}${usd(data.total_realized_pnl)}`}
              positive={data.total_realized_pnl >= 0}
            />
            <Tile
              label="Total P&L"
              value={`${sign(totalPnL)}${usd(totalPnL)}`}
              positive={totalPnL >= 0}
              highlight
            />
            <Tile label="Total Fees" value={usd(data.total_fees)} />
          </div>

          {/* ── Open positions ──────────────────────────────────────── */}
          {open.length > 0 && (
            <section className="pf-section">
              <div className="pf-section-hd">
                <span className="pf-section-title">Open Positions</span>
                <span className="pf-section-badge">{open.length}</span>
              </div>
              <div className="pf-cards-grid">
                {open.map((p) => <PositionCard key={p.symbol} p={p} />)}
              </div>
            </section>
          )}

          {/* ── Closed positions ────────────────────────────────────── */}
          {closed.length > 0 && (
            <section className="pf-section">
              <div className="pf-section-hd">
                <span className="pf-section-title">Closed Positions</span>
                <span className="pf-section-badge pf-section-badge-muted">{closed.length}</span>
              </div>
              <div className="pf-closed-table">
                <div className="pf-closed-hd">
                  <span>Symbol</span>
                  <span>Avg Buy</span>
                  <span>Realized P&L</span>
                  <span>Fees</span>
                </div>
                {closed.map((p) => <ClosedRow key={p.symbol} p={p} />)}
              </div>
            </section>
          )}

          {/* ── Empty ───────────────────────────────────────────────── */}
          {data.positions.length === 0 && (
            <div className="pf-empty">
              <div className="pf-empty-icon"><WalletOutlined /></div>
              <p className="pf-empty-title">No positions yet</p>
              <p className="pf-empty-sub">Add transactions to track your portfolio P&L.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
