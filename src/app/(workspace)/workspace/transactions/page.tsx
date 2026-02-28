"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DollarOutlined,
  FundOutlined,
  LineChartOutlined,
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
  Popconfirm,
  Radio,
  Select,
  Spin,
  Typography,
} from "antd";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useTransactionStream } from "@/hooks/useTransactionStream";
import {
  getStoredAuthTokens,
  notifyError,
  notifySuccess,
} from "@/lib/api/client";
import { transactionApi } from "@/lib/transaction-api";
import type { CreateTransactionRequest, Transaction } from "@/types/transaction";

const { Text } = Typography;

const PER_PAGE = 20;

const SYMBOL_OPTIONS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "DOTUSDT",
].map((s) => ({ label: s.replace("USDT", "/USDT"), value: s }));

function readNumber(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numOrZero(value: string | number) {
  return readNumber(value) ?? 0;
}

function fmtNum(value: string | number, locale: "vi" | "en", decimals = 4) {
  const n = readNumber(value);
  return n !== null
    ? n.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
        maximumFractionDigits: decimals,
      })
    : "—";
}

function fmtDate(iso: string, locale: "vi" | "en") {
  try {
    return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function pnlColor(pnl: string) {
  const v = readNumber(pnl);
  if (v === null) return "tx-soft";
  if (v > 0) return "tx-pnl-up";
  if (v < 0) return "tx-pnl-dn";
  return "tx-soft";
}

function fmtPnl(tx: Transaction, locale: "vi" | "en") {
  if (tx.side === "SELL" || !tx.current_price) return "—";
  const v = readNumber(tx.pnl);
  const pct = readNumber(tx.pnl_pct);
  if (v === null || pct === null) return "—";
  const sign = v > 0 ? "+" : "";
  const pctSign = pct > 0 ? "+" : "";
  return `${sign}${v.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits: 2,
  })} (${pctSign}${pct.toFixed(2)}%)`;
}

function signedNum(value: number, locale: "vi" | "en", decimals = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits: decimals,
  })}`;
}

function deltaClass(value: number) {
  if (value > 0) return "tx-pnl-up";
  if (value < 0) return "tx-pnl-dn";
  return "tx-soft";
}

function Paginator({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="tx-pagination">
      <button
        className="tx-pg-btn tx-pg-arrow"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="tx-pg-ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            className={`tx-pg-btn${page === p ? " tx-pg-active" : ""}`}
            onClick={() => onChange(p as number)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="tx-pg-btn tx-pg-arrow"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

export default function TransactionsPage() {
  const { locale, t } = useLocale();
  const { tokens } = useAuth();
  const accessToken =
    tokens?.accessToken ?? getStoredAuthTokens()?.accessToken ?? null;

  const [page, setPage] = useState(1);
  const [symbol, setSymbol] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [form] = Form.useForm<CreateTransactionRequest>();
  const { data, loading, error, refetch } = useTransactionStream({
    token: accessToken,
    symbol,
    page,
    perPage: PER_PAGE,
    pollIntervalMs: symbol ? 0 : 5_000,
  });
  const rows = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useTransactionHistory(accessToken, historyPage, 60);

  /* ── create ── */
  async function handleCreate(values: CreateTransactionRequest) {
    if (!accessToken) {
      notifyError(t("transactionsPage.notifications.unauthorized"));
      return;
    }
    setCreating(true);
    try {
      await transactionApi.create(accessToken, {
        ...values,
        symbol: values.symbol.toUpperCase(),
        side: values.side.toUpperCase() as "BUY" | "SELL",
      });
      notifySuccess(t("transactionsPage.notifications.recorded"));
      setModalOpen(false);
      form.resetFields();
      setPage(1);
      if (page === 1) {
        refetch();
      }
    } catch (e) {
      notifyError(
        (e as Error).message || t("transactionsPage.notifications.createFailed"),
      );
    } finally {
      setCreating(false);
    }
  }

  /* ── delete ── */
  async function handleDelete(id: string) {
    if (!accessToken) {
      notifyError(t("transactionsPage.notifications.unauthorized"));
      return;
    }
    try {
      await transactionApi.remove(accessToken, id);
      notifySuccess(t("transactionsPage.notifications.deleted"));
      const newTotal = total - 1;
      const maxPage = Math.max(1, Math.ceil(newTotal / PER_PAGE));
      const nextPage = Math.min(page, maxPage);
      setPage(nextPage);
      if (nextPage === page) {
        refetch();
      }
    } catch (e) {
      notifyError(
        (e as Error).message || t("transactionsPage.notifications.deleteFailed"),
      );
    }
  }

  /* ── filter ── */
  function handleSymbolChange(val?: string) {
    setSymbol(val ?? undefined);
    setPage(1);
  }

  const safeRows = Array.isArray(rows) ? rows : [];
  const historyKindLabel = (kind: string) => {
    switch (kind) {
      case "initial":
        return t("transactionsPage.historyModal.kind.initial");
      case "transaction_changed":
        return t("transactionsPage.historyModal.kind.transactionChanged");
      case "market_tick":
        return t("transactionsPage.historyModal.kind.marketTick");
      default:
        return kind;
    }
  };

  /* ── KPI aggregates ── */
  const kpi = useMemo(() => {
    const buy = safeRows.filter((r) => r.side === "BUY");
    const sell = safeRows.filter((r) => r.side === "SELL");
    const totalPnl = buy.reduce((s, r) => {
      return s + numOrZero(r.pnl);
    }, 0);
    return {
      buyVol: buy.reduce((s, r) => s + numOrZero(r.total), 0),
      sellVol: sell.reduce((s, r) => s + numOrZero(r.total), 0),
      fees: safeRows.reduce((s, r) => s + numOrZero(r.fee), 0),
      buys: buy.length,
      sells: sell.length,
      totalPnl,
    };
  }, [safeRows]);

  return (
    <div className="tx-shell">
      {/* ── Header ── */}
      <div className="tx-header">
        <div>
          <div className="tx-eyebrow">
            <SwapOutlined /> {t("transactionsPage.eyebrow")}
          </div>
          <h1 className="tx-title">{t("transactionsPage.title")}</h1>
          <p className="tx-subtitle">
            {t("transactionsPage.subtitle")}
          </p>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="tx-kpi-row">
        <div className="tx-kpi-card tx-kpi-blue">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">
              {t("transactionsPage.kpi.totalTrades")}
            </span>
            <FundOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">{total}</div>
          <div className="tx-kpi-sub">
            {kpi.buys} BUY · {kpi.sells} SELL
          </div>
        </div>

        <div className="tx-kpi-card tx-kpi-green">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">
              {t("transactionsPage.kpi.buyVolume")}
            </span>
            <ArrowUpOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">
            ${kpi.buyVol.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="tx-kpi-sub">{t("transactionsPage.kpi.currentPage")}</div>
        </div>

        <div className="tx-kpi-card tx-kpi-red">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">
              {t("transactionsPage.kpi.sellVolume")}
            </span>
            <ArrowDownOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">
            ${kpi.sellVol.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="tx-kpi-sub">{t("transactionsPage.kpi.currentPage")}</div>
        </div>

        <div
          className={`tx-kpi-card ${kpi.totalPnl >= 0 ? "tx-kpi-green" : "tx-kpi-red"}`}
        >
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">
              {t("transactionsPage.kpi.unrealizedPnl")}
            </span>
            <DollarOutlined className="tx-kpi-icon" />
          </div>
          <div
            className={`tx-kpi-val ${kpi.totalPnl >= 0 ? "tx-pnl-up" : "tx-pnl-dn"}`}
          >
            {kpi.totalPnl >= 0 ? "+" : ""}
            {kpi.totalPnl.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </div>
          <div className="tx-kpi-sub">
            {t("transactionsPage.kpi.buyPositionsOnPage")}
          </div>
        </div>

        <div className="tx-kpi-card tx-kpi-amber">
          <div className="tx-kpi-top">
            <span className="tx-kpi-label">
              {t("transactionsPage.kpi.feesPaid")}
            </span>
            <WalletOutlined className="tx-kpi-icon" />
          </div>
          <div className="tx-kpi-val">
            ${kpi.fees.toLocaleString("en-US", { maximumFractionDigits: 4 })}
          </div>
          <div className="tx-kpi-sub">{t("transactionsPage.kpi.currentPage")}</div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="tx-error">
          <Text type="danger">
            {t("transactionsPage.errorPrefix")} {error}
          </Text>
        </div>
      )}

      {/* ── Main panel ── */}
      <div className="tx-panel">
        {/* Toolbar */}
        <div className="tx-toolbar">
          <div className="tx-toolbar-left">
            <Select
              allowClear
              placeholder={t("transactionsPage.toolbar.allSymbols")}
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
              onClick={() => refetch()}
              loading={loading}
            >
              {t("transactionsPage.toolbar.refresh")}
            </Button>
            <Button
              icon={<LineChartOutlined />}
              onClick={() => {
                setHistoryOpen(true);
                void refetchHistory();
              }}
            >
              {t("transactionsPage.toolbar.viewDetail")}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              className="tx-add-btn"
            >
              {t("transactionsPage.toolbar.newTrade")}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="tx-table-wrap">
          {loading && safeRows.length === 0 ? (
            <div className="tx-loading">
              <Spin size="large" />
            </div>
          ) : safeRows.length === 0 ? (
            <div className="tx-empty">
              <div className="tx-empty-icon-wrap">
                <SwapOutlined />
              </div>
              <p className="tx-empty-title">{t("transactionsPage.empty.title")}</p>
              <p className="tx-empty-hint">{t("transactionsPage.empty.hint")}</p>
            </div>
          ) : (
            <table className="tx-table">
              <thead>
                <tr>
                  <th>{t("transactionsPage.table.date")}</th>
                  <th>{t("transactionsPage.table.symbol")}</th>
                  <th>{t("transactionsPage.table.side")}</th>
                  <th>{t("transactionsPage.table.qty")}</th>
                  <th>{t("transactionsPage.table.entryPrice")}</th>
                  <th>{t("transactionsPage.table.current")}</th>
                  <th>{t("transactionsPage.table.total")}</th>
                  <th>{t("transactionsPage.table.pnl")}</th>
                  <th>{t("transactionsPage.table.fee")}</th>
                  <th>{t("transactionsPage.table.note")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {safeRows.map((tx) => {
                  const isBuy = tx.side === "BUY";
                  const hasLive =
                    tx.current_price !== "" && tx.current_price !== undefined;
                  return (
                    <tr key={tx.id} className="tx-row">
                      <td className="tx-soft tx-nowrap">
                        {fmtDate(tx.created_at, locale)}
                      </td>
                      <td>
                        <span className="tx-sym">
                          {tx.symbol.replace("USDT", "/USDT")}
                        </span>
                      </td>
                      <td>
                        <span className={`tx-side ${isBuy ? "buy" : "sell"}`}>
                          {isBuy ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}
                          {tx.side}
                        </span>
                      </td>
                      <td className="tx-num">{fmtNum(tx.quantity, locale, 6)}</td>
                      <td className="tx-num">${fmtNum(tx.price, locale, 2)}</td>
                      <td className="tx-num tx-live">
                        {hasLive ? (
                          `$${fmtNum(tx.current_price, locale, 2)}`
                        ) : (
                          <span className="tx-soft">—</span>
                        )}
                      </td>
                      <td
                        className={`tx-num tx-total ${isBuy ? "buy-col" : "sell-col"}`}
                      >
                        ${fmtNum(tx.total, locale, 2)}
                      </td>
                      <td
                        className={`tx-num tx-pnl-cell ${isBuy && hasLive ? pnlColor(tx.pnl) : "tx-soft"}`}
                      >
                        {fmtPnl(tx, locale)}
                      </td>
                      <td className="tx-soft">{fmtNum(tx.fee, locale, 4)}</td>
                      <td className="tx-soft tx-note">{tx.note || "—"}</td>
                      <td>
                        <Popconfirm
                          title={t("transactionsPage.deleteConfirm.title")}
                          onConfirm={() => void handleDelete(tx.id)}
                          okText={t("transactionsPage.deleteConfirm.ok")}
                          cancelText={t("transactionsPage.deleteConfirm.cancel")}
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
            <span className="tx-footer-count">
              {Math.min((page - 1) * PER_PAGE + 1, total)}–
              {Math.min(page * PER_PAGE, total)}{" "}
              <span className="tx-footer-sep">/</span> {total}{" "}
              {t("transactionsPage.footer.totalTransactions")}
            </span>
            <Paginator
              page={page}
              total={total}
              perPage={PER_PAGE}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        title={
          <div className="tx-modal-hd">
            <div className="tx-modal-icon">
              <DollarOutlined />
            </div>
            <div>
              <div className="tx-modal-title">
                {t("transactionsPage.createModal.title")}
              </div>
              <div className="tx-modal-sub">
                {t("transactionsPage.createModal.subtitle")}
              </div>
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
          <Form.Item
            name="symbol"
            label={t("transactionsPage.createModal.symbol")}
            rules={[
              {
                required: true,
                message: t("transactionsPage.createModal.symbolRequired"),
              },
            ]}
          >
            <Select
              showSearch
              placeholder={t("transactionsPage.createModal.symbolPlaceholder")}
              options={SYMBOL_OPTIONS}
              filterOption={(input, opt) =>
                (opt?.value as string)
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="side"
            label={t("transactionsPage.createModal.direction")}
            rules={[{ required: true }]}
          >
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
              label={t("transactionsPage.createModal.quantity")}
              rules={[
                {
                  required: true,
                  message: t("transactionsPage.createModal.required"),
                },
                {
                  type: "number",
                  min: 0.000001,
                  message: t("transactionsPage.createModal.mustPositive"),
                },
              ]}
            >
              <InputNumber
                min={0}
                step={0.0001}
                precision={6}
                style={{ width: "100%" }}
                placeholder="0.000000"
              />
            </Form.Item>

            <Form.Item
              name="price"
              label={t("transactionsPage.createModal.priceUsd")}
              rules={[
                {
                  required: true,
                  message: t("transactionsPage.createModal.required"),
                },
                {
                  type: "number",
                  min: 0.000001,
                  message: t("transactionsPage.createModal.mustPositive"),
                },
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
            <Form.Item
              name="fee"
              label={t("transactionsPage.createModal.feeUsd")}
            >
              <InputNumber
                min={0}
                step={0.01}
                precision={4}
                style={{ width: "100%" }}
                placeholder="0.0000"
              />
            </Form.Item>

            <Form.Item name="note" label={t("transactionsPage.createModal.note")}>
              <Input
                placeholder={t("transactionsPage.createModal.notePlaceholder")}
                maxLength={120}
              />
            </Form.Item>
          </div>

          <div className="tx-form-actions">
            <Button
              onClick={() => {
                setModalOpen(false);
                form.resetFields();
              }}
            >
              {t("transactionsPage.createModal.cancel")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              className="tx-submit-btn"
            >
              {t("transactionsPage.createModal.submit")}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── History Detail Modal ── */}
      <Modal
        open={historyOpen}
        onCancel={() => {
          setHistoryOpen(false);
          setHistoryPage(1);
        }}
        className="tx-hist-modal"
        title={
          <div className="tx-modal-hd">
            <div className="tx-modal-icon">
              <LineChartOutlined />
            </div>
            <div>
              <div className="tx-modal-title">
                {t("transactionsPage.historyModal.title")}
              </div>
              <div className="tx-modal-sub">
                {t("transactionsPage.historyModal.subtitlePrefix")}{" "}
                {historyData?.interval_seconds ?? 10}s
                {historyData && historyData.total > 0 && (
                  <span className="tx-modal-sub-count">
                    {" "}· {historyData.total} snapshots
                  </span>
                )}
              </div>
            </div>
          </div>
        }
        width={980}
        destroyOnHidden
        footer={[
          <Button
            key="refresh-history"
            icon={<ReloadOutlined />}
            onClick={() => void refetchHistory()}
            loading={historyLoading}
          >
            {t("transactionsPage.historyModal.refresh")}
          </Button>,
          <Button key="close-history" onClick={() => {
            setHistoryOpen(false);
            setHistoryPage(1);
          }}>
            {t("transactionsPage.historyModal.close")}
          </Button>,
        ]}
      >
        {historyLoading && !historyData ? (
          <div className="tx-loading">
            <Spin size="large" />
          </div>
        ) : historyError ? (
          <div className="tx-error">
            <Text type="danger">
              {t("transactionsPage.historyModal.loadErrorPrefix")} {historyError}
            </Text>
          </div>
        ) : !historyData || historyData.items.length === 0 ? (
          <div className="tx-empty">
            <div className="tx-empty-icon-wrap">
              <LineChartOutlined />
            </div>
            <p className="tx-empty-title">
              {t("transactionsPage.historyModal.emptyTitle")}
            </p>
            <p className="tx-empty-hint">
              {t("transactionsPage.historyModal.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="tx-history-wrap">
            {/* ── Latest snapshot stats ── */}
            {historyData.items[0] && (
              <div className="tx-hist-stats">
                <div className="tx-hist-stat">
                  <span className="tx-hist-stat-label">Invested</span>
                  <span className="tx-hist-stat-val">
                    ${signedNum(historyData.items[0].total_invested, locale, 2)}
                  </span>
                </div>
                <div className="tx-hist-stat-sep" />
                <div className="tx-hist-stat">
                  <span className="tx-hist-stat-label">Current Value</span>
                  <span className="tx-hist-stat-val">
                    ${signedNum(historyData.items[0].total_current_value, locale, 2)}
                  </span>
                </div>
                <div className="tx-hist-stat-sep" />
                <div className="tx-hist-stat">
                  <span className="tx-hist-stat-label">Unrealized P&L</span>
                  <span className={`tx-hist-stat-val ${deltaClass(historyData.items[0].total_unrealized_pnl)}`}>
                    {historyData.items[0].total_unrealized_pnl >= 0 ? "▲ " : "▼ "}
                    ${Math.abs(historyData.items[0].total_unrealized_pnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="tx-hist-stat-sep" />
                <div className="tx-hist-stat">
                  <span className="tx-hist-stat-label">Snapshots</span>
                  <span className="tx-hist-stat-val">{historyData.total}</span>
                </div>
              </div>
            )}

            {/* ── Table ── */}
            <div className="tx-table-wrap">
              <table className="tx-table tx-hist-table">
                <thead>
                  <tr className="tx-hist-group-row">
                    <th colSpan={2} className="tx-hist-group-empty" />
                    <th colSpan={2} className="tx-hist-group-label tx-hist-group-delta">
                      Δ Changes
                    </th>
                    <th colSpan={3} className="tx-hist-group-label tx-hist-group-total">
                      Portfolio Totals
                    </th>
                  </tr>
                  <tr>
                    <th className="tx-hist-th">{t("transactionsPage.historyModal.columns.time")}</th>
                    <th className="tx-hist-th">Kind</th>
                    <th className="tx-hist-th tx-right">Δ Value</th>
                    <th className="tx-hist-th tx-right">Δ Unrealized</th>
                    <th className="tx-hist-th tx-right">Current Value</th>
                    <th className="tx-hist-th tx-right">Unrealized P&L</th>
                    <th className="tx-hist-th tx-right">Invested</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.items.map((item) => (
                    <tr key={item.id} className="tx-row">
                      <td className="tx-hist-time tx-nowrap">
                        {fmtDate(item.recorded_at, locale)}
                      </td>
                      <td>
                        <span className={`tx-hist-kind tx-hist-kind-${item.change_kind}`}>
                          {item.change_kind === "market_tick"
                            ? "tick"
                            : item.change_kind === "transaction_changed"
                              ? "trade"
                              : "init"}
                        </span>
                      </td>
                      <td className="tx-right">
                        <span className={`tx-hist-delta ${deltaClass(item.delta_current_value)}`}>
                          {item.delta_current_value !== 0 && (
                            <span className="tx-hist-arrow">
                              {item.delta_current_value > 0 ? "▲" : "▼"}
                            </span>
                          )}
                          ${Math.abs(item.delta_current_value).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="tx-right">
                        <span className={`tx-hist-delta ${deltaClass(item.delta_unrealized_pnl)}`}>
                          {item.delta_unrealized_pnl !== 0 && (
                            <span className="tx-hist-arrow">
                              {item.delta_unrealized_pnl > 0 ? "▲" : "▼"}
                            </span>
                          )}
                          ${Math.abs(item.delta_unrealized_pnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="tx-num tx-right">
                        ${item.total_current_value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`tx-num tx-right ${deltaClass(item.total_unrealized_pnl)}`}>
                        {item.total_unrealized_pnl >= 0 ? "+" : ""}
                        ${item.total_unrealized_pnl.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="tx-num tx-right tx-soft">
                        ${item.total_invested.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {historyData.total > 60 && (
              <div className="tx-footer">
                <span className="tx-footer-count">
                  {Math.min((historyPage - 1) * 60 + 1, historyData.total)}–
                  {Math.min(historyPage * 60, historyData.total)}{" "}
                  <span className="tx-footer-sep">/</span> {historyData.total} snapshots
                </span>
                <Paginator
                  page={historyPage}
                  total={historyData.total}
                  perPage={60}
                  onChange={setHistoryPage}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
