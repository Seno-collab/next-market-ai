"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BulbOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  RobotOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Modal, Segmented, Spin, Tag, Typography, message } from "antd";
import { coinAiApi } from "@/lib/api/coinai";
import SymbolSearch from "@/features/trading/components/SymbolSearch";
import type { CoinAISignal, TrainReport, WatchlistItem } from "@/types/trading";

const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;
type Interval = (typeof INTERVALS)[number];

const SIG_CLR: Record<CoinAISignal, string> = {
  BUY: "#34d399", SELL: "#f87171", HOLD: "#94a3b8",
};
const SIG_BG: Record<CoinAISignal, string> = {
  BUY:  "rgba(52,211,153,0.1)",
  SELL: "rgba(248,113,113,0.1)",
  HOLD: "rgba(148,163,184,0.07)",
};

function SignalBadge({ s }: { s: CoinAISignal }) {
  return (
    <span className={`ci-badge ci-badge-${s.toLowerCase()}`}>{s}</span>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="ci-stat" style={{ "--ci-stat-accent": accent } as React.CSSProperties}>
      <span className="ci-stat-label">{label}</span>
      <span className="ci-stat-val">{value}</span>
    </div>
  );
}

export default function CoinAIPage() {
  const [watchlist, setWatchlist]       = useState<WatchlistItem[]>([]);
  const [loadingWL, setLoadingWL]       = useState(false);
  const [errorWL, setErrorWL]           = useState<string | null>(null);

  const [report, setReport]             = useState<TrainReport | null>(null);
  const [loadingTrain, setLoadingTrain] = useState(false);
  const [errorTrain, setErrorTrain]     = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  const [addOpen, setAddOpen]           = useState(false);
  const [addSymbol, setAddSymbol]       = useState("BTCUSDT");
  const [addInterval, setAddInterval]   = useState<Interval>("1h");
  const [addLoading, setAddLoading]     = useState(false);

  const [messageApi, contextHolder]     = message.useMessage();
  const trainRef = useRef<AbortController | null>(null);
  const safeWatchlist = Array.isArray(watchlist) ? watchlist : [];

  // ── Load watchlist ─────────────────────────────────────────────────────────
  const loadWatchlist = useCallback(async () => {
    setLoadingWL(true);
    setErrorWL(null);
    try {
      const nextWatchlist = await coinAiApi.getWatchlist();
      setWatchlist(Array.isArray(nextWatchlist) ? nextWatchlist : []);
    } catch (e) {
      setErrorWL((e as Error).message);
    } finally {
      setLoadingWL(false);
    }
  }, []);

  useEffect(() => { void loadWatchlist(); }, [loadWatchlist]);

  // ── Train ──────────────────────────────────────────────────────────────────
  const runTrain = useCallback(async (symbol: string, interval: string) => {
    trainRef.current?.abort();
    trainRef.current = new AbortController();
    setLoadingTrain(true);
    setErrorTrain(null);
    setActiveSymbol(symbol);
    try {
      setReport(await coinAiApi.train(symbol, interval));
    } catch (e) {
      setErrorTrain((e as Error).message);
    } finally {
      setLoadingTrain(false);
    }
  }, []);

  // ── Add to watchlist ───────────────────────────────────────────────────────
  async function handleAdd() {
    setAddLoading(true);
    try {
      await coinAiApi.addToWatchlist({ symbol: addSymbol, interval: addInterval });
      void messageApi.success(`${addSymbol} added to watchlist`);
      setAddOpen(false);
      void loadWatchlist();
    } catch (e) {
      void messageApi.error((e as Error).message);
    } finally {
      setAddLoading(false);
    }
  }

  // ── Remove from watchlist ──────────────────────────────────────────────────
  async function handleRemove(symbol: string) {
    try {
      await coinAiApi.removeFromWatchlist(symbol);
      void messageApi.success(`${symbol} removed`);
      setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
      if (activeSymbol === symbol) { setReport(null); setActiveSymbol(null); }
    } catch (e) {
      void messageApi.error((e as Error).message);
    }
  }

  const score = report
    ? report.signal === "BUY" ? "#34d399" : report.signal === "SELL" ? "#f87171" : "#94a3b8"
    : "#94a3b8";

  return (
    <div className="ci-shell">
      {contextHolder}

      {/* ── Header ── */}
      <div className="ci-header">
        <div className="ci-header-left">
          <div className="ci-eyebrow"><RobotOutlined /> COIN AI</div>
          <h1 className="ci-title">AI Trading Assistant</h1>
        </div>
        <div className="ci-header-right">
          <Button
            icon={<SyncOutlined spin={loadingWL} />}
            onClick={() => void loadWatchlist()}
            disabled={loadingWL}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
          >
            Add Symbol
          </Button>
        </div>
      </div>

      <div className="ci-layout">
        {/* ═══ WATCHLIST PANEL ═══ */}
        <div className="ci-panel ci-watchlist-panel">
          <div className="ci-panel-hd">
            <span className="ci-panel-title"><EyeOutlined /> Watchlist</span>
            <Tag>{safeWatchlist.length} symbols</Tag>
          </div>

          {loadingWL && (
            <div className="ci-center-spin"><Spin size="small" /></div>
          )}
          {errorWL && (
            <div className="ci-err-banner">
              <Typography.Text type="danger">{errorWL}</Typography.Text>
            </div>
          )}

          {!loadingWL && !errorWL && safeWatchlist.length === 0 && (
            <div className="ci-empty">
              <RobotOutlined className="ci-empty-icon" />
              <p>No symbols in watchlist</p>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                Add first symbol
              </Button>
            </div>
          )}

          <div className="ci-wl-list">
            {safeWatchlist.map((item) => (
              <div
                key={item.symbol}
                className={`ci-wl-row${activeSymbol === item.symbol ? " ci-wl-row-active" : ""}`}
              >
                <div className="ci-wl-info">
                  <span className="ci-wl-symbol">{item.symbol}</span>
                  <span className="ci-wl-iv">{item.interval}</span>
                  {item.last_signal && <SignalBadge s={item.last_signal} />}
                </div>
                <div className="ci-wl-actions">
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<RobotOutlined />}
                    loading={loadingTrain && activeSymbol === item.symbol}
                    onClick={() => void runTrain(item.symbol, item.interval)}
                  >
                    Analyze
                  </Button>
                  <Button
                    size="small"
                    danger
                    ghost
                    icon={<DeleteOutlined />}
                    className="ci-del-btn"
                    onClick={() => void handleRemove(item.symbol)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ TRAIN RESULT PANEL ═══ */}
        <div className="ci-panel ci-result-panel">
          {!report && !loadingTrain && !errorTrain && (
            <div className="ci-result-placeholder">
              <BulbOutlined className="ci-ph-icon" />
              <p className="ci-ph-title">Select a symbol to analyze</p>
              <p className="ci-ph-hint">Click &quot;Analyze&quot; on any watchlist item to run the AI model</p>
            </div>
          )}

          {loadingTrain && (
            <div className="ci-center-spin">
              <Spin size="large" tip="Training AI model..." />
            </div>
          )}

          {errorTrain && (
            <div className="ci-err-banner">
              <Typography.Text type="danger">{errorTrain}</Typography.Text>
            </div>
          )}

          {report && !loadingTrain && (
            <>
              {/* Signal Banner */}
              <div
                className="ci-signal-banner"
                style={{ background: SIG_BG[report.signal], borderColor: SIG_CLR[report.signal] + "40" }}
              >
                <div className="ci-sig-left">
                  <div className="ci-sig-symbol">{report.symbol}</div>
                  <div className="ci-sig-iv">· {report.interval}</div>
                </div>
                <div className="ci-sig-center">
                  <div className="ci-sig-label" style={{ color: SIG_CLR[report.signal] }}>
                    {report.signal}
                  </div>
                  <div className="ci-sig-model">{report.model_name}</div>
                </div>
                <div className="ci-sig-right">
                  <div className="ci-conf-ring" style={{ "--ring-clr": score } as React.CSSProperties}>
                    <span className="ci-conf-num">{report.confidence}%</span>
                    <span className="ci-conf-lbl">confidence</span>
                  </div>
                </div>
              </div>

              {/* KPI row */}
              <div className="ci-kpi-row">
                <StatCard
                  label="Predicted Return"
                  value={`${report.predicted_return >= 0 ? "+" : ""}${report.predicted_return.toFixed(2)}%`}
                  accent={report.predicted_return >= 0 ? "#34d399" : "#f87171"}
                />
                <StatCard label="Win Rate" value={`${report.backtest.win_rate.toFixed(1)}%`} accent="#7dd3fc" />
                <StatCard label="Profit Factor" value={report.backtest.profit_factor.toFixed(2)} accent="#a78bfa" />
                <StatCard label="Max Drawdown" value={`-${report.backtest.max_drawdown.toFixed(2)}%`} accent="#f87171" />
              </div>

              {/* Backtest detail */}
              <div className="ci-bt-panel">
                <div className="ci-bt-hd"><RobotOutlined /> Backtest Results</div>
                <div className="ci-bt-grid">
                  <div className="ci-bt-row">
                    <span className="ci-bt-k">Total Trades</span>
                    <span className="ci-bt-v">{report.backtest.total_trades}</span>
                  </div>
                  <div className="ci-bt-row">
                    <span className="ci-bt-k">Total Return</span>
                    <span className={`ci-bt-v ${report.backtest.total_return >= 0 ? "ci-up" : "ci-dn"}`}>
                      {report.backtest.total_return >= 0 ? "+" : ""}{report.backtest.total_return.toFixed(2)}%
                    </span>
                  </div>
                  <div className="ci-bt-row">
                    <span className="ci-bt-k">Win Rate</span>
                    <span className="ci-bt-v ci-up">{report.backtest.win_rate.toFixed(1)}%</span>
                  </div>
                  <div className="ci-bt-row">
                    <span className="ci-bt-k">Profit Factor</span>
                    <span className="ci-bt-v">{report.backtest.profit_factor.toFixed(2)}</span>
                  </div>
                  <div className="ci-bt-row">
                    <span className="ci-bt-k">Max Drawdown</span>
                    <span className="ci-bt-v ci-dn">{report.backtest.max_drawdown.toFixed(2)}%</span>
                  </div>
                  <div className="ci-bt-row">
                    <span className="ci-bt-k">Trained At</span>
                    <span className="ci-bt-v ci-bt-ts">
                      {new Date(report.trained_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add Symbol Modal ── */}
      <Modal
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        footer={null}
        title={
          <div className="ci-modal-hd">
            <PlusOutlined className="ci-modal-icon" />
            <span>Add to Watchlist</span>
          </div>
        }
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Symbol">
            <SymbolSearch value={addSymbol} onChange={setAddSymbol} />
          </Form.Item>
          <Form.Item label="Interval">
            <Segmented
              options={INTERVALS.map((i) => ({ label: i.toUpperCase(), value: i }))}
              value={addInterval}
              onChange={(v) => setAddInterval(v as Interval)}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="primary" loading={addLoading} onClick={() => void handleAdd()}>
                Add Symbol
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
