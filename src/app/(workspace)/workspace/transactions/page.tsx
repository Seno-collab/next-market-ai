"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Col,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Spin,
  Table,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
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
import type {
  CreateTransactionRequest,
  Transaction,
  TransactionHistoryPoint,
} from "@/types/transaction";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PER_PAGE = 20;
const HISTORY_PER_PAGE = 60;
const GRID_GUTTER = { xs: 8, sm: 16, md: 24, lg: 32 } as const;
const SYMBOL_SEARCH_DEBOUNCE_MS = 250;
const DEFAULT_QUOTE_ASSETS = ["USDT", "BTC", "ETH", "BNB"];
const KNOWN_QUOTES = ["USDT", "USDC", "BUSD", "BTC", "ETH", "BNB"];

const FALLBACK_SYMBOLS = [
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
];

type SymbolOption = { label: string; value: string };
type QuotesApiBody = {
  data?: { quotes?: Array<{ quote_asset?: string | null }> };
};
type SymbolsApiBody = {
  data?: {
    symbols?: Array<{
      symbol?: string | null;
      base_asset?: string | null;
      quote_asset?: string | null;
    }>;
  };
};

function formatSymbolLabel(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  for (const quote of KNOWN_QUOTES) {
    if (normalized.endsWith(quote) && normalized.length > quote.length) {
      return `${normalized.slice(0, -quote.length)}/${quote}`;
    }
  }
  return normalized;
}

function toSymbolOption(symbol: string): SymbolOption {
  const normalized = symbol.trim().toUpperCase();
  return {
    label: formatSymbolLabel(normalized),
    value: normalized,
  };
}

function normalizeSymbolSearchQuery(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function uniqueSymbolOptions(symbols: string[]): SymbolOption[] {
  const seen = new Set<string>();
  const out: SymbolOption[] = [];
  for (const symbol of symbols) {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(toSymbolOption(normalized));
  }
  return out;
}

const FALLBACK_SYMBOL_OPTIONS = uniqueSymbolOptions(FALLBACK_SYMBOLS);

async function fetchQuoteAssets(signal?: AbortSignal): Promise<string[]> {
  try {
    const res = await fetch("/api/trading/quotes", {
      cache: "no-store",
      signal,
    });
    if (!res.ok) {
      return DEFAULT_QUOTE_ASSETS;
    }
    const body = (await res.json()) as QuotesApiBody;
    const quotes = (body.data?.quotes ?? [])
      .map((item) => String(item.quote_asset ?? "").trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 8);
    return quotes.length > 0 ? quotes : DEFAULT_QUOTE_ASSETS;
  } catch {
    return DEFAULT_QUOTE_ASSETS;
  }
}

async function fetchSymbolsByQuery(
  query: string,
  quotes: string[],
  signal?: AbortSignal,
): Promise<SymbolOption[]> {
  const normalizedQuery = normalizeSymbolSearchQuery(query);
  const quotePool = quotes.length > 0 ? quotes : DEFAULT_QUOTE_ASSETS;

  if (!normalizedQuery) {
    const primaryQuote = quotePool[0] ?? "USDT";
    const params = new URLSearchParams({ quote: primaryQuote });
    const res = await fetch(`/api/trading/symbols?${params.toString()}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) {
      return FALLBACK_SYMBOL_OPTIONS;
    }
    const body = (await res.json()) as SymbolsApiBody;
    const symbols = (body.data?.symbols ?? [])
      .map((item) => String(item.symbol ?? "").trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 200);
    const options = uniqueSymbolOptions(symbols);
    return options.length > 0 ? options : FALLBACK_SYMBOL_OPTIONS;
  }

  const quoteRequests = quotePool.slice(0, 8).map(async (quote) => {
    const params = new URLSearchParams({
      quote,
      search: normalizedQuery,
    });
    const res = await fetch(`/api/trading/symbols?${params.toString()}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) {
      return [];
    }
    const body = (await res.json()) as SymbolsApiBody;
    return (body.data?.symbols ?? [])
      .map((item) => String(item.symbol ?? "").trim().toUpperCase())
      .filter(Boolean);
  });

  const settled = await Promise.allSettled(quoteRequests);
  const merged: string[] = [];
  for (const item of settled) {
    if (item.status === "fulfilled") {
      merged.push(...item.value);
    }
  }

  const options = uniqueSymbolOptions(merged).slice(0, 300);
  if (options.length > 0) {
    return options;
  }

  // Fallback single endpoint search (some backends support search without quote).
  try {
    const params = new URLSearchParams({ search: normalizedQuery });
    const res = await fetch(`/api/trading/symbols?${params.toString()}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) {
      return FALLBACK_SYMBOL_OPTIONS;
    }
    const body = (await res.json()) as SymbolsApiBody;
    const singleSymbols = (body.data?.symbols ?? [])
      .map((item) => String(item.symbol ?? "").trim().toUpperCase())
      .filter(Boolean);
    const singleOptions = uniqueSymbolOptions(singleSymbols).slice(0, 300);
    return singleOptions.length > 0 ? singleOptions : FALLBACK_SYMBOL_OPTIONS;
  } catch {
    return FALLBACK_SYMBOL_OPTIONS;
  }
}

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
    ) {
      pages.push(i);
    }
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
  const screens = useBreakpoint();
  const isXs = !!screens.xs && !screens.sm;

  const accessToken =
    tokens?.accessToken ?? getStoredAuthTokens()?.accessToken ?? null;

  const [page, setPage] = useState(1);
  const [symbol, setSymbol] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [form] = Form.useForm<CreateTransactionRequest>();
  const modalSymbolValue = Form.useWatch("symbol", form);
  const [symbolOptions, setSymbolOptions] = useState<SymbolOption[]>(
    FALLBACK_SYMBOL_OPTIONS,
  );
  const [symbolOptionsLoading, setSymbolOptionsLoading] = useState(false);
  const quoteAssetsRef = useRef<string[]>(DEFAULT_QUOTE_ASSETS);
  const symbolSearchCacheRef = useRef<Map<string, SymbolOption[]>>(new Map());
  const symbolSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const symbolSearchAbortRef = useRef<AbortController | null>(null);
  const symbolSearchSeqRef = useRef(0);

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
  } = useTransactionHistory(accessToken, historyPage, HISTORY_PER_PAGE);

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
        (e as Error).message ||
          t("transactionsPage.notifications.createFailed"),
      );
    } finally {
      setCreating(false);
    }
  }

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
        (e as Error).message ||
          t("transactionsPage.notifications.deleteFailed"),
      );
    }
  }

  function handleSymbolChange(val?: string) {
    setSymbol(val ?? undefined);
    setPage(1);
  }

  const safeRows = Array.isArray(rows) ? rows : [];
  const mergedSymbolOptions = useMemo(() => {
    const optionsByValue = new Map(
      symbolOptions.map((option) => [option.value, option]),
    );

    if (symbol && !optionsByValue.has(symbol)) {
      optionsByValue.set(symbol, toSymbolOption(symbol));
    }
    if (modalSymbolValue && !optionsByValue.has(modalSymbolValue)) {
      optionsByValue.set(modalSymbolValue, toSymbolOption(modalSymbolValue));
    }

    return Array.from(optionsByValue.values());
  }, [modalSymbolValue, symbol, symbolOptions]);

  const runSymbolSearch = useCallback(async (query: string) => {
    const normalizedQuery = normalizeSymbolSearchQuery(query);
    const cacheKey = normalizedQuery || "__default__";
    const cached = symbolSearchCacheRef.current.get(cacheKey);
    if (cached) {
      setSymbolOptions(cached);
      return;
    }

    symbolSearchAbortRef.current?.abort();
    const controller = new AbortController();
    symbolSearchAbortRef.current = controller;

    const requestId = symbolSearchSeqRef.current + 1;
    symbolSearchSeqRef.current = requestId;
    setSymbolOptionsLoading(true);

    try {
      const nextOptions = await fetchSymbolsByQuery(
        normalizedQuery,
        quoteAssetsRef.current,
        controller.signal,
      );
      if (requestId !== symbolSearchSeqRef.current || controller.signal.aborted) {
        return;
      }
      symbolSearchCacheRef.current.set(cacheKey, nextOptions);
      setSymbolOptions(nextOptions);
    } catch {
      if (requestId !== symbolSearchSeqRef.current || controller.signal.aborted) {
        return;
      }
      setSymbolOptions(FALLBACK_SYMBOL_OPTIONS);
    } finally {
      if (requestId === symbolSearchSeqRef.current) {
        setSymbolOptionsLoading(false);
      }
      if (symbolSearchAbortRef.current === controller) {
        symbolSearchAbortRef.current = null;
      }
    }
  }, []);

  const handleSymbolSearch = useCallback(
    (nextQuery: string) => {
      if (symbolSearchDebounceRef.current) {
        clearTimeout(symbolSearchDebounceRef.current);
      }
      symbolSearchDebounceRef.current = setTimeout(() => {
        void runSymbolSearch(nextQuery);
      }, SYMBOL_SEARCH_DEBOUNCE_MS);
    },
    [runSymbolSearch],
  );

  const handleSymbolDropdownOpen = useCallback(
    (open: boolean) => {
      if (!open) return;
      if (symbolOptions.length === 0) {
        void runSymbolSearch("");
      }
    },
    [runSymbolSearch, symbolOptions.length],
  );

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const loadInitialSymbols = async () => {
      const quotes = await fetchQuoteAssets(controller.signal);
      if (!mounted) return;
      quoteAssetsRef.current = quotes;
      await runSymbolSearch("");
    };

    void loadInitialSymbols();

    return () => {
      mounted = false;
      controller.abort();
      if (symbolSearchDebounceRef.current) {
        clearTimeout(symbolSearchDebounceRef.current);
      }
      symbolSearchAbortRef.current?.abort();
    };
  }, [runSymbolSearch]);

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

  const kpi = useMemo(() => {
    const buy = safeRows.filter((r) => r.side === "BUY");
    const sell = safeRows.filter((r) => r.side === "SELL");
    const totalPnl = buy.reduce((s, r) => s + numOrZero(r.pnl), 0);

    return {
      buyVol: buy.reduce((s, r) => s + numOrZero(r.total), 0),
      sellVol: sell.reduce((s, r) => s + numOrZero(r.total), 0),
      fees: safeRows.reduce((s, r) => s + numOrZero(r.fee), 0),
      buys: buy.length,
      sells: sell.length,
      totalPnl,
    };
  }, [safeRows]);

  const transactionColumns: TableColumnsType<Transaction> = [
    {
      title: t("transactionsPage.table.date"),
      key: "created_at",
      dataIndex: "created_at",
      responsive: ["sm"],
      render: (value: string) => (
        <span className="tx-soft tx-nowrap">{fmtDate(value, locale)}</span>
      ),
    },
    {
      title: t("transactionsPage.table.symbol"),
      key: "symbol",
      dataIndex: "symbol",
      render: (value: string, tx) => (
        <div className="tx-symbol-cell">
          <span className="tx-sym">{value.replace("USDT", "/USDT")}</span>
          {isXs && (
            <div className="tx-symbol-meta">
              <span className={`tx-side ${tx.side === "BUY" ? "buy" : "sell"}`}>
                {tx.side === "BUY" ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )}{" "}
                {tx.side}
              </span>
              <span className="tx-soft">{fmtDate(tx.created_at, locale)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("transactionsPage.table.side"),
      key: "side",
      dataIndex: "side",
      responsive: ["md"],
      render: (value: Transaction["side"]) => (
        <span className={`tx-side ${value === "BUY" ? "buy" : "sell"}`}>
          {value === "BUY" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}
          {value}
        </span>
      ),
    },
    {
      title: t("transactionsPage.table.qty"),
      key: "quantity",
      dataIndex: "quantity",
      responsive: ["md"],
      align: "right",
      render: (value: string) => (
        <span className="tx-num">{fmtNum(value, locale, 6)}</span>
      ),
    },
    {
      title: t("transactionsPage.table.entryPrice"),
      key: "price",
      dataIndex: "price",
      responsive: ["md"],
      align: "right",
      render: (value: string) => (
        <span className="tx-num">${fmtNum(value, locale, 2)}</span>
      ),
    },
    {
      title: t("transactionsPage.table.current"),
      key: "current_price",
      dataIndex: "current_price",
      responsive: ["lg"],
      align: "right",
      render: (value: string) =>
        value ? (
          <span className="tx-num tx-live">${fmtNum(value, locale, 2)}</span>
        ) : (
          <span className="tx-soft">—</span>
        ),
    },
    {
      title: t("transactionsPage.table.total"),
      key: "total",
      dataIndex: "total",
      responsive: ["md"],
      align: "right",
      render: (value: string, tx) => (
        <span
          className={`tx-num tx-total ${tx.side === "BUY" ? "buy-col" : "sell-col"}`}
        >
          ${fmtNum(value, locale, 2)}
        </span>
      ),
    },
    {
      title: t("transactionsPage.table.pnl"),
      key: "pnl",
      responsive: ["lg"],
      align: "right",
      render: (_, tx) => {
        const hasLive =
          tx.current_price !== "" && tx.current_price !== undefined;
        return (
          <span
            className={`tx-num tx-pnl-cell ${tx.side === "BUY" && hasLive ? pnlColor(tx.pnl) : "tx-soft"}`}
          >
            {fmtPnl(tx, locale)}
          </span>
        );
      },
    },
    {
      title: t("transactionsPage.table.fee"),
      key: "fee",
      dataIndex: "fee",
      responsive: ["xl"],
      align: "right",
      render: (value: string) => (
        <span className="tx-soft">{fmtNum(value, locale, 4)}</span>
      ),
    },
    {
      title: t("transactionsPage.table.note"),
      key: "note",
      dataIndex: "note",
      responsive: ["xl"],
      render: (value: string) => (
        <span className="tx-soft tx-note">{value || "—"}</span>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, tx) => (
        <Popconfirm
          title={t("transactionsPage.deleteConfirm.title")}
          onConfirm={() => void handleDelete(tx.id)}
          okText={t("transactionsPage.deleteConfirm.ok")}
          cancelText={t("transactionsPage.deleteConfirm.cancel")}
          okButtonProps={{ danger: true }}
        >
          <button className="tx-del-btn tx-del-btn-static" aria-label="Delete">
            <DeleteOutlined />
          </button>
        </Popconfirm>
      ),
    },
  ];

  const historyColumns: TableColumnsType<TransactionHistoryPoint> = [
    {
      title: t("transactionsPage.historyModal.columns.time"),
      key: "recorded_at",
      dataIndex: "recorded_at",
      render: (value: string) => (
        <span className="tx-hist-time tx-nowrap">{fmtDate(value, locale)}</span>
      ),
    },
    {
      title: "Kind",
      key: "change_kind",
      dataIndex: "change_kind",
      render: (value: TransactionHistoryPoint["change_kind"]) => (
        <span className={`tx-hist-kind tx-hist-kind-${value}`}>
          {historyKindLabel(value)}
        </span>
      ),
    },
    {
      title: "Δ Value",
      key: "delta_current_value",
      dataIndex: "delta_current_value",
      responsive: ["md"],
      align: "right",
      render: (value: number) => (
        <span className={`tx-hist-delta ${deltaClass(value)}`}>
          {value !== 0 && (
            <span className="tx-hist-arrow">{value > 0 ? "▲" : "▼"}</span>
          )}
          $
          {Math.abs(value).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      title: "Δ Unrealized",
      key: "delta_unrealized_pnl",
      dataIndex: "delta_unrealized_pnl",
      responsive: ["lg"],
      align: "right",
      render: (value: number) => (
        <span className={`tx-hist-delta ${deltaClass(value)}`}>
          {value !== 0 && (
            <span className="tx-hist-arrow">{value > 0 ? "▲" : "▼"}</span>
          )}
          $
          {Math.abs(value).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      title: "Current Value",
      key: "total_current_value",
      dataIndex: "total_current_value",
      responsive: ["md"],
      align: "right",
      render: (value: number) => (
        <span className="tx-num tx-right">
          ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: "Unrealized P&L",
      key: "total_unrealized_pnl",
      dataIndex: "total_unrealized_pnl",
      responsive: ["md"],
      align: "right",
      render: (value: number) => (
        <span className={`tx-num tx-right ${deltaClass(value)}`}>
          {value >= 0 ? "+" : ""}$
          {value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: "Invested",
      key: "total_invested",
      dataIndex: "total_invested",
      responsive: ["lg"],
      align: "right",
      render: (value: number) => (
        <span className="tx-num tx-right tx-soft">
          ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="tx-shell">
      <Row
        gutter={[GRID_GUTTER, GRID_GUTTER]}
        align="middle"
        className="tx-header-grid"
      >
        <Col xs={24} sm={24} md={16} lg={18} xl={18} xxl={18}>
          <div className="tx-header">
            <div className="tx-eyebrow">
              <SwapOutlined /> {t("transactionsPage.eyebrow")}
            </div>
            <h1 className="tx-title">{t("transactionsPage.title")}</h1>
            <p className="tx-subtitle">{t("transactionsPage.subtitle")}</p>
          </div>
        </Col>
        <Col xs={24} sm={24} md={8} lg={6} xl={6} xxl={6}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
            className="tx-add-btn tx-quick-add"
            block
          >
            {t("transactionsPage.toolbar.newTrade")}
          </Button>
        </Col>
      </Row>

      <Row gutter={[GRID_GUTTER, GRID_GUTTER]}>
        <Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
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
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
          <div className="tx-kpi-card tx-kpi-green">
            <div className="tx-kpi-top">
              <span className="tx-kpi-label">
                {t("transactionsPage.kpi.buyVolume")}
              </span>
              <ArrowUpOutlined className="tx-kpi-icon" />
            </div>
            <div className="tx-kpi-val">
              $
              {kpi.buyVol.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </div>
            <div className="tx-kpi-sub">
              {t("transactionsPage.kpi.currentPage")}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
          <div className="tx-kpi-card tx-kpi-red">
            <div className="tx-kpi-top">
              <span className="tx-kpi-label">
                {t("transactionsPage.kpi.sellVolume")}
              </span>
              <ArrowDownOutlined className="tx-kpi-icon" />
            </div>
            <div className="tx-kpi-val">
              $
              {kpi.sellVol.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="tx-kpi-sub">
              {t("transactionsPage.kpi.currentPage")}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
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
              {kpi.totalPnl.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="tx-kpi-sub">
              {t("transactionsPage.kpi.buyPositionsOnPage")}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={12} lg={8} xl={6} xxl={6}>
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
            <div className="tx-kpi-sub">
              {t("transactionsPage.kpi.currentPage")}
            </div>
          </div>
        </Col>
      </Row>

      {error && (
        <div className="tx-error">
          <Text type="danger">
            {t("transactionsPage.errorPrefix")} {error}
          </Text>
        </div>
      )}

      <div className="tx-panel">
        <Row gutter={[GRID_GUTTER, GRID_GUTTER]} className="tx-toolbar-grid">
          <Col xs={24} sm={24} md={12} lg={8} xl={8} xxl={8}>
            <div className="tx-toolbar-left">
              <Select
                allowClear
                placeholder={t("transactionsPage.toolbar.allSymbols")}
                showSearch
                filterOption={false}
                options={mergedSymbolOptions}
                value={symbol ?? null}
                onChange={handleSymbolChange}
                onSearch={handleSymbolSearch}
                onDropdownVisibleChange={handleSymbolDropdownOpen}
                loading={symbolOptionsLoading}
                notFoundContent={symbolOptionsLoading ? <Spin size="small" /> : null}
                className="tx-symbol-select"
              />
              {loading && <Spin size="small" />}
            </div>
          </Col>
          <Col xs={24} sm={24} md={12} lg={16} xl={16} xxl={16}>
            <div className="tx-toolbar-right">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={loading}
                block={isXs}
              >
                {!isXs && t("transactionsPage.toolbar.refresh")}
              </Button>
              <Button
                icon={<LineChartOutlined />}
                onClick={() => {
                  setHistoryOpen(true);
                  void refetchHistory();
                }}
                block={isXs}
              >
                {!isXs && t("transactionsPage.toolbar.viewDetail")}
              </Button>
              {!isXs && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalOpen(true)}
                  className="tx-add-btn"
                >
                  {t("transactionsPage.toolbar.newTrade")}
                </Button>
              )}
            </div>
          </Col>
        </Row>

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
              <p className="tx-empty-title">
                {t("transactionsPage.empty.title")}
              </p>
              <p className="tx-empty-hint">
                {t("transactionsPage.empty.hint")}
              </p>
            </div>
          ) : (
            <Table<Transaction>
              rowKey="id"
              columns={transactionColumns}
              dataSource={safeRows}
              className="tx-ant-table"
              pagination={false}
              scroll={{ x: "max-content" }}
              size={isXs ? "small" : "middle"}
            />
          )}
        </div>

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
              options={mergedSymbolOptions}
              filterOption={false}
              onSearch={handleSymbolSearch}
              onDropdownVisibleChange={handleSymbolDropdownOpen}
              loading={symbolOptionsLoading}
              notFoundContent={symbolOptionsLoading ? <Spin size="small" /> : null}
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

          <Row gutter={[GRID_GUTTER, 0]}>
            <Col xs={24} sm={24} md={12}>
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
            </Col>
            <Col xs={24} sm={24} md={12}>
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
            </Col>
          </Row>

          <Row gutter={[GRID_GUTTER, 0]}>
            <Col xs={24} sm={24} md={12}>
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
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                name="note"
                label={t("transactionsPage.createModal.note")}
              >
                <Input
                  placeholder={t(
                    "transactionsPage.createModal.notePlaceholder",
                  )}
                  maxLength={120}
                />
              </Form.Item>
            </Col>
          </Row>

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
                    {" "}
                    · {historyData.total} snapshots
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
          <Button
            key="close-history"
            onClick={() => {
              setHistoryOpen(false);
              setHistoryPage(1);
            }}
          >
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
              {t("transactionsPage.historyModal.loadErrorPrefix")}{" "}
              {historyError}
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
            {historyData.items[0] && (
              <Row
                gutter={[GRID_GUTTER, GRID_GUTTER]}
                className="tx-hist-stats-grid"
              >
                <Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
                  <div className="tx-hist-stat">
                    <span className="tx-hist-stat-label">Invested</span>
                    <span className="tx-hist-stat-val">
                      $
                      {signedNum(
                        historyData.items[0].total_invested,
                        locale,
                        2,
                      )}
                    </span>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
                  <div className="tx-hist-stat">
                    <span className="tx-hist-stat-label">Current Value</span>
                    <span className="tx-hist-stat-val">
                      $
                      {signedNum(
                        historyData.items[0].total_current_value,
                        locale,
                        2,
                      )}
                    </span>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
                  <div className="tx-hist-stat">
                    <span className="tx-hist-stat-label">Unrealized P&L</span>
                    <span
                      className={`tx-hist-stat-val ${deltaClass(historyData.items[0].total_unrealized_pnl)}`}
                    >
                      {historyData.items[0].total_unrealized_pnl >= 0
                        ? "▲ "
                        : "▼ "}
                      $
                      {Math.abs(
                        historyData.items[0].total_unrealized_pnl,
                      ).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={12} lg={6} xl={6} xxl={6}>
                  <div className="tx-hist-stat">
                    <span className="tx-hist-stat-label">Snapshots</span>
                    <span className="tx-hist-stat-val">
                      {historyData.total}
                    </span>
                  </div>
                </Col>
              </Row>
            )}

            <div className="tx-table-wrap">
              <Table<TransactionHistoryPoint>
                rowKey="id"
                columns={historyColumns}
                dataSource={historyData.items}
                className="tx-ant-table tx-ant-table-history"
                pagination={false}
                scroll={{ x: "max-content" }}
                size={isXs ? "small" : "middle"}
              />
            </div>

            {historyData.total > HISTORY_PER_PAGE && (
              <div className="tx-footer">
                <span className="tx-footer-count">
                  {Math.min(
                    (historyPage - 1) * HISTORY_PER_PAGE + 1,
                    historyData.total,
                  )}
                  –{Math.min(historyPage * HISTORY_PER_PAGE, historyData.total)}{" "}
                  <span className="tx-footer-sep">/</span> {historyData.total}{" "}
                  snapshots
                </span>
                <Paginator
                  page={historyPage}
                  total={historyData.total}
                  perPage={HISTORY_PER_PAGE}
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
