"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  DotChartOutlined,
  FallOutlined,
  LineChartOutlined,
  MinusOutlined,
  ReloadOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Segmented, Spin, Typography } from "antd";
import { analysisApi } from "@/lib/api/analysis";
import SymbolSearch from "@/features/trading/components/SymbolSearch";
import type { AnalysisResult, DailyReport, Signal, Strength } from "@/types/trading";

const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;
type Interval = (typeof INTERVALS)[number];

const SIG_CLR: Record<Signal, string> = {
  BUY: "#34d399", SELL: "#f87171", HOLD: "#94a3b8",
};
const SIG_BG: Record<Signal, string> = {
  BUY:  "rgba(52,211,153,0.07)",
  SELL: "rgba(248,113,113,0.07)",
  HOLD: "rgba(148,163,184,0.05)",
};
const SIG_BORDER: Record<Signal, string> = {
  BUY:  "rgba(52,211,153,0.25)",
  SELL: "rgba(248,113,113,0.25)",
  HOLD: "rgba(148,163,184,0.15)",
};
const STRENGTH_DOTS: Record<Strength, string> = {
  STRONG: "●●●", MODERATE: "●●○", WEAK: "●○○",
};

function tone(val: string, buy: string, sell: string): "buy" | "sell" | "hold" {
  return val === buy ? "buy" : val === sell ? "sell" : "hold";
}

function Chip({ label, t }: { label: string; t: "buy" | "sell" | "hold" }) {
  return <span className={`al-chip al-chip-${t}`}>{label}</span>;
}

function fmtP(v: string | number, dec = 2) {
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: dec });
}

export default function AnalysisPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setIv]   = useState<Interval>("1h");
  const [analysis, setA]    = useState<AnalysisResult | null>(null);
  const [report, setR]      = useState<DailyReport | null>(null);
  const [loadingA, setLA]   = useState(false);
  const [loadingR, setLR]   = useState(false);
  const [errorA, setEA]     = useState<string | null>(null);
  const [errorR, setER]     = useState<string | null>(null);

  const aRef    = useRef<AbortController | null>(null);
  const rRef    = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAnalysis = useCallback(async () => {
    aRef.current?.abort();
    aRef.current = new AbortController();
    setLA(true); setEA(null);
    try { setA(await analysisApi.getAnalysis(symbol, interval)); }
    catch (e) { if ((e as Error).name !== "AbortError") setEA((e as Error).message); }
    finally { setLA(false); }
  }, [symbol, interval]);

  const fetchReport = useCallback(async () => {
    rRef.current?.abort();
    rRef.current = new AbortController();
    setLR(true); setER(null);
    try { setR(await analysisApi.getDailyReport(symbol, interval)); }
    catch (e) { if ((e as Error).name !== "AbortError") setER((e as Error).message); }
    finally { setLR(false); }
  }, [symbol, interval]);

  useEffect(() => {
    void fetchAnalysis();
    void fetchReport();
    pollRef.current = setInterval(() => void fetchAnalysis(), 30_000);
    return () => {
      aRef.current?.abort();
      rRef.current?.abort();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAnalysis, fetchReport]);

  const scoreClr = analysis
    ? analysis.score >= 20 ? "#34d399" : analysis.score <= -20 ? "#f87171" : "#94a3b8"
    : "#94a3b8";

  return (
    <div className="al-shell">

      {/* ── Toolbar ── */}
      <div className="al-toolbar">
        <div className="al-toolbar-left">
          <div className="al-eyebrow"><ThunderboltOutlined /> AI ANALYSIS</div>
          <h1 className="al-title">Technical Analysis</h1>
        </div>
        <div className="al-toolbar-right">
          <SymbolSearch value={symbol} onChange={setSymbol} />
          <div className="al-iv-scroll">
            <Segmented
              options={INTERVALS.map((i) => ({ label: i.toUpperCase(), value: i }))}
              value={interval}
              onChange={(v) => setIv(v as Interval)}
            />
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { void fetchAnalysis(); void fetchReport(); }}
            loading={loadingA}
          />
        </div>
      </div>

      {loadingA && !analysis && <div className="al-center-spin"><Spin size="large" /></div>}
      {errorA && (
        <div className="al-banner-err">
          <Typography.Text type="danger">{errorA}</Typography.Text>
        </div>
      )}

      {analysis && (
        <>
          {/* ═══ COMMAND CENTER ═══ */}
          <div
            className="al-command"
            style={{
              background: `linear-gradient(135deg, rgba(6,14,26,0.9) 0%, ${SIG_BG[analysis.signal]} 100%)`,
              borderColor: SIG_BORDER[analysis.signal],
            }}
          >
            {/* Signal column */}
            <div className="al-cmd-sig">
              <div className="al-sig-icon" style={{ color: SIG_CLR[analysis.signal], borderColor: SIG_BORDER[analysis.signal], background: SIG_BG[analysis.signal] }}>
                {analysis.signal === "BUY"
                  ? <ArrowUpOutlined />
                  : analysis.signal === "SELL"
                  ? <ArrowDownOutlined />
                  : <MinusOutlined />}
              </div>
              <div className="al-sig-label" style={{ color: SIG_CLR[analysis.signal] }}>
                {analysis.signal}
              </div>
              <div className="al-sig-strength">
                <span className="al-dots" style={{ color: SIG_CLR[analysis.signal] }}>
                  {STRENGTH_DOTS[analysis.strength]}
                </span>
                <span className="al-strength-txt">{analysis.strength}</span>
              </div>
            </div>

            {/* Score column */}
            <div className="al-cmd-score">
              <div className="al-score-num-row">
                <span className="al-score-big" style={{ color: scoreClr }}>
                  {analysis.score > 0 ? "+" : ""}{analysis.score}
                </span>
                <span className="al-score-denom">/ 100</span>
              </div>

              {/* Segmented zone bar */}
              <div className="al-score-meter">
                <div className="al-sm-sell" />
                <div className="al-sm-hold" />
                <div className="al-sm-buy" />
                <div
                  className="al-sm-needle"
                  style={{
                    left: `calc(${(analysis.score + 100) / 2}% - 3px)`,
                    background: scoreClr,
                    boxShadow: `0 0 8px ${scoreClr}`,
                  }}
                />
              </div>
              <div className="al-score-axis">
                <span>SELL −100</span>
                <span>HOLD 0</span>
                <span>BUY +100</span>
              </div>
            </div>

            {/* Summary column */}
            <div className="al-cmd-summary">
              <div className="al-summary-hd"><DotChartOutlined /> AI Summary</div>
              <p className="al-summary-body">{analysis.summary}</p>
            </div>
          </div>

          {/* ═══ INDICATOR GRID ═══ */}
          <div className="al-ind-grid">

            {/* RSI */}
            <div className="al-ic" style={{ "--ic-accent": analysis.indicators.rsi.signal === "OVERSOLD" ? "#34d399" : analysis.indicators.rsi.signal === "OVERBOUGHT" ? "#f87171" : "#94a3b8" } as React.CSSProperties}>
              <div className="al-ic-hd">
                <span className="al-ic-name">RSI</span>
                <Chip label={analysis.indicators.rsi.signal} t={tone(analysis.indicators.rsi.signal, "OVERSOLD", "OVERBOUGHT")} />
              </div>
              <div className="al-ic-big">{analysis.indicators.rsi.value.toFixed(1)}</div>
              <div className="al-rsi-wrap">
                <div className="al-rsi-track">
                  <div className="al-rsi-z-sell" />
                  <div className="al-rsi-z-mid" />
                  <div className="al-rsi-z-buy" />
                  <div className="al-rsi-needle" style={{ left: `${analysis.indicators.rsi.value}%` }} />
                </div>
                <div className="al-rsi-axis">
                  <span>0</span><span>30</span><span>70</span><span>100</span>
                </div>
              </div>
            </div>

            {/* MACD */}
            <div className="al-ic" style={{ "--ic-accent": analysis.indicators.macd.trend === "BULLISH" ? "#34d399" : "#f87171" } as React.CSSProperties}>
              <div className="al-ic-hd">
                <span className="al-ic-name">MACD</span>
                <Chip label={analysis.indicators.macd.trend} t={analysis.indicators.macd.trend === "BULLISH" ? "buy" : "sell"} />
              </div>
              <div className="al-ic-rows">
                <div className="al-ic-row"><span className="al-ic-k">MACD</span><span className="al-ic-v">{analysis.indicators.macd.macd.toFixed(2)}</span></div>
                <div className="al-ic-row"><span className="al-ic-k">Signal</span><span className="al-ic-v">{analysis.indicators.macd.signal.toFixed(2)}</span></div>
                <div className="al-ic-row">
                  <span className="al-ic-k">Histogram</span>
                  <span className={`al-ic-v ${analysis.indicators.macd.histogram >= 0 ? "al-up" : "al-dn"}`}>
                    {analysis.indicators.macd.histogram >= 0 ? "+" : ""}{analysis.indicators.macd.histogram.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* EMA */}
            <div className="al-ic" style={{ "--ic-accent": analysis.indicators.ema.trend === "BULLISH" ? "#34d399" : "#f87171" } as React.CSSProperties}>
              <div className="al-ic-hd">
                <span className="al-ic-name">EMA Cross</span>
                <Chip label={analysis.indicators.ema.trend} t={analysis.indicators.ema.trend === "BULLISH" ? "buy" : "sell"} />
              </div>
              <div className="al-ic-rows">
                <div className="al-ic-row"><span className="al-ic-k">EMA 20</span><span className="al-ic-v al-up">{fmtP(analysis.indicators.ema.ema_20)}</span></div>
                <div className="al-ic-row"><span className="al-ic-k">EMA 50</span><span className="al-ic-v">{fmtP(analysis.indicators.ema.ema_50)}</span></div>
                <div className="al-ic-row">
                  <span className="al-ic-k">Spread</span>
                  <span className={`al-ic-v ${analysis.indicators.ema.trend === "BULLISH" ? "al-up" : "al-dn"}`}>
                    {analysis.indicators.ema.trend === "BULLISH" ? "▲ " : "▼ "}
                    {Math.abs(analysis.indicators.ema.ema_20 - analysis.indicators.ema.ema_50).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bollinger */}
            <div className="al-ic" style={{ "--ic-accent": analysis.indicators.bollinger.signal === "OVERSOLD" ? "#34d399" : analysis.indicators.bollinger.signal === "OVERBOUGHT" ? "#f87171" : "#94a3b8" } as React.CSSProperties}>
              <div className="al-ic-hd">
                <span className="al-ic-name">Bollinger Bands</span>
                <Chip label={analysis.indicators.bollinger.signal} t={tone(analysis.indicators.bollinger.signal, "OVERSOLD", "OVERBOUGHT")} />
              </div>
              <div className="al-bb">
                <div className="al-bb-row al-bb-upper"><span className="al-ic-k">Upper ↑</span><span className="al-ic-v al-dn">{fmtP(analysis.indicators.bollinger.upper)}</span></div>
                <div className="al-bb-divider" />
                <div className="al-bb-row al-bb-mid"><span className="al-ic-k">Middle</span><span className="al-ic-v">{fmtP(analysis.indicators.bollinger.middle)}</span></div>
                <div className="al-bb-divider" />
                <div className="al-bb-row al-bb-lower"><span className="al-ic-k">Lower ↓</span><span className="al-ic-v al-up">{fmtP(analysis.indicators.bollinger.lower)}</span></div>
              </div>
              <div className="al-bb-width-row">
                <span className="al-ic-k">Band Width</span>
                <span className="al-ic-v">{fmtP(analysis.indicators.bollinger.upper - analysis.indicators.bollinger.lower)}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="al-ic" style={{ "--ic-accent": analysis.indicators.volume.trend === "HIGH" ? "#34d399" : analysis.indicators.volume.trend === "LOW" ? "#f87171" : "#94a3b8" } as React.CSSProperties}>
              <div className="al-ic-hd">
                <span className="al-ic-name">Volume</span>
                <Chip label={analysis.indicators.volume.trend} t={tone(analysis.indicators.volume.trend, "HIGH", "LOW")} />
              </div>
              <div className="al-ic-big">{Number(analysis.indicators.volume.current).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}</div>
              <div className="al-vol-compare">
                <div className="al-vol-row">
                  <span className="al-ic-k">Current</span>
                  <div className="al-vol-bar-bg">
                    <div className="al-vol-bar-fg" style={{
                      width: `${Math.min(100, (analysis.indicators.volume.current / Math.max(analysis.indicators.volume.current, analysis.indicators.volume.average)) * 100)}%`,
                      background: analysis.indicators.volume.trend === "HIGH" ? "#34d399" : analysis.indicators.volume.trend === "LOW" ? "#f87171" : "#94a3b8",
                    }} />
                  </div>
                </div>
                <div className="al-vol-row">
                  <span className="al-ic-k">Average</span>
                  <div className="al-vol-bar-bg">
                    <div className="al-vol-bar-fg al-vol-avg" style={{
                      width: `${Math.min(100, (analysis.indicators.volume.average / Math.max(analysis.indicators.volume.current, analysis.indicators.volume.average)) * 100)}%`,
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Best Hours */}
            <div className="al-ic" style={{ "--ic-accent": "#22d3ee" } as React.CSSProperties}>
              <div className="al-ic-hd">
                <span className="al-ic-name">Peak Hours</span>
                <ClockCircleOutlined style={{ color: "#22d3ee" }} />
              </div>
              <div className="al-hours">
                {analysis.best_hours.slice(0, 3).map((h, i) => (
                  <div key={h} className="al-hr">
                    <span className="al-hr-n">{i + 1}</span>
                    <span className="al-hr-t">{String(h).padStart(2, "0")}:00 UTC</span>
                    <div className="al-hr-bg">
                      <div className="al-hr-fill" style={{ width: `${[100, 72, 48][i]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ SUPPORT & RESISTANCE ═══ */}
          <div className="al-sr-row">
            <div className="al-panel al-support-panel">
              <div className="al-panel-hd">
                <span className="al-panel-title"><RiseOutlined /> Support Levels</span>
                <span className="al-panel-sub">Price floors</span>
              </div>
              <div className="al-levels">
                {analysis.support.map((lvl, i) => (
                  <div key={i} className="al-lvl al-lvl-s">
                    <span className="al-lvl-tag al-lvl-tag-s">S{i + 1}</span>
                    <div className="al-lvl-line al-lvl-line-s" />
                    <span className="al-lvl-price">${fmtP(lvl)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="al-panel al-resist-panel">
              <div className="al-panel-hd">
                <span className="al-panel-title"><FallOutlined /> Resistance Levels</span>
                <span className="al-panel-sub">Price ceilings</span>
              </div>
              <div className="al-levels">
                {analysis.resistance.map((lvl, i) => (
                  <div key={i} className="al-lvl al-lvl-r">
                    <span className="al-lvl-tag al-lvl-tag-r">R{i + 1}</span>
                    <div className="al-lvl-line al-lvl-line-r" />
                    <span className="al-lvl-price">${fmtP(lvl)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ DAILY REPORT ═══ */}
      <div className="al-panel">
        <div className="al-panel-hd">
          <span className="al-panel-title"><LineChartOutlined /> Daily Report</span>
          <div className="al-panel-meta">
            {report && (
              <span className="al-live-pill">
                <span className="al-live-dot" />{report.date}
              </span>
            )}
            {loadingR && <Spin size="small" />}
          </div>
        </div>

        {errorR && (
          <div className="al-banner-err" style={{ marginBottom: 16 }}>
            <Typography.Text type="danger">{errorR}</Typography.Text>
          </div>
        )}

        {!report && !loadingR && !errorR && (
          <div className="al-empty-state">
            <AlertOutlined className="al-empty-icon" />
            <p>No report available</p>
          </div>
        )}

        {report && (
          <>
            {/* Ticker row */}
            <div className="al-ticker-row">
              {[
                { label: "Last Price", val: `$${fmtP(report.ticker.last_price)}`, cls: "" },
                {
                  label: "24h Change",
                  val: `${Number(report.ticker.price_change_percent) >= 0 ? "+" : ""}${Number(report.ticker.price_change_percent).toFixed(2)}%`,
                  cls: Number(report.ticker.price_change_percent) >= 0 ? "al-up" : "al-dn",
                },
                { label: "High",   val: `$${fmtP(report.ticker.high_price)}`,  cls: "al-up" },
                { label: "Low",    val: `$${fmtP(report.ticker.low_price)}`,   cls: "al-dn" },
                { label: "Open",   val: `$${fmtP(report.ticker.open_price)}`,  cls: "" },
                { label: "Volume", val: Number(report.ticker.volume).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 }), cls: "" },
              ].map((s) => (
                <div key={s.label} className="al-tc">
                  <span className="al-tc-label">{s.label}</span>
                  <span className={`al-tc-val ${s.cls}`}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Candles table */}
            {report.candles.length > 0 && (
              <div className="al-tbl-wrap">
                <table className="al-tbl">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Open</th>
                      <th>High</th>
                      <th>Low</th>
                      <th>Close</th>
                      <th>Volume</th>
                      <th>Δ%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...report.candles].reverse().slice(0, 24).map((c) => {
                      const pct = ((Number(c.close) - Number(c.open)) / Number(c.open)) * 100;
                      const up  = pct >= 0;
                      return (
                        <tr key={c.open_time} className="al-trow">
                          <td className="al-td-dim">
                            {new Date(c.open_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          </td>
                          <td className="al-td-num">{fmtP(c.open)}</td>
                          <td className="al-up">{fmtP(c.high)}</td>
                          <td className="al-dn">{fmtP(c.low)}</td>
                          <td className={`al-td-num ${up ? "al-up" : "al-dn"}`}>{fmtP(c.close)}</td>
                          <td className="al-td-dim">{Number(c.volume).toLocaleString("en-US", { maximumFractionDigits: 1 })}</td>
                          <td className={up ? "al-up" : "al-dn"}>{up ? "+" : ""}{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
