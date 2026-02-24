"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DollarOutlined,
  FundOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Radio,
  Select,
  Spin,
  Typography,
} from "antd";
import { notifyError, notifySuccess } from "@/lib/api/client";
import { transactionApi } from "@/lib/api/transactions";
import type { CreateTransactionRequest, Transaction } from "@/types/trading";

const { Text } = Typography;

const PER_PAGE = 20;

const WS_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_BASE_URL ??
       window.location.origin.replace(/^http/, "ws"))
    : "";

const SYMBOL_OPTIONS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
].map((s) => ({ label: s.replace("USDT", "/USDT"), value: s }));

function fmtNum(s: string, decimals = 4) {
  const n = Number(s);
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: decimals }) : s;
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch { return iso; }
}

function pnlColor(pnl: string) {
  const v = Number(pnl);
  if (v > 0) return "tx-pnl-up";
  if (v < 0) return "tx-pnl-dn";
  return "tx-soft";
}

function fmtPnl(tx: Transaction) {
  if (tx.side === "SELL" || !tx.current_price) return "—";
  const v = Number(tx.pnl);
  const sign = v > 0 ? "+" : "";
  const pct = Number(tx.pnl_pct);
  return `${sign}${v.toLocaleString("en-US", { maximumFractionDigits: 2 })} (${sign}${pct.toFixed(2)}%)`;
}

export default function TransactionsPage() {
  const [rows, setRows]           = useState<Transaction[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [symbol, setSymbol]       = useState<string | undefined>(undefined);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateTransactionRequest>();
  const abortRef  = useRef<AbortController | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── fetch ── */
  const load = useCallback(async (p: number, sym?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const res = await transactionApi.list({ symbol: sym, page: p, per_page: PER_PAGE });
      setRows(Array.isArray(res.transactions) ? res.transactions : []);
      setTotal(Number.isFinite(res.total) ? res.total : 0);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);

  /* ── silent refetch (no loading spinner) for live P&L updates ── */
  const silentRefetch = useCallback(async (p: number, sym?: string) => {
    try {
      const res = await transactionApi.list({ symbol: sym, page: p, per_page: PER_PAGE });
      setRows(Array.isArray(res.transactions) ? res.transactions : []);
      setTotal(Number.isFinite(res.total) ? res.total : 0);
    } catch { /* swallow */ }
  }, []);

  /* ── initial load ── */
  useEffect(() => {
    void load(page, symbol);
    return () => abortRef.current?.abort();
  }, [load, page, symbol]);

  /* ── real-time: WS when symbol selected, polling otherwise ── */
  useEffect(() => {
    // clear previous
    wsRef.current?.close();
    wsRef.current = null;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    if (symbol && WS_BASE) {
      // connect WS for this symbol — refetch on every ticker_update
      const ws = new WebSocket(`${WS_BASE}/ws/trading?symbol=${symbol.toUpperCase()}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { type: string };
          if (msg.type === "ticker_update" || msg.type === "ticker_snapshot") {
            void silentRefetch(page, symbol);
          }
        } catch { /* ignore parse errors */ }
      };
    } else {
      // no symbol filter — poll every 5 s to keep P&L fresh across all symbols
      pollRef.current = setInterval(() => void silentRefetch(page, symbol), 5_000);
    }

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [symbol, page, silentRefetch]);

  /* ── create ── */
  async function handleCreate(values: CreateTransactionRequest) {
    setCreating(true);
    try {
      await transactionApi.create(values);
      notifySuccess("Transaction recorded");
      setModalOpen(false);
      form.resetFields();
      void load(1, symbol);
      setPage(1);
    } catch (e) {
      notifyError((e as Error).message || "Failed to record transaction");
    } finally { setCreating(false); }
  }

  /* ── delete ── */
  async function handleDelete(id: string) {
    try {
      await transactionApi.remove(id);
      notifySuccess("Transaction deleted");
      const newTotal = total - 1;
      const maxPage  = Math.max(1, Math.ceil(newTotal / PER_PAGE));
      const nextPage = Math.min(page, maxPage);
      setPage(nextPage);
      void load(nextPage, symbol);
    } catch (e) {
      notifyError((e as Error).message || "Failed to delete");
    }
  }

  /* ── filter ── */
  function handleSymbolChange(val: string | null) {
    setSymbol(val ?? undefined);
    setPage(1);
  }

  const safeRows = Array.isArray(rows) ? rows : [];

  /* ── KPI aggregates ── */
  const kpi = useMemo(() => {
    const buy  = safeRows.filter((r) => r.side === "BUY");
    const sell = safeRows.filter((r) => r.side === "SELL");
    const totalPnl = buy.reduce((s, r) => {
      const v = Number(r.pnl);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
    return {
      buyVol:   buy.reduce((s, r) => s + Number(r.total), 0),
      sellVol:  sell.reduce((s, r) => s + Number(r.total), 0),
      fees:     safeRows.reduce((s, r) => s + Number(r.fee), 0),
      buys:     buy.length,
      sells:    sell.length,
      totalPnl,
    };
  }, [safeRows]);

  return (
    <div className="tx-shell">

      {/* ── Header ── */}
      <div className="tx-header">
        <div>
          <div className="tx-eyebrow"><SwapOutlined /> TRANSACTION HISTORY</div>
          <h1 className="tx-title">My Transactions</h1>
          <p className="tx-subtitle">Track every trade you&apos;ve recorded — BUY &amp; SELL.</p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="tx-kpi-row">
        <div className="tx-kpi-card tx-kpi-blue">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">Total Trades</span>
            <FundOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">{total}</div>
          <div className="tx-kpi-sub">{kpi.buys} buys · {kpi.sells} sells on page</div>
        </div>

        <div className="tx-kpi-card tx-kpi-green">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">BUY Volume</span>
            <ArrowUpOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">
            ${kpi.buyVol.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="tx-kpi-sub">Current page</div>
        </div>

        <div className="tx-kpi-card tx-kpi-red">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">SELL Volume</span>
            <ArrowDownOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">
            ${kpi.sellVol.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="tx-kpi-sub">Current page</div>
        </div>

        <div className={`tx-kpi-card ${kpi.totalPnl >= 0 ? "tx-kpi-green" : "tx-kpi-red"}`}>
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">Unrealized P&amp;L</span>
            <DollarOutlined className="tx-kpi-icon" />
          </div>
          <div className={`tx-kpi-val ${kpi.totalPnl >= 0 ? "tx-pnl-up" : "tx-pnl-dn"}`}>
            {kpi.totalPnl >= 0 ? "+" : ""}
            {kpi.totalPnl.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="tx-kpi-sub">BUY positions · current page</div>
        </div>

        <div className="tx-kpi-card tx-kpi-amber">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">Fees Paid</span>
            <WalletOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">
            ${kpi.fees.toLocaleString("en-US", { maximumFractionDigits: 4 })}
          </div>
          <div className="tx-kpi-sub">Current page</div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="tx-error">
          <Text type="danger">Failed to load: {error}</Text>
        </div>
      )}

      {/* ── Main panel ── */}
      <div className="tx-panel">

        {/* Toolbar */}
        <div className="tx-toolbar">
          <div className="tx-toolbar-left">
            <Select
              allowClear
              placeholder="All symbols"
              options={SYMBOL_OPTIONS}
              value={symbol ?? null}
              onChange={handleSymbolChange}
              className="tx-symbol-select"
              style={{ width: 160 }}
            />
            {loading && <Spin size="small" />}
          </div>
          <div className="tx-toolbar-right">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => void load(page, symbol)}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              className="tx-add-btn"
            >
              New Trade
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="tx-table-wrap">
          {loading && safeRows.length === 0 ? (
            <div className="tx-loading"><Spin size="large" /></div>
          ) : safeRows.length === 0 ? (
            <div className="tx-empty">
              <div className="tx-empty-icon-wrap"><SwapOutlined /></div>
              <p className="tx-empty-title">No transactions yet</p>
              <p className="tx-empty-hint">Hit <strong>New Trade</strong> to record your first entry.</p>
            </div>
          ) : (
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Qty</th>
                  <th>Entry Price</th>
                  <th>Current</th>
                  <th>Total</th>
                  <th>P&amp;L</th>
                  <th>Fee</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {safeRows.map((tx) => {
                  const isBuy = tx.side === "BUY";
                  const hasLive = tx.current_price !== "" && tx.current_price !== undefined;
                  return (
                    <tr key={tx.id} className="tx-row">
                      <td className="tx-soft tx-nowrap">{fmtDate(tx.created_at)}</td>
                      <td><span className="tx-sym">{tx.symbol.replace("USDT", "/USDT")}</span></td>
                      <td>
                        <span className={`tx-side ${isBuy ? "buy" : "sell"}`}>
                          {isBuy ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                          {" "}{tx.side}
                        </span>
                      </td>
                      <td className="tx-num">{fmtNum(tx.quantity, 6)}</td>
                      <td className="tx-num">${fmtNum(tx.price, 2)}</td>
                      <td className="tx-num tx-live">
                        {hasLive ? `$${fmtNum(tx.current_price, 2)}` : <span className="tx-soft">—</span>}
                      </td>
                      <td className={`tx-num tx-total ${isBuy ? "buy-col" : "sell-col"}`}>
                        ${fmtNum(tx.total, 2)}
                      </td>
                      <td className={`tx-num tx-pnl-cell ${isBuy && hasLive ? pnlColor(tx.pnl) : "tx-soft"}`}>
                        {fmtPnl(tx)}
                      </td>
                      <td className="tx-soft">{fmtNum(tx.fee, 4)}</td>
                      <td className="tx-soft tx-note">{tx.note || "—"}</td>
                      <td>
                        <Popconfirm
                          title="Delete this transaction?"
                          onConfirm={() => void handleDelete(tx.id)}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <button className="tx-del-btn" aria-label="Delete">
                            <DeleteOutlined />
                          </button>
                        </Popconfirm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {total > 0 && (
          <div className="tx-footer">
            <span className="tx-footer-count">{total} total transactions</span>
            {total > PER_PAGE && (
              <Pagination
                current={page}
                total={total}
                pageSize={PER_PAGE}
                showSizeChanger={false}
                onChange={(p) => setPage(p)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        title={
          <div className="tx-modal-hd">
            <div className="tx-modal-icon"><DollarOutlined /></div>
            <div>
              <div className="tx-modal-title">Record New Trade</div>
              <div className="tx-modal-sub">Fill in the trade details below</div>
            </div>
          </div>
        }
        footer={null}
        width={500}
        destroyOnHidden
        className="tx-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => void handleCreate(v)}
          initialValues={{ side: "BUY", fee: 0 }}
          className="tx-form"
        >
          <Form.Item name="symbol" label="Symbol" rules={[{ required: true, message: "Select a symbol" }]}>
            <Select
              showSearch
              placeholder="e.g. BTC/USDT"
              options={SYMBOL_OPTIONS}
              filterOption={(input, opt) =>
                (opt?.value as string).toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="side" label="Direction" rules={[{ required: true }]}>
            <Radio.Group className="tx-side-radio">
              <Radio.Button value="BUY" className="tx-radio-buy">
                <ArrowUpOutlined /> BUY
              </Radio.Button>
              <Radio.Button value="SELL" className="tx-radio-sell">
                <ArrowDownOutlined /> SELL
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <div className="tx-form-row">
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                { required: true, message: "Required" },
                { type: "number", min: 0.000001, message: "Must be > 0" },
              ]}
            >
              <InputNumber
                min={0} step={0.0001} precision={6}
                style={{ width: "100%" }} placeholder="0.000000"
              />
            </Form.Item>

            <Form.Item
              name="price"
              label="Price (USD)"
              rules={[
                { required: true, message: "Required" },
                { type: "number", min: 0.000001, message: "Must be > 0" },
              ]}
            >
              <InputNumber
                min={0} step={0.01} precision={2}
                style={{ width: "100%" }} placeholder="0.00" prefix="$"
              />
            </Form.Item>
          </div>

          <div className="tx-form-row">
            <Form.Item name="fee" label="Fee (USD)">
              <InputNumber
                min={0} step={0.01} precision={4}
                style={{ width: "100%" }} placeholder="0.0000"
              />
            </Form.Item>

            <Form.Item name="note" label="Note">
              <Input placeholder="e.g. scalp entry" maxLength={120} />
            </Form.Item>
          </div>

          <div className="tx-form-actions">
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creating} className="tx-submit-btn">
              Record Trade
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
