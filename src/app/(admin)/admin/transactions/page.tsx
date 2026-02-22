"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
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

const SYMBOL_OPTIONS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
].map((s) => ({ label: s.replace("USDT", "/USDT"), value: s }));

/* ─── helpers ─────────────────────────────────────────────────────────────── */

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
  } catch {
    return iso;
  }
}

/* ─── page ─────────────────────────────────────────────────────────────────── */

export default function TransactionsPage() {
  const [rows, setRows]         = useState<Transaction[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [symbol, setSymbol]     = useState<string | undefined>(undefined);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateTransactionRequest>();

  const abortRef = useRef<AbortController | null>(null);

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
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, symbol);
    return () => abortRef.current?.abort();
  }, [load, page, symbol]);

  /* ── create ── */
  async function handleCreate(values: CreateTransactionRequest) {
    setCreating(true);
    try {
      await transactionApi.create(values);
      notifySuccess("Transaction created");
      setModalOpen(false);
      form.resetFields();
      void load(1, symbol);
      setPage(1);
    } catch (e) {
      notifyError((e as Error).message || "Failed to create transaction");
    } finally {
      setCreating(false);
    }
  }

  /* ── delete ── */
  async function handleDelete(id: string) {
    try {
      await transactionApi.remove(id);
      notifySuccess("Transaction deleted");
      // refresh current page (go back one if page is now empty)
      const newTotal = total - 1;
      const maxPage  = Math.max(1, Math.ceil(newTotal / PER_PAGE));
      const nextPage = Math.min(page, maxPage);
      setPage(nextPage);
      void load(nextPage, symbol);
    } catch (e) {
      notifyError((e as Error).message || "Failed to delete transaction");
    }
  }

  /* ── filter ── */
  function handleSymbolChange(val: string | null) {
    setSymbol(val ?? undefined);
    setPage(1);
  }

  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="tx-shell">

      {/* ── Header ── */}
      <div className="tx-header">
        <div>
          <div className="tx-eyebrow"><SwapOutlined /> TRANSACTION HISTORY</div>
          <h1 className="tx-title">My Transactions</h1>
          <p className="tx-subtitle">Track every trade you've recorded — BUY & SELL.</p>
        </div>
        <div className="tx-header-actions">
          <Select
            allowClear
            placeholder="Filter by symbol"
            options={SYMBOL_OPTIONS}
            value={symbol ?? null}
            onChange={handleSymbolChange}
            className="tx-symbol-select"
            style={{ width: 160 }}
          />
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

      {/* ── Error banner ── */}
      {error && (
        <div className="tx-error">
          <Text type="danger">Failed to load: {error}</Text>
        </div>
      )}

      {/* ── Table ── */}
      <div className="tx-panel">
        <div className="tx-table-wrap">
          {loading && safeRows.length === 0 ? (
            <div className="tx-loading"><Spin size="large" /></div>
          ) : safeRows.length === 0 ? (
            <div className="tx-empty">
              <SwapOutlined className="tx-empty-icon" />
              <p>No transactions yet. Record your first trade!</p>
            </div>
          ) : (
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Fee</th>
                  <th>Note</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {safeRows.map((tx) => (
                  <tr key={tx.id}>
                    <td className="tx-soft tx-nowrap">{fmtDate(tx.created_at)}</td>
                    <td><span className="tx-sym">{tx.symbol.replace("USDT", "/USDT")}</span></td>
                    <td>
                      <span className={`tx-side ${tx.side === "BUY" ? "buy" : "sell"}`}>
                        {tx.side === "BUY" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        {" "}{tx.side}
                      </span>
                    </td>
                    <td className="tx-num">{fmtNum(tx.quantity, 6)}</td>
                    <td className="tx-num">${fmtNum(tx.price, 2)}</td>
                    <td className="tx-num tx-total">${fmtNum(tx.total, 2)}</td>
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
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {total > PER_PAGE && (
          <div className="tx-pagination">
            <Pagination
              current={page}
              total={total}
              pageSize={PER_PAGE}
              showSizeChanger={false}
              showTotal={(t) => `${t} transactions`}
              onChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        title={<span className="tx-modal-title"><PlusOutlined /> Record New Trade</span>}
        footer={null}
        width={480}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => void handleCreate(v)}
          initialValues={{ side: "BUY", fee: 0 }}
          className="tx-form"
        >
          <Form.Item name="symbol" label="Symbol" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="e.g. BTCUSDT"
              options={SYMBOL_OPTIONS}
              filterOption={(input, opt) =>
                (opt?.value as string).toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="side" label="Side" rules={[{ required: true }]}>
            <Radio.Group className="tx-side-radio">
              <Radio.Button value="BUY" className="tx-radio-buy">▲ BUY</Radio.Button>
              <Radio.Button value="SELL" className="tx-radio-sell">▼ SELL</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <div className="tx-form-row">
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                { required: true },
                { type: "number", min: 0.000001, message: "Must be > 0" },
              ]}
            >
              <InputNumber
                min={0}
                step={0.0001}
                precision={6}
                style={{ width: "100%" }}
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item
              name="price"
              label="Price (USD)"
              rules={[
                { required: true },
                { type: "number", min: 0.000001, message: "Must be > 0" },
              ]}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={2}
                style={{ width: "100%" }}
                placeholder="0.00"
                prefix="$"
              />
            </Form.Item>
          </div>

          <div className="tx-form-row">
            <Form.Item name="fee" label="Fee (USD)">
              <InputNumber
                min={0}
                step={0.01}
                precision={4}
                style={{ width: "100%" }}
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item name="note" label="Note">
              <Input placeholder="e.g. scalp entry" maxLength={120} />
            </Form.Item>
          </div>

          <div className="tx-form-actions">
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              className="tx-submit-btn"
            >
              Record Trade
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
