"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/* ── Live types ─────────────────────────────────────────────────────────── */
type LivePositionRow = PositionRow & {
  live_price: number;
  live_value: number;
  live_unrealized_pnl: number;
  live_unrealized_pnl_pct: number;
  live_change_24h_pct: number;
};

type LivePortfolio = {
  positions: LivePositionRow[];
  total_invested: number;
  total_live_value: number;
  total_live_unrealized_pnl: number;
  total_realized_pnl: number;
  total_fees: number;
  generated_at: string;
};

/* ── WS config ──────────────────────────────────────────────────────────── */
const WS_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_BASE_URL ??
       window.location.origin.replace(/^http/, "ws"))
    : "";

const RECONNECT_DELAY_MS = 3_000;

/* ── Formatters ─────────────────────────────────────────────────────────── */
function usd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}
function pct(n: number) { return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
function qty(n: number)  { return n.toFixed(8).replace(/\.?0+$/, ""); }
function sign(n: number) { return n >= 0 ? "+" : ""; }

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function toLive(p: PositionRow): LivePositionRow {
  return {
    ...p,
    live_price:            p.current_price,
    live_value:            p.current_value,
    live_unrealized_pnl:     p.unrealized_pnl,
    live_unrealized_pnl_pct: p.unrealized_pnl_pct,
    live_change_24h_pct:     p.price_change_24h_pct,
  };
}

function recalcTotals(positions: LivePositionRow[]) {
  let liveValue = 0;
  let livePnl   = 0;
  for (const p of positions) {
    if (p.net_qty > 0) {
      liveValue += p.live_value;
      livePnl   += p.live_unrealized_pnl;
    }
  }
  return { total_live_value: liveValue, total_live_unrealized_pnl: livePnl };
}

async function fetchPortfolioData(): Promise<PortfolioData> {
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
function PositionCard({ p, isLive }: { p: LivePositionRow; isLive: boolean }) {
  const { base, quote } = splitSymbol(p.symbol);
  const grad   = coinGrad(base);
  const tclr   = coinClr(base);
  const chgUp  = p.live_change_24h_pct >= 0;
  const pnlUp  = p.live_unrealized_pnl >= 0;

  const barW    = `${Math.min(50, Math.abs(p.live_unrealized_pnl_pct) * 0.5)}%`;
  const barSide = pnlUp ? { left: "50%" } : { right: "50%" };

  return (
    <div className="pf-card">
      {/* Header */}
      <div className="pf-card-head">
        <div className="pf-card-avatar" style={{ background: grad }}>
          {base.slice(0, 3)}
        </div>
        <div className="pf-card-name">
          <span className="pf-card-base" style={{ color: tclr }}>{base}</span>
          <span className="pf-card-quote">/{quote}</span>
        </div>
        <div className="pf-card-price-block">
          <span className="pf-card-price">
            {usd(p.live_price)}
            {isLive && <span className="pf-ws-dot" title="Live" />}
          </span>
          <span className={`pf-card-chg ${chgUp ? "pf-up" : "pf-dn"}`}>
            {chgUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {pct(p.live_change_24h_pct)}
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
          <span className="pf-card-meta-val">{usd(p.live_value)}</span>
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
            {sign(p.live_unrealized_pnl)}{usd(p.live_unrealized_pnl)}
            <span className="pf-card-pnl-pct">&nbsp;{pct(p.live_unrealized_pnl_pct)}</span>
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

      {/* Footer */}
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

/* ── Closed position row ────────────────────────────────────────────────── */
function ClosedRow({ p }: { p: PositionRow }) {
  const { base, quote } = splitSymbol(p.symbol);
  const grad   = coinGrad(base);
  const tclr   = coinClr(base);
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
  const [live, setLive]       = useState<LivePortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [wsActive, setWsActive] = useState(false);

  const mountedRef  = useRef(true);
  const wsMapRef    = useRef<Map<string, WebSocket>>(new Map());

  /* ── Close all WS connections ─────────────────────────────────────────── */
  const closeAll = useCallback(() => {
    // Clear map FIRST so onclose handlers won't attempt auto-reconnect
    wsMapRef.current.forEach((ws) => ws.close());
    wsMapRef.current.clear();
    setWsActive(false);
  }, []);

  /* ── Subscribe one symbol ────────────────────────────────────────────── */
  const subscribe = useCallback((symbol: string) => {
    if (!WS_BASE || wsMapRef.current.has(symbol)) return;

    const connect = () => {
      if (!mountedRef.current) return;

      const ws = new WebSocket(`${WS_BASE}/ws/trading?symbol=${symbol.toUpperCase()}`);
      wsMapRef.current.set(symbol, ws);

      ws.onopen = () => {
        if (mountedRef.current && wsMapRef.current.size > 0) setWsActive(true);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as {
            type: string;
            data: { last_price: string; price_change_percent: string };
          };
          if (msg.type !== "ticker_update" && msg.type !== "ticker_snapshot") return;

          const livePrice    = Number(msg.data.last_price);
          const liveChgPct   = Number(msg.data.price_change_percent);
          if (!livePrice || !Number.isFinite(livePrice)) return;

          setLive((prev) => {
            if (!prev) return prev;
            let changed = false;
            const positions = prev.positions.map((p) => {
              if (p.symbol !== symbol || p.net_qty <= 0) return p;
              const liveValue   = p.net_qty * livePrice;
              const livePnl     = liveValue - p.total_invested;
              const livePnlPct  = p.total_invested !== 0
                ? (livePnl / p.total_invested) * 100 : 0;
              changed = true;
              return {
                ...p,
                live_price:            livePrice,
                live_value:            liveValue,
                live_unrealized_pnl:     livePnl,
                live_unrealized_pnl_pct: livePnlPct,
                live_change_24h_pct:     liveChgPct,
              };
            });
            if (!changed) return prev;
            return { ...prev, positions, ...recalcTotals(positions) };
          });
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        // Symbol not in map → closeAll() removed it → intentional close, skip reconnect
        if (!wsMapRef.current.has(symbol)) return;
        wsMapRef.current.delete(symbol);
        if (wsMapRef.current.size === 0 && mountedRef.current) setWsActive(false);
        // Unexpected disconnect — reconnect after delay
        setTimeout(() => {
          if (mountedRef.current) connect();
        }, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => ws.close();
    };

    connect();
  }, []);  // setLive from useState is stable; wsMapRef/mountedRef are refs

  /* ── Fetch REST + open WS per open position ──────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPortfolioData();
      const positions = data.positions.map(toLive);
      const totals    = recalcTotals(positions);

      setLive({
        positions,
        total_invested:            data.total_invested,
        total_realized_pnl:        data.total_realized_pnl,
        total_fees:                data.total_fees,
        generated_at:              data.generated_at,
        ...totals,
      });

      // Re-subscribe: close old connections, open new ones for open positions
      closeAll();
      for (const p of data.positions) {
        if (p.net_qty > 0) subscribe(p.symbol);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [closeAll, subscribe]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      closeAll();
    };
  }, [load, closeAll]);

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const open   = live?.positions.filter((p) => p.net_qty > 0)  ?? [];
  const closed = live?.positions.filter((p) => p.net_qty === 0) ?? [];

  const totalPnL    = live
    ? live.total_live_unrealized_pnl + live.total_realized_pnl : 0;
  const totalPnLPct = live && live.total_invested > 0
    ? (live.total_live_unrealized_pnl / live.total_invested) * 100 : 0;
  const pnlUp = totalPnL >= 0;

  const snapshotAt = live
    ? new Date(live.generated_at).toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : null;

  return (
    <div className="pf-shell">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="pf-hero">
        <div className="pf-hero-top">
          <div>
            <div className="pf-eyebrow">
              <WalletOutlined /> PORTFOLIO
              {wsActive && (
                <span className="pf-live-badge">
                  <span className="pf-ws-dot pf-ws-dot-inline" />
                  LIVE
                </span>
              )}
            </div>
            <div className="pf-hero-value-row">
              {live ? (
                <>
                  <span className="pf-hero-amount">{usd(live.total_live_value)}</span>
                  <span className={`pf-hero-pnl ${pnlUp ? "pf-up" : "pf-dn"}`}>
                    {pnlUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {sign(live.total_live_unrealized_pnl)}{usd(live.total_live_unrealized_pnl)}
                    <span className="pf-hero-pnl-pct">({pct(totalPnLPct)})</span>
                  </span>
                </>
              ) : (
                <span className="pf-hero-amount">—</span>
              )}
            </div>
            {snapshotAt && (
              <p className="pf-hero-sub">Snapshot {snapshotAt}</p>
            )}
          </div>
          <button
            className="pf-refresh-btn"
            onClick={() => void load()}
            disabled={loading}
            title="Sync positions"
          >
            <ReloadOutlined className={loading ? "pf-spin" : ""} />
            Sync
          </button>
        </div>

        {/* Invested vs Value progress bar */}
        {live && live.total_invested > 0 && (
          <div className="pf-hero-bar-wrap">
            <div className="pf-hero-bar-track">
              <div
                className={`pf-hero-bar-fill ${pnlUp ? "pf-hero-bar-up" : "pf-hero-bar-dn"}`}
                style={{
                  width: `${Math.min(100, (live.total_live_value / (live.total_invested * 1.5)) * 100)}%`,
                }}
              />
              <div
                className="pf-hero-bar-cost"
                style={{
                  left: `${Math.min(100, (live.total_invested / (live.total_invested * 1.5)) * 100)}%`,
                }}
              />
            </div>
            <div className="pf-hero-bar-labels">
              <span>0</span>
              <span className="pf-hero-bar-lbl-cost">Cost {usd(live.total_invested)}</span>
              <span>+50%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && <div className="pf-error">Failed to load portfolio: {error}</div>}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && !live && (
        <div className="pf-loading"><Spin size="large" /><span>Loading portfolio…</span></div>
      )}

      {live && (
        <>
          {/* ── Summary tiles ───────────────────────────────────────── */}
          <div className="pf-tiles">
            <Tile label="Total Invested"  value={usd(live.total_invested)} highlight />
            <Tile label="Current Value"   value={usd(live.total_live_value)} highlight />
            <Tile
              label="Unrealized P&L"
              value={`${sign(live.total_live_unrealized_pnl)}${usd(live.total_live_unrealized_pnl)}`}
              sub={pct(totalPnLPct)}
              positive={live.total_live_unrealized_pnl >= 0}
            />
            <Tile
              label="Realized P&L"
              value={`${sign(live.total_realized_pnl)}${usd(live.total_realized_pnl)}`}
              positive={live.total_realized_pnl >= 0}
            />
            <Tile
              label="Total P&L"
              value={`${sign(totalPnL)}${usd(totalPnL)}`}
              positive={totalPnL >= 0}
              highlight
            />
            <Tile label="Total Fees" value={usd(live.total_fees)} />
          </div>

          {/* ── Open positions ──────────────────────────────────────── */}
          {open.length > 0 && (
            <section className="pf-section">
              <div className="pf-section-hd">
                <span className="pf-section-title">Open Positions</span>
                <span className="pf-section-badge">{open.length}</span>
              </div>
              <div className="pf-cards-grid">
                {open.map((p) => (
                  <PositionCard key={p.symbol} p={p} isLive={wsActive} />
                ))}
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
          {live.positions.length === 0 && (
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
