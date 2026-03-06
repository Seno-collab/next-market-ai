"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BulbOutlined,
  LineChartOutlined,
  MenuOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  AutoComplete,
  Badge,
  Button,
  Card,
  Collapse,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  InputNumber,
  Layout,
  Row,
  Segmented,
  Select,
  Slider,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { TabsProps } from "antd";
import { coinAiApi, isCoinAiApiError } from "@/lib/coinai-api";
import {
  toCoinAIViewModel,
  type CoinAIViewModel,
} from "@/lib/coinai-adapter";
import {
  formatPercent,
  reliabilityBadgeColor,
  reliabilityReasonText,
  shouldRenderAdjustmentReason,
} from "@/lib/coinai-ui";
import type {
  BacktestResult,
  CoinAIAlgorithm,
  CoinAISignal,
  MultiTrainReport,
  OrderBookAnomalyReport,
  SignalReliability,
  ThresholdOptimizationResult,
  TrainReport,
} from "@/types/coinai";
import styles from "./page.module.css";

const { Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const INTERVALS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
] as const;
type Interval = (typeof INTERVALS)[number];
const QUICK_INTERVALS: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const ALGORITHMS = ["auto", "linear", "ensemble", "poly2", "blend"] as const;
type ModelAlgorithm = (typeof ALGORITHMS)[number];

const SYMBOL_REGEX = /^[A-Z0-9]{5,20}$/;
const REFRESH_REGEX = /^(\d+)([sm])$/i;
const MAX_REFRESH_MS = 10 * 60 * 1000;
const MIN_REFRESH_MS = 5 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 5 * 1000;
const DEFAULT_MIN_TRUST_SCORE = 0.58;
const DEFAULT_LIMIT = 500;
const DEFAULT_TRAIN_RATIO = 0.7;
const DEFAULT_VAL_RATIO = 0;
const DEFAULT_TRAIN_EPOCHS = 800;
const DEFAULT_REALTIME_EPOCHS = 200;
const DEFAULT_LONG_THRESHOLD = 0.0015;
const DEFAULT_SHORT_THRESHOLD = -0.0015;
const DEFAULT_SLIPPAGE_BPS = 0;
const DEFAULT_LATENCY_BARS = 0;
const DEFAULT_MAX_DRAWDOWN_STOP = 0;
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
const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const SIG_CLR: Record<CoinAISignal, string> = {
  BUY: "#15803d",
  SELL: "#b91c1c",
  HOLD: "#475569",
};

type SymbolOption = { label: string; value: string };
type QuotesApiBody = {
  data?: { quotes?: Array<{ quote_asset?: string | null }> };
};
type SymbolsApiBody = {
  data?: {
    symbols?: Array<{
      symbol?: string | null;
    }>;
  };
};

function fmtSignedPercent(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function formatGeneratedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isValidSymbol(symbol: string) {
  return SYMBOL_REGEX.test(symbol.trim().toUpperCase());
}

function isValidAlgorithm(value: string): value is CoinAIAlgorithm {
  return ALGORITHMS.includes(value as ModelAlgorithm);
}

function isValidTrustScore(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function isFiniteInRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function isIntegerInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && Number.isFinite(value) && value >= min && value <= max;
}

function formatThreshold(value: number | string | undefined | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(4);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(4);
    }
  }
  return "N/A";
}

function parseRefreshMs(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  const match = REFRESH_REGEX.exec(value);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = match[2];
  const milliseconds = unit === "m" ? amount * 60_000 : amount * 1000;
  if (milliseconds < MIN_REFRESH_MS || milliseconds > MAX_REFRESH_MS) {
    return null;
  }
  return milliseconds;
}

function trustTagColor(score: number | undefined, minScore: number) {
  if (typeof score !== "number") return "default";
  if (score >= minScore) return "success";
  if (score >= 0.5) return "gold";
  return "error";
}

function trustLabel(score: number | undefined) {
  if (typeof score !== "number") return "Trust N/A";
  return `Trust ${Math.round(score * 100)}%`;
}

function realtimeBadgeStatus(
  status: string,
): "success" | "processing" | "warning" | "error" | "default" {
  if (/stream_opened|stream_started|stream_done/i.test(status)) return "success";
  if (/stream_starting/i.test(status)) return "processing";
  if (/disconnect/i.test(status)) return "warning";
  if (/error/i.test(status)) return "error";
  return "default";
}

function formatDecimal(
  value: number | undefined | null,
  digits = 4,
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }
  return value.toFixed(digits);
}

function formatCompactNumber(value: number | undefined | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "N/A";
  }
  return COMPACT_NUMBER_FORMATTER.format(value);
}

function metricToneClass(
  positive: boolean | null | undefined,
): string {
  if (positive === true) return styles.metricPositive;
  if (positive === false) return styles.metricNegative;
  return styles.metricValue;
}

function contextCalloutClassName(tone: "info" | "warning" | "danger") {
  if (tone === "danger") {
    return `${styles.contextCallout} ${styles.contextCalloutDanger}`;
  }
  if (tone === "warning") {
    return `${styles.contextCallout} ${styles.contextCalloutWarning}`;
  }
  return `${styles.contextCallout} ${styles.contextCalloutInfo}`;
}

function renderMetricGrid(
  rows: Array<{
    label: string;
    value: string;
    positive?: boolean | null;
  }>,
) {
  return (
    <div className={styles.overviewStatGrid}>
      {rows.map((item) => (
        <div key={item.label} className={styles.overviewStatItem}>
          <Typography.Text
            type="secondary"
            className={styles.overviewStatLabel}
          >
            {item.label}
          </Typography.Text>
          <Typography.Text className={metricToneClass(item.positive)}>
            {item.value}
          </Typography.Text>
        </div>
      ))}
    </div>
  );
}

function renderBacktestSnapshot(
  backtest: BacktestResult,
  options: { includeRiskStop?: boolean } = {},
) {
  const includeRiskStop = options.includeRiskStop ?? false;
  const rows = [
    {
      label: "Total Return",
      value: fmtSignedPercent(backtest.total_return),
      positive: backtest.total_return >= 0,
    },
    {
      label: "Win Rate",
      value: formatPercent(backtest.win_rate, 1),
      positive: true,
    },
    {
      label: "Sharpe",
      value: backtest.sharpe.toFixed(2),
      positive: backtest.sharpe >= 0,
    },
    {
      label: "Max Drawdown",
      value: fmtSignedPercent(backtest.max_drawdown),
      positive: false,
    },
    {
      label: "Trades",
      value: String(backtest.trades),
      positive: null,
    },
  ];
  if (includeRiskStop) {
    rows.push({
      label: "Risk Stop",
      value: backtest.stopped_by_risk ? "Triggered" : "Clear",
      positive: backtest.stopped_by_risk ? false : true,
    });
  }
  return renderMetricGrid(rows);
}

function renderContextAlerts(options: {
  adjusted?: boolean;
  adjustmentReason?: string;
  riskStopped?: boolean;
  orderBook?: OrderBookAnomalyReport;
}) {
  const items: Array<{
    key: string;
    tone: "info" | "warning" | "danger";
    title: string;
    description: string;
  }> = [];

  if (options.adjusted) {
    items.push({
      key: "adjusted",
      tone: "info",
      title: "Signal adjusted by trust gate",
      description:
        options.adjustmentReason ||
        "Final signal differs from raw model output after reliability checks.",
    });
  }

  if (options.riskStopped) {
    items.push({
      key: "risk-stop",
      tone: "danger",
      title: "Risk stop triggered",
      description:
        "Backtest hit the configured max drawdown stop. Treat this run as degraded.",
    });
  }

  if (options.orderBook?.is_anomalous) {
    items.push({
      key: "orderbook",
      tone: "warning",
      title: "Order-book anomaly detected",
      description: `Imbalance ${formatPercent(options.orderBook.imbalance, 1)} across ${options.orderBook.checked_levels} checked levels.`,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Space orientation="vertical" size={8} style={{ width: "100%" }}>
      {items.map((item) => (
        <div key={item.key} className={contextCalloutClassName(item.tone)}>
          <Typography.Text strong className={styles.contextCalloutTitle}>
            {item.title}
          </Typography.Text>
          <Typography.Text className={styles.secondaryText}>
            {item.description}
          </Typography.Text>
        </div>
      ))}
    </Space>
  );
}

function renderThresholdOptimizationPanel(
  optimization: ThresholdOptimizationResult | undefined,
  thresholds: { long: number; short: number },
) {
  if (!optimization) {
    return (
      <Space orientation="vertical" size={10} style={{ width: "100%" }}>
        <Typography.Text type="secondary" className={styles.secondaryText}>
          Backend did not return a threshold optimization block for this run.
        </Typography.Text>
        {renderMetricGrid([
          {
            label: "Applied Long",
            value: formatThreshold(thresholds.long),
          },
          {
            label: "Applied Short",
            value: formatThreshold(thresholds.short),
          },
        ])}
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size={10} style={{ width: "100%" }}>
      <Flex gap={8} wrap="wrap">
        <Tag color={optimization.used ? "blue" : "default"}>
          {optimization.used ? "Optimization used" : "Optimization skipped"}
        </Tag>
        <Tag>{`Candidate pairs ${optimization.candidate_pairs}`}</Tag>
        <Tag>{`Score ${formatDecimal(optimization.score, 4)}`}</Tag>
      </Flex>
      {renderMetricGrid([
        {
          label: "Base Long",
          value: formatThreshold(optimization.base_long_threshold),
        },
        {
          label: "Base Short",
          value: formatThreshold(optimization.base_short_threshold),
        },
        {
          label: "Applied Long",
          value: formatThreshold(optimization.applied_long_threshold),
        },
        {
          label: "Applied Short",
          value: formatThreshold(optimization.applied_short_threshold),
        },
      ])}
      <Typography.Text type="secondary" className={styles.secondaryText}>
        Validation backtest snapshot
      </Typography.Text>
      {renderBacktestSnapshot(optimization.validation_backtest, {
        includeRiskStop: true,
      })}
    </Space>
  );
}

function renderOrderBookPanel(orderBook: OrderBookAnomalyReport | undefined) {
  if (!orderBook) {
    return (
      <Typography.Text type="secondary" className={styles.secondaryText}>
        Backend did not return order-book context for this run.
      </Typography.Text>
    );
  }

  const bidAnomalies = orderBook.bid_anomalies ?? [];
  const askAnomalies = orderBook.ask_anomalies ?? [];

  return (
    <Space orientation="vertical" size={10} style={{ width: "100%" }}>
      <Flex gap={8} wrap="wrap">
        <Tag color={orderBook.is_anomalous ? "gold" : "default"}>
          {orderBook.is_anomalous ? "Anomalous" : "No anomaly"}
        </Tag>
        <Tag>{`Checked ${orderBook.checked_levels} levels`}</Tag>
        <Tag>{`Z-threshold ${formatDecimal(orderBook.z_threshold, 2)}`}</Tag>
      </Flex>
      {renderMetricGrid([
        {
          label: "Imbalance",
          value: formatPercent(orderBook.imbalance, 1),
        },
        {
          label: "Bid Qty",
          value: formatCompactNumber(orderBook.total_bid_qty),
        },
        {
          label: "Ask Qty",
          value: formatCompactNumber(orderBook.total_ask_qty),
        },
        {
          label: "Max Bid",
          value: formatCompactNumber(orderBook.max_bid_qty),
        },
        {
          label: "Max Ask",
          value: formatCompactNumber(orderBook.max_ask_qty),
        },
      ])}

      {bidAnomalies.length === 0 && askAnomalies.length === 0 ? (
        <Typography.Text type="secondary" className={styles.secondaryText}>
          No anomalous bid or ask levels were surfaced by the backend.
        </Typography.Text>
      ) : (
        <div className={styles.anomalyColumns}>
          <div className={styles.anomalyColumn}>
            <Typography.Text strong>Bid anomalies</Typography.Text>
            {bidAnomalies.length === 0 ? (
              <Typography.Text type="secondary" className={styles.secondaryText}>
                None
              </Typography.Text>
            ) : (
              <div className={styles.anomalyList}>
                {bidAnomalies.slice(0, 4).map((item) => (
                  <div
                    key={`bid-${item.price}-${item.quantity}`}
                    className={styles.anomalyItem}
                  >
                    <Typography.Text strong>{item.price}</Typography.Text>
                    <Typography.Text className={styles.secondaryText}>
                      {`Qty ${item.quantity} · z ${formatDecimal(item.z_score, 2)}`}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.anomalyColumn}>
            <Typography.Text strong>Ask anomalies</Typography.Text>
            {askAnomalies.length === 0 ? (
              <Typography.Text type="secondary" className={styles.secondaryText}>
                None
              </Typography.Text>
            ) : (
              <div className={styles.anomalyList}>
                {askAnomalies.slice(0, 4).map((item) => (
                  <div
                    key={`ask-${item.price}-${item.quantity}`}
                    className={styles.anomalyItem}
                  >
                    <Typography.Text strong>{item.price}</Typography.Text>
                    <Typography.Text className={styles.secondaryText}>
                      {`Qty ${item.quantity} · z ${formatDecimal(item.z_score, 2)}`}
                    </Typography.Text>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Space>
  );
}

function renderReliabilityBreakdown(reliability: SignalReliability) {
  return (
    <Row gutter={[8, 8]}>
      <Col xs={24} md={12}>
        <Tag className={styles.componentTag}>
          {`Directional ${formatPercent(reliability.components.directional_acc_score, 1)}`}
        </Tag>
        <Tag className={styles.componentTag}>
          {`Error ${formatPercent(reliability.components.error_score, 1)}`}
        </Tag>
        <Tag className={styles.componentTag}>
          {`Sharpe ${formatPercent(reliability.components.sharpe_score, 1)}`}
        </Tag>
      </Col>
      <Col xs={24} md={12}>
        <Tag className={styles.componentTag}>
          {`Drawdown ${formatPercent(reliability.components.drawdown_score, 1)}`}
        </Tag>
        <Tag className={styles.componentTag}>
          {`Signal strength ${formatPercent(reliability.components.signal_strength_score, 1)}`}
        </Tag>
        <Tag className={styles.componentTag}>
          {`Support ${formatPercent(reliability.components.trade_support_score, 1)}`}
        </Tag>
      </Col>
    </Row>
  );
}

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

export default function CoinAIPage() {
  const screens = useBreakpoint();
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [addValue, setAddValue] = useState("BTCUSDT");
  const [addSymbolOptions, setAddSymbolOptions] = useState<SymbolOption[]>(
    FALLBACK_SYMBOL_OPTIONS,
  );
  const [addSymbolSearching, setAddSymbolSearching] = useState(false);

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loadingWL, setLoadingWL] = useState(false);
  const [errorWL, setErrorWL] = useState<string | null>(null);

  const [report, setReport] = useState<TrainReport | null>(null);
  const [loadingTrain, setLoadingTrain] = useState(false);
  const [errorTrain, setErrorTrain] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [analysisInterval, setAnalysisInterval] = useState<Interval>("1h");
  const [trainAlgorithm, setTrainAlgorithm] = useState<CoinAIAlgorithm>("auto");
  const [trainMinTrustScore, setTrainMinTrustScore] = useState(
    DEFAULT_MIN_TRUST_SCORE,
  );
  const [trainLimit, setTrainLimit] = useState(DEFAULT_LIMIT);
  const [trainTrainRatio, setTrainTrainRatio] = useState(DEFAULT_TRAIN_RATIO);
  const [trainValRatio, setTrainValRatio] = useState(DEFAULT_VAL_RATIO);
  const [trainEpochs, setTrainEpochs] = useState(DEFAULT_TRAIN_EPOCHS);
  const [trainLongThreshold, setTrainLongThreshold] = useState(
    DEFAULT_LONG_THRESHOLD,
  );
  const [trainShortThreshold, setTrainShortThreshold] = useState(
    DEFAULT_SHORT_THRESHOLD,
  );
  const [trainSlippageBps, setTrainSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const [trainLatencyBars, setTrainLatencyBars] = useState(DEFAULT_LATENCY_BARS);
  const [trainMaxDrawdownStop, setTrainMaxDrawdownStop] = useState(
    DEFAULT_MAX_DRAWDOWN_STOP,
  );

  const [addLoading, setAddLoading] = useState(false);

  const [realtimeSymbol, setRealtimeSymbol] = useState("BTCUSDT");
  const [realtimeInterval, setRealtimeInterval] = useState<Interval>("1m");
  const [realtimeAlgorithm, setRealtimeAlgorithm] =
    useState<CoinAIAlgorithm>("linear");
  const [realtimeMinTrustScore, setRealtimeMinTrustScore] = useState(
    DEFAULT_MIN_TRUST_SCORE,
  );
  const [realtimeRefresh, setRealtimeRefresh] = useState("20s");
  const [realtimeLimit, setRealtimeLimit] = useState(500);
  const [realtimeTrainRatio, setRealtimeTrainRatio] = useState(
    DEFAULT_TRAIN_RATIO,
  );
  const [realtimeValRatio, setRealtimeValRatio] = useState(DEFAULT_VAL_RATIO);
  const [realtimeEpochs, setRealtimeEpochs] = useState(DEFAULT_REALTIME_EPOCHS);
  const [realtimeLongThreshold, setRealtimeLongThreshold] = useState(
    DEFAULT_LONG_THRESHOLD,
  );
  const [realtimeShortThreshold, setRealtimeShortThreshold] = useState(
    DEFAULT_SHORT_THRESHOLD,
  );
  const [realtimeSlippageBps, setRealtimeSlippageBps] = useState(
    DEFAULT_SLIPPAGE_BPS,
  );
  const [realtimeLatencyBars, setRealtimeLatencyBars] = useState(
    DEFAULT_LATENCY_BARS,
  );
  const [realtimeMaxDrawdownStop, setRealtimeMaxDrawdownStop] = useState(
    DEFAULT_MAX_DRAWDOWN_STOP,
  );
  const [realtimeMaxUpdates, setRealtimeMaxUpdates] = useState(180);
  const [realtimeStreaming, setRealtimeStreaming] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("idle");
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [realtimeReport, setRealtimeReport] = useState<TrainReport | null>(
    null,
  );
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  const [multiSymbols, setMultiSymbols] = useState("BTCUSDT,ETHUSDT,SOLUSDT");
  const [multiInterval, setMultiInterval] = useState<Interval>("1h");
  const [multiAlgorithm, setMultiAlgorithm] = useState<CoinAIAlgorithm>("auto");
  const [multiMinTrustScore, setMultiMinTrustScore] = useState(
    DEFAULT_MIN_TRUST_SCORE,
  );
  const [multiLimit, setMultiLimit] = useState(300);
  const [multiTrainRatio, setMultiTrainRatio] = useState(0.7);
  const [multiValRatio, setMultiValRatio] = useState(DEFAULT_VAL_RATIO);
  const [multiEpochs, setMultiEpochs] = useState(800);
  const [multiLongThreshold, setMultiLongThreshold] = useState(
    DEFAULT_LONG_THRESHOLD,
  );
  const [multiShortThreshold, setMultiShortThreshold] = useState(
    DEFAULT_SHORT_THRESHOLD,
  );
  const [multiSlippageBps, setMultiSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const [multiLatencyBars, setMultiLatencyBars] = useState(DEFAULT_LATENCY_BARS);
  const [multiMaxDrawdownStop, setMultiMaxDrawdownStop] = useState(
    DEFAULT_MAX_DRAWDOWN_STOP,
  );
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiError, setMultiError] = useState<string | null>(null);
  const [multiReport, setMultiReport] = useState<MultiTrainReport | null>(null);

  const [trainCooldownUntil, setTrainCooldownUntil] = useState<number | null>(
    null,
  );
  const [cooldownNow, setCooldownNow] = useState(Date.now());

  const [messageApi, contextHolder] = message.useMessage();
  const realtimeStopRef = useRef<(() => void) | null>(null);
  const loginRedirectingRef = useRef(false);
  const quoteAssetsRef = useRef<string[]>(DEFAULT_QUOTE_ASSETS);
  const addSymbolSearchCacheRef = useRef<Map<string, SymbolOption[]>>(
    new Map(),
  );
  const addSymbolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const addSymbolAbortRef = useRef<AbortController | null>(null);
  const addSymbolSeqRef = useRef(0);
  const safeWatchlist = Array.isArray(watchlist) ? watchlist : [];
  const selectedAnalysisSymbol = activeSymbol ?? safeWatchlist[0] ?? null;
  const deferredWatchlistQuery = useDeferredValue(watchlistQuery);

  const trainCooldownSeconds = trainCooldownUntil
    ? Math.max(0, Math.ceil((trainCooldownUntil - cooldownNow) / 1000))
    : 0;
  const isTrainCoolingDown = trainCooldownSeconds > 0;

  const triggerTrainCooldown = useCallback((retryAfterMs?: number) => {
    const cooldownMs =
      typeof retryAfterMs === "number" && retryAfterMs > 0
        ? retryAfterMs
        : RATE_LIMIT_COOLDOWN_MS;
    setTrainCooldownUntil(Date.now() + cooldownMs);
  }, []);

  const handleAuthRequired = useCallback(() => {
    if (loginRedirectingRef.current) return;
    loginRedirectingRef.current = true;
    void messageApi.warning("Session expired. Redirecting to login...");
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 350);
    }
  }, [messageApi]);

  const getCoinAiErrorMessage = useCallback(
    (
      error: unknown,
      fallback = "Request failed",
      options?: { trainLimited?: boolean },
    ) => {
      if (isCoinAiApiError(error)) {
        if (error.status === 401) {
          handleAuthRequired();
          return "Authentication required";
        }
        if (error.status === 429 && options?.trainLimited) {
          triggerTrainCooldown(error.retryAfterMs);
          return "Too many CoinAI train requests. Retry in a few seconds.";
        }
        if (
          error.status === 503 &&
          /rate limiter unavailable/i.test(error.message)
        ) {
          return "Rate limiter unavailable. Please try again shortly.";
        }
        return error.message || fallback;
      }
      if (error instanceof Error) return error.message;
      return fallback;
    },
    [handleAuthRequired, triggerTrainCooldown],
  );

  useEffect(() => {
    if (!trainCooldownUntil) return;
    if (Date.now() >= trainCooldownUntil) {
      setTrainCooldownUntil(null);
      return;
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      setCooldownNow(now);
      if (now >= trainCooldownUntil) {
        setTrainCooldownUntil(null);
        window.clearInterval(timer);
      }
    }, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, [trainCooldownUntil]);

  const loadWatchlist = useCallback(async () => {
    setLoadingWL(true);
    setErrorWL(null);
    try {
      const result = await coinAiApi.getWatchlist();
      const symbols = result.symbols ?? [];
      setWatchlist(symbols);
      setActiveSymbol((prev) =>
        prev && symbols.includes(prev) ? prev : (symbols[0] ?? null),
      );
      setRealtimeSymbol((prev) => {
        if (symbols.length === 0) return prev || "BTCUSDT";
        if (!prev) return symbols[0];
        return symbols.includes(prev) ? prev : symbols[0];
      });
    } catch (error) {
      setErrorWL(getCoinAiErrorMessage(error, "Failed to load watchlist"));
    } finally {
      setLoadingWL(false);
    }
  }, [getCoinAiErrorMessage]);

  useEffect(() => {
    void loadWatchlist();
  }, [loadWatchlist]);

  const runAddSymbolSearch = useCallback(async (query: string) => {
    const normalizedQuery = normalizeSymbolSearchQuery(query);
    const cacheKey = normalizedQuery || "__default__";
    const cached = addSymbolSearchCacheRef.current.get(cacheKey);
    if (cached) {
      setAddSymbolOptions(cached);
      return;
    }

    addSymbolAbortRef.current?.abort();
    const controller = new AbortController();
    addSymbolAbortRef.current = controller;

    const requestId = addSymbolSeqRef.current + 1;
    addSymbolSeqRef.current = requestId;
    setAddSymbolSearching(true);

    try {
      const nextOptions = await fetchSymbolsByQuery(
        normalizedQuery,
        quoteAssetsRef.current,
        controller.signal,
      );
      if (requestId !== addSymbolSeqRef.current || controller.signal.aborted) {
        return;
      }
      addSymbolSearchCacheRef.current.set(cacheKey, nextOptions);
      setAddSymbolOptions(nextOptions);
    } catch {
      if (requestId !== addSymbolSeqRef.current || controller.signal.aborted) {
        return;
      }
      setAddSymbolOptions(FALLBACK_SYMBOL_OPTIONS);
    } finally {
      if (requestId === addSymbolSeqRef.current) {
        setAddSymbolSearching(false);
      }
      if (addSymbolAbortRef.current === controller) {
        addSymbolAbortRef.current = null;
      }
    }
  }, []);

  const handleAddSymbolSearch = useCallback(
    (nextQuery: string) => {
      if (addSymbolDebounceRef.current) {
        clearTimeout(addSymbolDebounceRef.current);
      }
      addSymbolDebounceRef.current = setTimeout(() => {
        void runAddSymbolSearch(nextQuery);
      }, SYMBOL_SEARCH_DEBOUNCE_MS);
    },
    [runAddSymbolSearch],
  );

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const loadInitialSymbols = async () => {
      const quotes = await fetchQuoteAssets(controller.signal);
      if (!mounted) return;
      quoteAssetsRef.current = quotes;
      await runAddSymbolSearch("");
    };

    void loadInitialSymbols();

    return () => {
      mounted = false;
      controller.abort();
      if (addSymbolDebounceRef.current) {
        clearTimeout(addSymbolDebounceRef.current);
      }
      addSymbolAbortRef.current?.abort();
    };
  }, [runAddSymbolSearch]);

  const runTrain = useCallback(
    async (symbol: string, interval: Interval) => {
      const normalizedSymbol = symbol.trim().toUpperCase();
      if (!isValidSymbol(normalizedSymbol)) {
        setErrorTrain("Symbol must match pattern A-Z0-9 (5..20 chars)");
        return;
      }
      if (!INTERVALS.includes(interval)) {
        setErrorTrain("Invalid interval");
        return;
      }
      if (!isValidAlgorithm(trainAlgorithm)) {
        setErrorTrain(
          "Algorithm must be auto, linear, ensemble, poly2, or blend",
        );
        return;
      }
      if (!isValidTrustScore(trainMinTrustScore)) {
        setErrorTrain("Min trust score must be in range 0..1");
        return;
      }
      if (!isIntegerInRange(trainLimit, 50, 1000)) {
        setErrorTrain("Limit must be an integer in range 50..1000");
        return;
      }
      if (!Number.isFinite(trainTrainRatio) || trainTrainRatio <= 0 || trainTrainRatio >= 1) {
        setErrorTrain("Train ratio must be in range (0,1)");
        return;
      }
      if (!isFiniteInRange(trainValRatio, 0, 0.99)) {
        setErrorTrain("Val ratio must be in range 0..0.99");
        return;
      }
      if (trainTrainRatio + trainValRatio >= 1) {
        setErrorTrain("train_ratio + val_ratio must be < 1");
        return;
      }
      if (!isIntegerInRange(trainEpochs, 1, 3000)) {
        setErrorTrain("Epochs must be an integer in range 1..3000");
        return;
      }
      if (!Number.isFinite(trainLongThreshold) || !Number.isFinite(trainShortThreshold)) {
        setErrorTrain("Thresholds must be numeric values");
        return;
      }
      if (!(trainLongThreshold > trainShortThreshold)) {
        setErrorTrain("long_threshold must be greater than short_threshold");
        return;
      }
      if (!isFiniteInRange(trainSlippageBps, 0, 1000)) {
        setErrorTrain("slippage_bps must be in range 0..1000");
        return;
      }
      if (!isIntegerInRange(trainLatencyBars, 0, 50)) {
        setErrorTrain("latency_bars must be an integer in range 0..50");
        return;
      }
      if (!isFiniteInRange(trainMaxDrawdownStop, 0, 1)) {
        setErrorTrain("max_drawdown_stop must be in range 0..1");
        return;
      }
      if (isTrainCoolingDown) {
        setErrorTrain(
          `Too many CoinAI train requests. Retry in ${trainCooldownSeconds}s`,
        );
        return;
      }

      setLoadingTrain(true);
      setErrorTrain(null);
      setActiveSymbol(normalizedSymbol);
      try {
        setReport(
          await coinAiApi.train(normalizedSymbol, interval, {
            algorithm: trainAlgorithm,
            minTrustScore: trainMinTrustScore,
            limit: trainLimit,
            trainRatio: trainTrainRatio,
            valRatio: trainValRatio,
            epochs: trainEpochs,
            longThreshold: trainLongThreshold,
            shortThreshold: trainShortThreshold,
            slippageBps: trainSlippageBps,
            latencyBars: trainLatencyBars,
            maxDrawdownStop: trainMaxDrawdownStop,
          }),
        );
      } catch (error) {
        setErrorTrain(
          getCoinAiErrorMessage(error, "Unable to train model", {
            trainLimited: true,
          }),
        );
      } finally {
        setLoadingTrain(false);
      }
    },
    [
      getCoinAiErrorMessage,
      isTrainCoolingDown,
      trainAlgorithm,
      trainCooldownSeconds,
      trainEpochs,
      trainLatencyBars,
      trainLimit,
      trainLongThreshold,
      trainMaxDrawdownStop,
      trainMinTrustScore,
      trainShortThreshold,
      trainSlippageBps,
      trainTrainRatio,
      trainValRatio,
    ],
  );

  const handleAnalyzeSelected = useCallback(() => {
    if (!selectedAnalysisSymbol) {
      setErrorTrain("Select a symbol before running analysis");
      return;
    }
    if (activeSymbol !== selectedAnalysisSymbol) {
      setActiveSymbol(selectedAnalysisSymbol);
    }
    void runTrain(selectedAnalysisSymbol, analysisInterval);
  }, [activeSymbol, analysisInterval, runTrain, selectedAnalysisSymbol]);

  const stopRealtime = useCallback(() => {
    if (realtimeStopRef.current) {
      realtimeStopRef.current();
      realtimeStopRef.current = null;
    }
    setRealtimeStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      stopRealtime();
    };
  }, [stopRealtime]);

  const startRealtime = useCallback(() => {
    const symbol = realtimeSymbol.trim().toUpperCase();
    const refreshValue = realtimeRefresh.trim() || "20s";
    const refreshMs = parseRefreshMs(refreshValue);

    if (!isValidSymbol(symbol)) {
      setRealtimeError("Symbol must match pattern A-Z0-9 (5..20 chars)");
      return;
    }
    if (!INTERVALS.includes(realtimeInterval)) {
      setRealtimeError("Invalid interval");
      return;
    }
    if (!isValidAlgorithm(realtimeAlgorithm)) {
      setRealtimeError(
        "Algorithm must be auto, linear, ensemble, poly2, or blend",
      );
      return;
    }
    if (!isValidTrustScore(realtimeMinTrustScore)) {
      setRealtimeError("Min trust score must be in range 0..1");
      return;
    }
    if (
      !Number.isInteger(realtimeLimit) ||
      !Number.isFinite(realtimeLimit) ||
      realtimeLimit < 50 ||
      realtimeLimit > 1000
    ) {
      setRealtimeError("Limit must be an integer in range 50..1000");
      return;
    }
    if (
      !Number.isFinite(realtimeTrainRatio) ||
      realtimeTrainRatio <= 0 ||
      realtimeTrainRatio >= 1
    ) {
      setRealtimeError("Train ratio must be in range (0,1)");
      return;
    }
    if (!isFiniteInRange(realtimeValRatio, 0, 0.99)) {
      setRealtimeError("Val ratio must be in range 0..0.99");
      return;
    }
    if (realtimeTrainRatio + realtimeValRatio >= 1) {
      setRealtimeError("train_ratio + val_ratio must be < 1");
      return;
    }
    if (!isIntegerInRange(realtimeEpochs, 1, 3000)) {
      setRealtimeError("Epochs must be an integer in range 1..3000");
      return;
    }
    if (
      !Number.isFinite(realtimeLongThreshold) ||
      !Number.isFinite(realtimeShortThreshold)
    ) {
      setRealtimeError("Thresholds must be numeric values");
      return;
    }
    if (!(realtimeLongThreshold > realtimeShortThreshold)) {
      setRealtimeError("long_threshold must be greater than short_threshold");
      return;
    }
    if (!isFiniteInRange(realtimeSlippageBps, 0, 1000)) {
      setRealtimeError("slippage_bps must be in range 0..1000");
      return;
    }
    if (!isIntegerInRange(realtimeLatencyBars, 0, 50)) {
      setRealtimeError("latency_bars must be an integer in range 0..50");
      return;
    }
    if (!isFiniteInRange(realtimeMaxDrawdownStop, 0, 1)) {
      setRealtimeError("max_drawdown_stop must be in range 0..1");
      return;
    }
    if (refreshMs === null) {
      setRealtimeError("Refresh must be in range 5s..10m (example: 20s)");
      return;
    }
    if (
      !Number.isInteger(realtimeMaxUpdates) ||
      !Number.isFinite(realtimeMaxUpdates) ||
      realtimeMaxUpdates < 1 ||
      realtimeMaxUpdates > 1000
    ) {
      setRealtimeError("max_updates must be an integer in range 1..1000");
      return;
    }
    if (isTrainCoolingDown) {
      setRealtimeError(
        `Too many CoinAI train requests. Retry in ${trainCooldownSeconds}s`,
      );
      return;
    }

    stopRealtime();
    setRealtimeSymbol(symbol);
    setRealtimeError(null);
    setRealtimeStatus("stream_starting");
    setRealtimeUpdates(0);
    setRealtimeStreaming(true);

    const stop = coinAiApi.subscribeTrainRealtime(
      symbol,
      {
        algorithm: realtimeAlgorithm,
        minTrustScore: realtimeMinTrustScore,
        interval: realtimeInterval,
        refresh: refreshValue,
        limit: realtimeLimit,
        trainRatio: realtimeTrainRatio,
        valRatio: realtimeValRatio,
        epochs: realtimeEpochs,
        longThreshold: realtimeLongThreshold,
        shortThreshold: realtimeShortThreshold,
        slippageBps: realtimeSlippageBps,
        latencyBars: realtimeLatencyBars,
        maxDrawdownStop: realtimeMaxDrawdownStop,
        maxUpdates: realtimeMaxUpdates,
      },
      {
        onOpen: () => setRealtimeStatus("stream_opened"),
        onStatus: (status) => {
          setRealtimeStatus(status);
          if (status === "stream_done") {
            setRealtimeStreaming(false);
            realtimeStopRef.current = null;
          }
        },
        onReport: (nextReport) => {
          setRealtimeReport(nextReport);
          setRealtimeUpdates((prev) => prev + 1);
        },
        onError: (nextMessage, status) => {
          setRealtimeError(nextMessage);
          if (
            status === 429 ||
            /too many coinai train requests/i.test(nextMessage)
          ) {
            triggerTrainCooldown();
          }
          if (
            status === 401 ||
            /(missing|invalid).*(access token|authorization)|unauthorized|authentication/i.test(
              nextMessage,
            )
          ) {
            handleAuthRequired();
          }
        },
        onNetworkError: () => {
          setRealtimeError("Realtime stream disconnected");
          setRealtimeStatus("stream_disconnected");
          setRealtimeStreaming(false);
          realtimeStopRef.current = null;
        },
      },
    );

    realtimeStopRef.current = () => {
      stop();
    };
  }, [
    handleAuthRequired,
    isTrainCoolingDown,
    realtimeAlgorithm,
    realtimeEpochs,
    realtimeInterval,
    realtimeLatencyBars,
    realtimeLimit,
    realtimeLongThreshold,
    realtimeMaxDrawdownStop,
    realtimeMaxUpdates,
    realtimeMinTrustScore,
    realtimeRefresh,
    realtimeShortThreshold,
    realtimeSlippageBps,
    realtimeSymbol,
    realtimeTrainRatio,
    realtimeValRatio,
    stopRealtime,
    trainCooldownSeconds,
    triggerTrainCooldown,
  ]);

  const handleQuickAdd = useCallback(
    async (raw?: string) => {
      const symbol = (raw ?? addValue).trim().toUpperCase();
      if (!isValidSymbol(symbol)) {
        void messageApi.error("Symbol must match pattern A-Z0-9 (5..20 chars)");
        return;
      }
      if (safeWatchlist.includes(symbol)) {
        setActiveSymbol(symbol);
        void messageApi.info(`${symbol} is already in watchlist`);
        return;
      }
      setAddLoading(true);
      try {
        await coinAiApi.addToWatchlist({ symbol });
        setAddValue("BTCUSDT");
        await loadWatchlist();
        setActiveSymbol(symbol);
        void messageApi.success(`${symbol} added to watchlist`);
      } catch (error) {
        void messageApi.error(
          getCoinAiErrorMessage(error, "Failed to add watchlist symbol"),
        );
      } finally {
        setAddLoading(false);
      }
    },
    [addValue, getCoinAiErrorMessage, loadWatchlist, messageApi, safeWatchlist],
  );

  const handleRunMultiTrain = useCallback(async () => {
    if (isTrainCoolingDown) {
      setMultiError(
        `Too many CoinAI train requests. Retry in ${trainCooldownSeconds}s`,
      );
      return;
    }

    const symbols = multiSymbols
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const uniqueSymbols = Array.from(new Set(symbols));

    if (uniqueSymbols.length < 2 || uniqueSymbols.length > 20) {
      setMultiError("Please enter 2..20 unique symbols");
      return;
    }
    if (uniqueSymbols.some((symbol) => !isValidSymbol(symbol))) {
      setMultiError("Each symbol must match pattern A-Z0-9 (5..20 chars)");
      return;
    }
    if (!INTERVALS.includes(multiInterval)) {
      setMultiError("Invalid interval");
      return;
    }
    if (!isValidAlgorithm(multiAlgorithm)) {
      setMultiError(
        "Algorithm must be auto, linear, ensemble, poly2, or blend",
      );
      return;
    }
    if (!isValidTrustScore(multiMinTrustScore)) {
      setMultiError("Min trust score must be in range 0..1");
      return;
    }
    if (
      !Number.isInteger(multiLimit) ||
      !Number.isFinite(multiLimit) ||
      (multiLimit !== 0 && multiLimit < 50) ||
      multiLimit > 1000
    ) {
      setMultiError("Limit must be 0 or an integer in range 50..1000");
      return;
    }
    if (
      !Number.isFinite(multiTrainRatio) ||
      (multiTrainRatio !== 0 && multiTrainRatio <= 0) ||
      multiTrainRatio >= 1
    ) {
      setMultiError("Train ratio must be 0 or in range (0,1)");
      return;
    }
    if (!isFiniteInRange(multiValRatio, 0, 0.99)) {
      setMultiError("Val ratio must be in range 0..0.99");
      return;
    }
    const effectiveTrainRatio = multiTrainRatio === 0 ? DEFAULT_TRAIN_RATIO : multiTrainRatio;
    if (effectiveTrainRatio + multiValRatio >= 1) {
      setMultiError("train_ratio + val_ratio must be < 1");
      return;
    }
    if (
      !Number.isInteger(multiEpochs) ||
      !Number.isFinite(multiEpochs) ||
      (multiEpochs !== 0 && multiEpochs < 1) ||
      multiEpochs > 3000
    ) {
      setMultiError("Epochs must be 0 or an integer in range 1..3000");
      return;
    }
    if (!Number.isFinite(multiLongThreshold) || !Number.isFinite(multiShortThreshold)) {
      setMultiError("Thresholds must be numeric values");
      return;
    }
    if (!(multiLongThreshold > multiShortThreshold)) {
      setMultiError("long_threshold must be greater than short_threshold");
      return;
    }
    if (!isFiniteInRange(multiSlippageBps, 0, 1000)) {
      setMultiError("slippage_bps must be in range 0..1000");
      return;
    }
    if (!isIntegerInRange(multiLatencyBars, 0, 50)) {
      setMultiError("latency_bars must be an integer in range 0..50");
      return;
    }
    if (!isFiniteInRange(multiMaxDrawdownStop, 0, 1)) {
      setMultiError("max_drawdown_stop must be in range 0..1");
      return;
    }

    setMultiLoading(true);
    setMultiError(null);
    try {
      const result = await coinAiApi.trainMulti({
        symbols: uniqueSymbols,
        interval: multiInterval,
        algorithm: multiAlgorithm,
        min_trust_score: multiMinTrustScore,
        limit: multiLimit,
        train_ratio: multiTrainRatio,
        val_ratio: multiValRatio,
        epochs: multiEpochs,
        long_threshold: multiLongThreshold,
        short_threshold: multiShortThreshold,
        slippage_bps: multiSlippageBps,
        latency_bars: multiLatencyBars,
        max_drawdown_stop: multiMaxDrawdownStop,
      });
      setMultiReport(result);
    } catch (error) {
      setMultiError(
        getCoinAiErrorMessage(error, "Failed to train multiple symbols", {
          trainLimited: true,
        }),
      );
    } finally {
      setMultiLoading(false);
    }
  }, [
    getCoinAiErrorMessage,
    isTrainCoolingDown,
    multiAlgorithm,
    multiEpochs,
    multiInterval,
    multiLatencyBars,
    multiLimit,
    multiLongThreshold,
    multiMaxDrawdownStop,
    multiMinTrustScore,
    multiShortThreshold,
    multiSlippageBps,
    multiSymbols,
    multiTrainRatio,
    multiValRatio,
    trainCooldownSeconds,
  ]);

  const reportView = useMemo(
    () => (report ? toCoinAIViewModel(report) : null),
    [report],
  );
  const realtimeView = useMemo(
    () => (realtimeReport ? toCoinAIViewModel(realtimeReport) : null),
    [realtimeReport],
  );

  const multiSignals = useMemo(
    () => (multiReport?.signals ?? []).slice(0, 12),
    [multiReport],
  );

  const filteredWatchlist = useMemo(() => {
    const keyword = deferredWatchlistQuery.trim().toUpperCase();
    if (!keyword) return safeWatchlist;
    return safeWatchlist.filter((symbol) => symbol.includes(keyword));
  }, [deferredWatchlistQuery, safeWatchlist]);

  const mergedAddSymbolOptions = useMemo(() => {
    const optionsByValue = new Map(
      addSymbolOptions.map((option) => [option.value, option]),
    );
    const normalizedAddValue = normalizeSymbolSearchQuery(addValue);
    if (normalizedAddValue && !optionsByValue.has(normalizedAddValue)) {
      optionsByValue.set(normalizedAddValue, toSymbolOption(normalizedAddValue));
    }
    return Array.from(optionsByValue.values());
  }, [addSymbolOptions, addValue]);

  const symbolOptions = useMemo(
    () =>
      safeWatchlist.map((symbol) => ({
        label: symbol,
        value: symbol,
      })),
    [safeWatchlist],
  );

  const realtimeSymbolOptions = useMemo(() => {
    const values = Array.from(
      new Set([...safeWatchlist, realtimeSymbol].filter(Boolean)),
    );
    return values.map((symbol) => ({ label: symbol, value: symbol }));
  }, [realtimeSymbol, safeWatchlist]);

  const intervalSelectOptions = useMemo(
    () =>
      INTERVALS.map((interval) => ({
        label: interval,
        value: interval,
      })),
    [],
  );

  const algorithmSelectOptions = useMemo(
    () =>
      ALGORITHMS.map((algorithm) => ({
        label: algorithm.toUpperCase(),
        value: algorithm,
      })),
    [],
  );

  const quickIntervalOptions = useMemo(
    () =>
      QUICK_INTERVALS.map((interval) => ({ label: interval, value: interval })),
    [],
  );

  const symbolTrustScores = useMemo(() => {
    const trustMap = new Map<string, number>();
    const upsertTrust = (
      symbol: string | undefined,
      score: number | undefined,
    ) => {
      if (!symbol || typeof score !== "number") return;
      const current = trustMap.get(symbol);
      trustMap.set(symbol, Math.max(current ?? 0, score));
    };

    upsertTrust(report?.symbol, report?.reliability?.score);
    upsertTrust(realtimeReport?.symbol, realtimeReport?.reliability?.score);
    for (const signal of multiReport?.signals ?? []) {
      upsertTrust(signal.symbol, signal.reliability?.score);
    }
    return trustMap;
  }, [multiReport, realtimeReport, report]);

  const analysisLogs = useMemo(() => {
    const logs: string[] = [];
    if (report) {
      logs.push(
        `${formatGeneratedAt(report.generated_at)} · ${report.symbol} ${report.interval} · ${report.signal} (${Math.round(report.reliability.score * 100)}% trust) · model ${report.model_algorithm.toUpperCase()}`,
      );
      if (report.raw_signal !== report.signal) {
        logs.push(
          `Signal adjusted: ${report.raw_signal} -> ${report.signal} · ${reliabilityReasonText(report.reliability.adjustment_reason)}`,
        );
      }
      if (report.backtest.stopped_by_risk) {
        logs.push(`Risk stop triggered on latest analysis for ${report.symbol}`);
      }
      if (report.orderbook_anomaly?.is_anomalous) {
        logs.push(
          `Order-book anomaly detected for ${report.symbol}: imbalance ${formatPercent(report.orderbook_anomaly.imbalance, 1)}`,
        );
      }
    }
    if (realtimeReport) {
      logs.push(
        `Realtime latest: ${realtimeReport.symbol} ${realtimeReport.interval} · ${realtimeReport.signal} (${Math.round(realtimeReport.reliability.score * 100)}% trust) · model ${realtimeReport.model_algorithm.toUpperCase()}`,
      );
    }
    if (realtimeStatus) {
      logs.push(
        `Realtime status: ${realtimeStatus}${realtimeStreaming ? " (streaming)" : ""}`,
      );
    }
    if (realtimeUpdates > 0) {
      logs.push(`Realtime updates received: ${realtimeUpdates}`);
    }
    if (multiReport) {
      logs.push(
        `Multi-symbol training completed: ${multiReport.symbols.length} symbols on ${formatGeneratedAt(multiReport.generated_at)} · model ${multiReport.model_algorithm.toUpperCase()}`,
      );
      if (multiReport.backtest.stopped_by_risk) {
        logs.push("Multi-symbol backtest triggered risk stop");
      }
    }
    if (errorTrain) logs.push(`Analyze error: ${errorTrain}`);
    if (realtimeError) logs.push(`Realtime error: ${realtimeError}`);
    if (multiError) logs.push(`Multi-train error: ${multiError}`);
    return logs;
  }, [
    errorTrain,
    multiError,
    multiReport,
    realtimeError,
    realtimeReport,
    realtimeStatus,
    realtimeStreaming,
    realtimeUpdates,
    report,
  ]);

  const analysisTabs = useMemo<NonNullable<TabsProps["items"]>>(() => {
    if (!report) return [];
    const viewModel: CoinAIViewModel = reportView ?? toCoinAIViewModel(report);
    const reliability = report.reliability;
    const adjustmentReason = reliabilityReasonText(
      reliability.adjustment_reason,
    );
    const adjusted = shouldRenderAdjustmentReason(
      viewModel.rawSignal,
      viewModel.signal,
    );

    const metricRows = [
      {
        label: "Candles",
        value: `${report.candles}`,
        positive: null,
      },
      {
        label: "Train / Val / Test",
        value: `${report.train_samples} / ${report.val_samples} / ${report.test_samples}`,
        positive: null,
      },
      {
        label: "Best Epoch",
        value: `${report.best_epoch}`,
        positive: null,
      },
      {
        label: "Train Loss",
        value: formatDecimal(report.train_loss, 6),
        positive: null,
      },
      {
        label: "Val Loss",
        value: formatDecimal(report.val_loss, 6),
        positive: null,
      },
      {
        label: "Test MSE",
        value: formatDecimal(report.test_mse, 6),
        positive: null,
      },
      {
        label: "Total Return",
        value: fmtSignedPercent(report.backtest.total_return),
        positive: report.backtest.total_return >= 0,
      },
      {
        label: "Win Rate",
        value: `${(report.backtest.win_rate * 100).toFixed(1)}%`,
        positive: true,
      },
      {
        label: "Sharpe",
        value: report.backtest.sharpe.toFixed(2),
        positive: report.backtest.sharpe >= 0,
      },
      {
        label: "Max Drawdown",
        value: fmtSignedPercent(report.backtest.max_drawdown),
        positive: false,
      },
      {
        label: "Trades",
        value: `${report.backtest.trades}`,
        positive: null,
      },
      {
        label: "Directional Accuracy",
        value: `${(report.test_directional_acc * 100).toFixed(1)}%`,
        positive: true,
      },
    ];

    return [
      {
        key: "overview",
        label: "Overview",
        children: (
          <Space orientation="vertical" size={8} style={{ width: "100%" }}>
            <Flex gap={6} wrap="wrap" className={styles.overviewTagRow}>
              <Tag
                color={SIG_CLR[viewModel.signal]}
              >{`Signal ${viewModel.signal}`}</Tag>
              <Tag color={reliabilityBadgeColor(reliability)}>
                {`Reliability ${Math.round(reliability.score * 100)}%`}
              </Tag>
              <Tag color={reliability.is_trusted ? "green" : "volcano"}>
                {reliability.is_trusted ? "Trusted" : "Not trusted"}
              </Tag>
              <Tag>{`Algorithm ${viewModel.modelAlgorithm.toUpperCase()}`}</Tag>
              {viewModel.orderBookAnomalous && (
                <Tag color="gold">Order-book anomaly</Tag>
              )}
              {viewModel.riskStopped && <Tag color="volcano">Risk stop hit</Tag>}
            </Flex>
            {renderContextAlerts({
              adjusted,
              adjustmentReason,
              riskStopped: viewModel.riskStopped,
              orderBook: report.orderbook_anomaly,
            })}
            {renderMetricGrid([
              {
                label: "Predicted Return",
                value: fmtSignedPercent(viewModel.nextPredictedReturn),
                positive: viewModel.nextPredictedReturn >= 0,
              },
              {
                label: "Win Rate",
                value: formatPercent(report.backtest.win_rate, 1),
                positive: true,
              },
              {
                label: "Directional Acc",
                value: formatPercent(report.test_directional_acc, 1),
                positive: true,
              },
              {
                label: "Sharpe",
                value: report.backtest.sharpe.toFixed(2),
                positive: report.backtest.sharpe >= 0,
              },
            ])}
          </Space>
        ),
      },
      {
        key: "signals",
        label: "Signals",
        children: (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            <Flex gap={8} wrap="wrap">
              <Tag>{`Raw ${viewModel.rawSignal} -> Final ${viewModel.signal}`}</Tag>
              <Tag>{`Threshold L ${formatThreshold(viewModel.thresholds.long)} / S ${formatThreshold(viewModel.thresholds.short)}`}</Tag>
              <Tag>{`Min trust ${viewModel.minTrustedScore.toFixed(2)}`}</Tag>
              <Tag color={viewModel.optimizationUsed ? "blue" : "default"}>
                {viewModel.optimizationUsed
                  ? "Threshold optimization ON"
                  : "Threshold optimization OFF"}
              </Tag>
              {adjusted && (
                <Tag color="volcano">
                  {`Adjustment: ${adjustmentReason}`}
                </Tag>
              )}
            </Flex>
            {renderMetricGrid([
              {
                label: "Reliability Score",
                value: formatPercent(reliability.score, 1),
                positive: reliability.is_trusted ? true : false,
              },
              {
                label: "Level",
                value: reliability.level,
                positive:
                  reliability.level === "HIGH"
                    ? true
                    : reliability.level === "LOW"
                      ? false
                      : null,
              },
              {
                label: "Trusted",
                value: reliability.is_trusted ? "Yes" : "No",
                positive: reliability.is_trusted,
              },
              {
                label: "Reason",
                value: adjusted ? adjustmentReason : viewModel.scoreReason,
                positive: null,
              },
            ])}
            {renderReliabilityBreakdown(reliability)}
          </Space>
        ),
      },
      {
        key: "metrics",
        label: "Metrics",
        children: (
          <div className={`${styles.dataList} ${styles.metricListGrid}`}>
            {metricRows.map((item) => (
              <div
                key={item.label}
                className={`${styles.dataListItem} ${styles.metricListItem}`}
              >
                <Flex justify="space-between" style={{ width: "100%" }}>
                  <Typography.Text type="secondary">
                    {item.label}
                  </Typography.Text>
                  <Typography.Text
                    className={metricToneClass(item.positive)}
                  >
                    {item.value}
                  </Typography.Text>
                </Flex>
              </div>
            ))}
          </div>
        ),
      },
      {
        key: "optimization",
        label: "Optimization",
        children: renderThresholdOptimizationPanel(report.threshold_optimization, {
          long: viewModel.thresholds.long,
          short: viewModel.thresholds.short,
        }),
      },
      {
        key: "risk",
        label: "Risk",
        children: (
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            {renderContextAlerts({
              adjusted,
              adjustmentReason,
              riskStopped: report.backtest.stopped_by_risk,
              orderBook: report.orderbook_anomaly,
            })}
            <Typography.Text type="secondary" className={styles.secondaryText}>
              Backtest risk context
            </Typography.Text>
            {renderBacktestSnapshot(report.backtest, { includeRiskStop: true })}
            <Typography.Text type="secondary" className={styles.secondaryText}>
              Order-book context
            </Typography.Text>
            {renderOrderBookPanel(report.orderbook_anomaly)}
          </Space>
        ),
      },
      {
        key: "logs",
        label: "Logs",
        children:
          analysisLogs.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No logs yet"
            />
          ) : (
            <div className={styles.dataList}>
              {analysisLogs.map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className={`${styles.dataListItem} ${styles.logListItem}`}
                >
                  <Typography.Text className={styles.logText}>
                    {line}
                  </Typography.Text>
                </div>
              ))}
            </div>
          ),
      },
    ];
  }, [analysisLogs, report, reportView]);

  return (
    <Layout className={styles.pageLayout}>
      {contextHolder}

      <Sider
        width={300}
        breakpoint="lg"
        collapsedWidth={0}
        collapsed={siderCollapsed}
        onBreakpoint={(broken) => setSiderCollapsed(broken)}
        onCollapse={(collapsed) => setSiderCollapsed(collapsed)}
        trigger={null}
        className={styles.watchlistSider}
      >
        <div className={styles.siderInner}>
          <Flex
            align="center"
            justify="space-between"
            className={styles.siderHeader}
          >
            <Space align="center" size={4} className={styles.siderHeaderSpace}>
              <Typography.Title level={4} className={styles.siderTitle}>
                Watchlist
              </Typography.Title>
              <Badge count={safeWatchlist.length} showZero />
            </Space>
            <Button
              type="text"
              size="small"
              icon={<SyncOutlined spin={loadingWL} />}
              onClick={() => void loadWatchlist()}
              disabled={loadingWL}
            />
          </Flex>

          <Space
            orientation="vertical"
            size={4}
            style={{ width: "100%" }}
            className={styles.siderInputSpace}
          >
            <Input
              allowClear
              prefix={<SearchOutlined />}
              value={watchlistQuery}
              onChange={(event) => setWatchlistQuery(event.target.value)}
              placeholder="Search symbol (e.g. BTC, SOL, ETH...)"
              size="large"
              className={styles.searchInput}
            />
            <AutoComplete
              value={addValue}
              options={mergedAddSymbolOptions}
              filterOption={false}
              onSearch={handleAddSymbolSearch}
              onChange={(value) => setAddValue(normalizeSymbolSearchQuery(value))}
              onSelect={(value) => setAddValue(value.toUpperCase())}
              notFoundContent={addSymbolSearching ? <Spin size="small" /> : null}
              className={styles.searchInput}
            >
              <Input.Search
                onSearch={(value) => {
                  void handleQuickAdd(value);
                }}
                enterButton="Add"
                loading={addLoading}
                placeholder="Add symbol (e.g. BTCUSDT)"
              />
            </AutoComplete>
          </Space>

          {errorWL && (
            <Typography.Text type="danger" className={styles.errorText}>
              {errorWL}
            </Typography.Text>
          )}

          <div className={styles.watchlistList}>
            {loadingWL ? (
              <Flex
                align="center"
                justify="center"
                className={styles.watchlistLoading}
              >
                <Spin size="small" />
              </Flex>
            ) : filteredWatchlist.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  safeWatchlist.length
                    ? watchlistQuery.trim()
                      ? `No symbols found for "${watchlistQuery.trim()}"`
                      : "No matching symbols"
                    : "Watchlist is empty"
                }
              />
            ) : (
              <div className={styles.watchlistListInner}>
                {filteredWatchlist.map((symbol) => {
                  const trustScore = symbolTrustScores.get(symbol);
                  const isActive = selectedAnalysisSymbol === symbol;
                  return (
                    <div
                      key={symbol}
                      className={`${styles.watchlistItem} ${isActive ? styles.watchlistItemActive : ""}`}
                      onClick={() => setActiveSymbol(symbol)}
                    >
                      <Flex
                        align="center"
                        justify="space-between"
                        className={styles.watchlistRow}
                      >
                        <Flex
                          align="center"
                          gap={8}
                          className={styles.watchlistMeta}
                        >
                          <Typography.Text
                            strong
                            className={styles.symbolText}
                            ellipsis={{ tooltip: symbol }}
                          >
                            {symbol}
                          </Typography.Text>
                          <Tag
                            className={styles.watchlistTrustTag}
                            color={trustTagColor(
                              trustScore,
                              trainMinTrustScore,
                            )}
                          >
                            {trustLabel(trustScore)}
                          </Tag>
                        </Flex>
                        <Button
                          type={isActive ? "primary" : "default"}
                          size="small"
                          className={styles.watchlistAnalyzeButton}
                          loading={
                            loadingTrain && selectedAnalysisSymbol === symbol
                          }
                          disabled={isTrainCoolingDown}
                          onClick={(event) => {
                            event.stopPropagation();
                            void runTrain(symbol, analysisInterval);
                          }}
                        >
                          Analyze
                        </Button>
                      </Flex>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Sider>

      <Layout className={styles.mainLayout}>
        <Content className={styles.mainContent}>
          <div className={styles.contentWrap}>
            {isTrainCoolingDown && (
              <Card
                size="small"
                className={`${styles.surfaceCard} ${styles.cooldownCard}`}
              >
                <Typography.Text type="warning">
                  Too many CoinAI train requests. Retry in{" "}
                  {trainCooldownSeconds}s.
                </Typography.Text>
              </Card>
            )}

            <Card
              size="small"
              className={`${styles.surfaceCard} ${styles.controlCard}`}
            >
              <Space
                orientation="vertical"
                size={10}
                style={{ width: "100%" }}
                className={styles.controlStack}
              >
                <Flex
                  align="flex-end"
                  gap={12}
                  wrap={screens.xxl ? "nowrap" : "wrap"}
                  className={styles.controlRow}
                >
                  {!screens.lg && (
                    <Button
                      type="default"
                      icon={<MenuOutlined />}
                      onClick={() => setSiderCollapsed((prev) => !prev)}
                      className={styles.menuButton}
                    />
                  )}

                  <div className={styles.controlGroup}>
                    <Typography.Text className={styles.fieldLabel}>
                      Symbol
                    </Typography.Text>
                    <Select
                      showSearch
                      value={selectedAnalysisSymbol ?? undefined}
                      onChange={(value) => setActiveSymbol(value)}
                      options={symbolOptions}
                      placeholder="Select symbol"
                      className={styles.fieldControl}
                    />
                  </div>

                  <div
                    className={`${styles.controlGroup} ${styles.segmentedControl}`}
                  >
                    <Typography.Text className={styles.fieldLabel}>
                      Interval
                    </Typography.Text>
                    <Segmented
                      options={quickIntervalOptions}
                      value={analysisInterval}
                      onChange={(value) => setAnalysisInterval(value as Interval)}
                      size="large"
                    />
                  </div>

                  <div
                    className={`${styles.controlGroup} ${styles.segmentedControl}`}
                  >
                    <Typography.Text className={styles.fieldLabel}>
                      Algorithm
                    </Typography.Text>
                    <Segmented
                      options={algorithmSelectOptions}
                      value={trainAlgorithm}
                      onChange={(value) =>
                        setTrainAlgorithm(value as CoinAIAlgorithm)
                      }
                      size="large"
                    />
                  </div>

                  <div
                    className={`${styles.controlGroup} ${styles.trustControlGroup}`}
                  >
                    <Typography.Text className={styles.fieldLabel}>
                      Min trust score
                    </Typography.Text>
                    <Flex align="center" gap={8} className={styles.trustControl}>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={trainMinTrustScore}
                        onChange={(value) => {
                          if (typeof value === "number") {
                            setTrainMinTrustScore(value);
                          }
                        }}
                        className={styles.trustSlider}
                      />
                      <InputNumber
                        min={0}
                        max={1}
                        step={0.01}
                        value={trainMinTrustScore}
                        onChange={(value) =>
                          setTrainMinTrustScore(
                            typeof value === "number"
                              ? value
                              : DEFAULT_MIN_TRUST_SCORE,
                          )
                        }
                        className={styles.trustInput}
                      />
                    </Flex>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<RobotOutlined />}
                    loading={loadingTrain}
                    disabled={!selectedAnalysisSymbol || isTrainCoolingDown}
                    onClick={handleAnalyzeSelected}
                    className={styles.analyzeButton}
                  >
                    Analyze
                  </Button>
                </Flex>

                <Collapse
                  size="small"
                  className={styles.advancedCollapse}
                  items={[
                    {
                      key: "analysis-advanced",
                      label: "Advanced train params",
                      children: (
                        <Row gutter={[12, 12]} className={styles.advancedParamsGrid}>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Limit
                              </Typography.Text>
                              <InputNumber
                                min={50}
                                max={1000}
                                value={trainLimit}
                                onChange={(value) =>
                                  setTrainLimit(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_LIMIT,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Train ratio
                              </Typography.Text>
                              <InputNumber
                                min={0.01}
                                max={0.99}
                                step={0.01}
                                value={trainTrainRatio}
                                onChange={(value) =>
                                  setTrainTrainRatio(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_TRAIN_RATIO,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Val ratio
                              </Typography.Text>
                              <InputNumber
                                min={0}
                                max={0.99}
                                step={0.01}
                                value={trainValRatio}
                                onChange={(value) =>
                                  setTrainValRatio(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_VAL_RATIO,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Epochs
                              </Typography.Text>
                              <InputNumber
                                min={1}
                                max={3000}
                                value={trainEpochs}
                                onChange={(value) =>
                                  setTrainEpochs(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_TRAIN_EPOCHS,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Long threshold
                              </Typography.Text>
                              <InputNumber
                                step={0.0001}
                                value={trainLongThreshold}
                                onChange={(value) =>
                                  setTrainLongThreshold(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_LONG_THRESHOLD,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Short threshold
                              </Typography.Text>
                              <InputNumber
                                step={0.0001}
                                value={trainShortThreshold}
                                onChange={(value) =>
                                  setTrainShortThreshold(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_SHORT_THRESHOLD,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Slippage (bps)
                              </Typography.Text>
                              <InputNumber
                                min={0}
                                max={1000}
                                value={trainSlippageBps}
                                onChange={(value) =>
                                  setTrainSlippageBps(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_SLIPPAGE_BPS,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Latency bars
                              </Typography.Text>
                              <InputNumber
                                min={0}
                                max={50}
                                value={trainLatencyBars}
                                onChange={(value) =>
                                  setTrainLatencyBars(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_LATENCY_BARS,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12} lg={8}>
                            <div className={styles.fieldWrap}>
                              <Typography.Text className={styles.fieldLabel}>
                                Max drawdown stop
                              </Typography.Text>
                              <InputNumber
                                min={0}
                                max={1}
                                step={0.01}
                                value={trainMaxDrawdownStop}
                                onChange={(value) =>
                                  setTrainMaxDrawdownStop(
                                    typeof value === "number"
                                      ? value
                                      : DEFAULT_MAX_DRAWDOWN_STOP,
                                  )
                                }
                                className={styles.fieldControl}
                              />
                            </div>
                          </Col>
                        </Row>
                      ),
                    },
                  ]}
                />
              </Space>
            </Card>

            <Card
              title="Analysis"
              extra={
                <Tag
                  color={
                    loadingTrain ? "processing" : report ? "success" : "default"
                  }
                >
                  {loadingTrain ? "Running" : "Idle"}
                </Tag>
              }
              className={`${styles.surfaceCard} ${styles.analysisCard}`}
            >
              {loadingTrain && (
                <Flex
                  align="center"
                  justify="center"
                  className={styles.loadingArea}
                >
                  <Spin size="large" description="Running CoinAI analysis..." />
                </Flex>
              )}

              {!loadingTrain && errorTrain && (
                <Typography.Text type="danger" className={styles.errorText}>
                  {errorTrain}
                </Typography.Text>
              )}

              {!loadingTrain && !report && (
                <Empty
                  image={<BulbOutlined className={styles.analysisEmptyIcon} />}
                  description={
                    <Space orientation="vertical" size={2}>
                      <Typography.Text strong>
                        No analysis result yet
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Run Analyze to generate Overview, Signals, Metrics,
                        Optimization, Risk, and Logs.
                      </Typography.Text>
                    </Space>
                  }
                  className={styles.analysisEmpty}
                >
                  <Button
                    type="primary"
                    onClick={handleAnalyzeSelected}
                    disabled={!selectedAnalysisSymbol || isTrainCoolingDown}
                  >
                    {`Analyze ${selectedAnalysisSymbol ?? "selected symbol"}`}
                  </Button>
                </Empty>
              )}

              {!loadingTrain && report && (
                <Tabs
                  defaultActiveKey="overview"
                  items={analysisTabs}
                  size="large"
                  className={styles.analysisTabs}
                />
              )}
            </Card>

            <div className={styles.trainPanelGrid}>
                <Card
                  title={
                    <Space size={8}>
                      <LineChartOutlined />
                      <span>Realtime Train Stream</span>
                    </Space>
                  }
                  extra={
                    <Badge
                      status={realtimeBadgeStatus(realtimeStatus)}
                      text={realtimeStreaming ? "Running" : "Idle"}
                    />
                  }
                  className={`${styles.surfaceCard} ${styles.zoneCard}`}
                >
                  <Row gutter={[12, 12]} className={styles.trainFieldGrid}>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Symbol
                        </Typography.Text>
                        <Select
                          showSearch
                          value={realtimeSymbol}
                          onChange={(value) => setRealtimeSymbol(value)}
                          options={realtimeSymbolOptions}
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Interval
                        </Typography.Text>
                        <Select
                          value={realtimeInterval}
                          onChange={(value) =>
                            setRealtimeInterval(value as Interval)
                          }
                          options={intervalSelectOptions}
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Algorithm
                        </Typography.Text>
                        <Select
                          value={realtimeAlgorithm}
                          onChange={(value) =>
                            setRealtimeAlgorithm(value as CoinAIAlgorithm)
                          }
                          options={algorithmSelectOptions}
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Min trust score
                        </Typography.Text>
                        <InputNumber
                          min={0}
                          max={1}
                          step={0.01}
                          value={realtimeMinTrustScore}
                          onChange={(value) =>
                            setRealtimeMinTrustScore(
                              typeof value === "number"
                                ? value
                                : DEFAULT_MIN_TRUST_SCORE,
                            )
                          }
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Refresh
                        </Typography.Text>
                        <Input
                          value={realtimeRefresh}
                          onChange={(event) =>
                            setRealtimeRefresh(event.target.value)
                          }
                          placeholder="20s"
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Limit
                        </Typography.Text>
                        <InputNumber
                          min={50}
                          max={1000}
                          value={realtimeLimit}
                          onChange={(value) =>
                            setRealtimeLimit(
                              typeof value === "number" ? value : 500,
                            )
                          }
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Max updates
                        </Typography.Text>
                        <InputNumber
                          min={1}
                          max={1000}
                          value={realtimeMaxUpdates}
                          onChange={(value) =>
                            setRealtimeMaxUpdates(
                              typeof value === "number" ? value : 180,
                            )
                          }
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                  </Row>

                  <Collapse
                    size="small"
                    className={styles.advancedCollapse}
                    items={[
                      {
                        key: "realtime-advanced",
                        label: "Advanced realtime params",
                        children: (
                          <Row
                            gutter={[12, 12]}
                            className={`${styles.advancedParamsGrid} ${styles.trainFieldGrid}`}
                          >
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Train ratio
                                </Typography.Text>
                                <InputNumber
                                  min={0.01}
                                  max={0.99}
                                  step={0.01}
                                  value={realtimeTrainRatio}
                                  onChange={(value) =>
                                    setRealtimeTrainRatio(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_TRAIN_RATIO,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Val ratio
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={0.99}
                                  step={0.01}
                                  value={realtimeValRatio}
                                  onChange={(value) =>
                                    setRealtimeValRatio(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_VAL_RATIO,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Epochs
                                </Typography.Text>
                                <InputNumber
                                  min={1}
                                  max={3000}
                                  value={realtimeEpochs}
                                  onChange={(value) =>
                                    setRealtimeEpochs(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_REALTIME_EPOCHS,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Long threshold
                                </Typography.Text>
                                <InputNumber
                                  step={0.0001}
                                  value={realtimeLongThreshold}
                                  onChange={(value) =>
                                    setRealtimeLongThreshold(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_LONG_THRESHOLD,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Short threshold
                                </Typography.Text>
                                <InputNumber
                                  step={0.0001}
                                  value={realtimeShortThreshold}
                                  onChange={(value) =>
                                    setRealtimeShortThreshold(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_SHORT_THRESHOLD,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Slippage (bps)
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={1000}
                                  value={realtimeSlippageBps}
                                  onChange={(value) =>
                                    setRealtimeSlippageBps(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_SLIPPAGE_BPS,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Latency bars
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={50}
                                  value={realtimeLatencyBars}
                                  onChange={(value) =>
                                    setRealtimeLatencyBars(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_LATENCY_BARS,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Max drawdown stop
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={realtimeMaxDrawdownStop}
                                  onChange={(value) =>
                                    setRealtimeMaxDrawdownStop(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_MAX_DRAWDOWN_STOP,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                          </Row>
                        ),
                      },
                    ]}
                  />

                  <Flex gap={8} wrap="wrap" className={styles.actionRow}>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={startRealtime}
                      disabled={realtimeStreaming || isTrainCoolingDown}
                    >
                      Start
                    </Button>
                    <Button
                      danger
                      icon={<PauseCircleOutlined />}
                      onClick={stopRealtime}
                      disabled={!realtimeStreaming}
                    >
                      Stop
                    </Button>
                    <Tag>{realtimeStatus}</Tag>
                    <Tag>{realtimeUpdates} updates</Tag>
                  </Flex>

                  {realtimeError && (
                    <Typography.Text type="danger" className={styles.errorText}>
                      {realtimeError}
                    </Typography.Text>
                  )}

                  {realtimeReport && (
                    <div className={styles.reportPanel}>
                      <Space
                        orientation="vertical"
                        size={10}
                        style={{ width: "100%" }}
                      >
                        <Flex gap={8} wrap="wrap">
                          <Tag
                            color={
                              SIG_CLR[
                                realtimeView?.signal ?? realtimeReport.signal
                              ]
                            }
                          >
                            {`${realtimeReport.symbol} · ${realtimeView?.rawSignal ?? realtimeReport.raw_signal} -> ${realtimeView?.signal ?? realtimeReport.signal}`}
                          </Tag>
                          <Tag
                            color={reliabilityBadgeColor(realtimeReport.reliability)}
                          >
                            {`${Math.round((realtimeReport.reliability?.score ?? 0) * 100)}% ${realtimeReport.reliability?.level ?? "N/A"}`}
                          </Tag>
                          <Tag>{`Algorithm ${realtimeReport.model_algorithm.toUpperCase()}`}</Tag>
                          <Tag>
                            {`Threshold L ${formatThreshold(realtimeView?.thresholds.long ?? realtimeReport.applied_long_threshold)} / S ${formatThreshold(realtimeView?.thresholds.short ?? realtimeReport.applied_short_threshold)}`}
                          </Tag>
                          <Tag
                            color={
                              realtimeView?.optimizationUsed ? "blue" : "default"
                            }
                          >
                            {realtimeView?.optimizationUsed
                              ? "Threshold optimization ON"
                              : "Threshold optimization OFF"}
                          </Tag>
                        </Flex>

                        {renderContextAlerts({
                          adjusted:
                            realtimeView?.adjusted ??
                            shouldRenderAdjustmentReason(
                              realtimeReport.raw_signal,
                              realtimeReport.signal,
                            ),
                          adjustmentReason: reliabilityReasonText(
                            realtimeReport.reliability.adjustment_reason,
                          ),
                          riskStopped: realtimeReport.backtest.stopped_by_risk,
                          orderBook: realtimeReport.orderbook_anomaly,
                        })}

                        {renderMetricGrid([
                          {
                            label: "Predicted Return",
                            value: fmtSignedPercent(
                              realtimeReport.next_predicted_return,
                              3,
                            ),
                            positive: realtimeReport.next_predicted_return >= 0,
                          },
                          {
                            label: "Reliability",
                            value: `${Math.round((realtimeReport.reliability?.score ?? 0) * 100)}%`,
                            positive: realtimeReport.reliability?.is_trusted,
                          },
                          {
                            label: "Reason",
                            value: reliabilityReasonText(
                              realtimeReport.reliability.adjustment_reason,
                            ),
                            positive: null,
                          },
                          {
                            label: "Updated",
                            value: formatGeneratedAt(realtimeReport.generated_at),
                            positive: null,
                          },
                        ])}

                        <Typography.Text
                          type="secondary"
                          className={styles.secondaryText}
                        >
                          Order-book context
                        </Typography.Text>
                        {renderOrderBookPanel(realtimeReport.orderbook_anomaly)}

                        {realtimeReport.threshold_optimization && (
                          <>
                            <Typography.Text
                              type="secondary"
                              className={styles.secondaryText}
                            >
                              Threshold optimization
                            </Typography.Text>
                            {renderThresholdOptimizationPanel(
                              realtimeReport.threshold_optimization,
                              {
                                long:
                                  realtimeView?.thresholds.long ??
                                  realtimeReport.applied_long_threshold,
                                short:
                                  realtimeView?.thresholds.short ??
                                  realtimeReport.applied_short_threshold,
                              },
                            )}
                          </>
                        )}
                      </Space>
                    </div>
                  )}
                </Card>

                <Card
                  title={
                    <Space size={8}>
                      <RobotOutlined />
                      <span>Multi-symbol Train</span>
                    </Space>
                  }
                  extra={
                    <Badge
                      status={multiLoading ? "processing" : "default"}
                      text={multiLoading ? "Running" : "Idle"}
                    />
                  }
                  className={`${styles.surfaceCard} ${styles.zoneCard}`}
                >
                  <Row gutter={[12, 12]} className={styles.trainFieldGrid}>
                    <Col span={24} className={styles.trainFieldFull}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Symbols (comma separated)
                        </Typography.Text>
                        <Input
                          value={multiSymbols}
                          onChange={(event) =>
                            setMultiSymbols(event.target.value.toUpperCase())
                          }
                          placeholder="BTCUSDT,ETHUSDT,SOLUSDT"
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Interval
                        </Typography.Text>
                        <Select
                          value={multiInterval}
                          onChange={(value) =>
                            setMultiInterval(value as Interval)
                          }
                          options={intervalSelectOptions}
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Algorithm
                        </Typography.Text>
                        <Select
                          value={multiAlgorithm}
                          onChange={(value) =>
                            setMultiAlgorithm(value as CoinAIAlgorithm)
                          }
                          options={algorithmSelectOptions}
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Min trust
                        </Typography.Text>
                        <InputNumber
                          min={0}
                          max={1}
                          step={0.01}
                          value={multiMinTrustScore}
                          onChange={(value) =>
                            setMultiMinTrustScore(
                              typeof value === "number"
                                ? value
                                : DEFAULT_MIN_TRUST_SCORE,
                            )
                          }
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Limit
                        </Typography.Text>
                        <InputNumber
                          min={0}
                          max={1000}
                          value={multiLimit}
                          onChange={(value) =>
                            setMultiLimit(
                              typeof value === "number" ? value : 300,
                            )
                          }
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Train ratio
                        </Typography.Text>
                        <InputNumber
                          min={0}
                          max={0.99}
                          step={0.01}
                          value={multiTrainRatio}
                          onChange={(value) =>
                            setMultiTrainRatio(
                              typeof value === "number" ? value : 0.7,
                            )
                          }
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={12}>
                      <div className={styles.fieldWrap}>
                        <Typography.Text className={styles.fieldLabel}>
                          Epochs
                        </Typography.Text>
                        <InputNumber
                          min={0}
                          max={3000}
                          value={multiEpochs}
                          onChange={(value) =>
                            setMultiEpochs(
                              typeof value === "number" ? value : 800,
                            )
                          }
                          className={styles.fieldControl}
                        />
                      </div>
                    </Col>
                  </Row>

                  <Collapse
                    size="small"
                    className={styles.advancedCollapse}
                    items={[
                      {
                        key: "multi-advanced",
                        label: "Advanced multi params",
                        children: (
                          <Row
                            gutter={[12, 12]}
                            className={`${styles.advancedParamsGrid} ${styles.trainFieldGrid}`}
                          >
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Val ratio
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={0.99}
                                  step={0.01}
                                  value={multiValRatio}
                                  onChange={(value) =>
                                    setMultiValRatio(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_VAL_RATIO,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Long threshold
                                </Typography.Text>
                                <InputNumber
                                  step={0.0001}
                                  value={multiLongThreshold}
                                  onChange={(value) =>
                                    setMultiLongThreshold(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_LONG_THRESHOLD,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Short threshold
                                </Typography.Text>
                                <InputNumber
                                  step={0.0001}
                                  value={multiShortThreshold}
                                  onChange={(value) =>
                                    setMultiShortThreshold(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_SHORT_THRESHOLD,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Slippage (bps)
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={1000}
                                  value={multiSlippageBps}
                                  onChange={(value) =>
                                    setMultiSlippageBps(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_SLIPPAGE_BPS,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Latency bars
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={50}
                                  value={multiLatencyBars}
                                  onChange={(value) =>
                                    setMultiLatencyBars(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_LATENCY_BARS,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div className={styles.fieldWrap}>
                                <Typography.Text className={styles.fieldLabel}>
                                  Max drawdown stop
                                </Typography.Text>
                                <InputNumber
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={multiMaxDrawdownStop}
                                  onChange={(value) =>
                                    setMultiMaxDrawdownStop(
                                      typeof value === "number"
                                        ? value
                                        : DEFAULT_MAX_DRAWDOWN_STOP,
                                    )
                                  }
                                  className={styles.fieldControl}
                                />
                              </div>
                            </Col>
                          </Row>
                        ),
                      },
                    ]}
                  />

                  <Flex gap={8} className={styles.actionRow}>
                    <Button
                      type="primary"
                      icon={<RobotOutlined />}
                      loading={multiLoading}
                      disabled={isTrainCoolingDown}
                      onClick={() => void handleRunMultiTrain()}
                    >
                      Train Multi
                    </Button>
                    {multiReport && (
                      <Tag>{`${multiReport.symbols.length} symbols`}</Tag>
                    )}
                  </Flex>

                  {multiError && (
                    <Typography.Text type="danger" className={styles.errorText}>
                      {multiError}
                    </Typography.Text>
                  )}

                  {multiReport && (
                    <div className={styles.reportPanel}>
                      <Space
                        orientation="vertical"
                        size={10}
                        style={{ width: "100%" }}
                      >
                        <Flex gap={8} wrap="wrap">
                          <Tag>{`${multiReport.symbols.length} symbols`}</Tag>
                          <Tag>{`Algorithm ${multiReport.model_algorithm.toUpperCase()}`}</Tag>
                          <Tag>{`Interval ${multiReport.interval}`}</Tag>
                          <Tag>{`Threshold L ${formatThreshold(multiReport.applied_long_threshold)} / S ${formatThreshold(multiReport.applied_short_threshold)}`}</Tag>
                          <Tag
                            color={
                              multiReport.threshold_optimization?.used
                                ? "blue"
                                : "default"
                            }
                          >
                            {multiReport.threshold_optimization?.used
                              ? "Threshold optimization ON"
                              : "Threshold optimization OFF"}
                          </Tag>
                          {multiReport.backtest.stopped_by_risk && (
                            <Tag color="volcano">Risk stop hit</Tag>
                          )}
                        </Flex>
                        {renderContextAlerts({
                          riskStopped: multiReport.backtest.stopped_by_risk,
                        })}
                        <Typography.Text
                          type="secondary"
                          className={styles.secondaryText}
                        >
                          {`${multiReport.symbols.join(" + ")} · ${multiReport.total_candles} candles · ${multiReport.train_samples} train / ${multiReport.val_samples} val / ${multiReport.test_samples} test · ${formatGeneratedAt(multiReport.generated_at)}`}
                        </Typography.Text>
                        {renderMetricGrid([
                          {
                            label: "Directional Acc",
                            value: formatPercent(multiReport.test_directional_acc, 1),
                            positive: true,
                          },
                          {
                            label: "Test MSE",
                            value: formatDecimal(multiReport.test_mse, 6),
                            positive: null,
                          },
                          {
                            label: "Sharpe",
                            value: multiReport.backtest.sharpe.toFixed(2),
                            positive: multiReport.backtest.sharpe >= 0,
                          },
                          {
                            label: "Best Epoch",
                            value: String(multiReport.best_epoch),
                            positive: null,
                          },
                        ])}
                        {multiReport.threshold_optimization && (
                          <>
                            <Typography.Text
                              type="secondary"
                              className={styles.secondaryText}
                            >
                              Threshold optimization
                            </Typography.Text>
                            {renderThresholdOptimizationPanel(
                              multiReport.threshold_optimization,
                              {
                                long: multiReport.applied_long_threshold,
                                short: multiReport.applied_short_threshold,
                              },
                            )}
                          </>
                        )}
                        <div className={styles.dataList}>
                          {multiSignals.map((signal) => (
                            <div
                              key={signal.symbol}
                              className={`${styles.dataListItem} ${styles.multiSignalItem}`}
                            >
                              <Flex
                                align="center"
                                wrap="wrap"
                                gap={8}
                                className={styles.multiSignalRow}
                              >
                                <Typography.Text
                                  strong
                                  className={styles.multiSignalSymbol}
                                >
                                  {signal.symbol}
                                </Typography.Text>
                                <Space
                                  size={4}
                                  wrap
                                  className={styles.multiSignalMeta}
                                >
                                  <Tag
                                    className={styles.compactTag}
                                    color={SIG_CLR[signal.signal]}
                                  >
                                    {`${signal.raw_signal} -> ${signal.signal}`}
                                  </Tag>
                                  <Tag
                                    className={styles.compactTag}
                                    color={trustTagColor(
                                      signal.reliability?.score,
                                      multiMinTrustScore,
                                    )}
                                  >
                                    {`${trustLabel(signal.reliability?.score)} · ${signal.reliability?.level ?? "N/A"}`}
                                  </Tag>
                                  {signal.orderbook_anomaly?.is_anomalous && (
                                    <Tag
                                      className={styles.compactTag}
                                      color="gold"
                                    >
                                      {`Order-book anomaly ${formatPercent(signal.orderbook_anomaly.imbalance, 1)}`}
                                    </Tag>
                                  )}
                                  {shouldRenderAdjustmentReason(
                                    signal.raw_signal,
                                    signal.signal,
                                  ) && (
                                    <Tag
                                      className={styles.compactTag}
                                      color="volcano"
                                    >
                                      {reliabilityReasonText(
                                        signal.reliability.adjustment_reason,
                                      )}
                                    </Tag>
                                  )}
                                  <Typography.Text
                                    className={
                                      signal.next_predicted_return >= 0
                                        ? `${styles.metricPositive} ${styles.multiSignalReturn}`
                                        : `${styles.metricNegative} ${styles.multiSignalReturn}`
                                    }
                                  >
                                    {fmtSignedPercent(
                                      signal.next_predicted_return,
                                      3,
                                    )}
                                  </Typography.Text>
                                </Space>
                              </Flex>
                              {(shouldRenderAdjustmentReason(
                                signal.raw_signal,
                                signal.signal,
                              ) ||
                                signal.orderbook_anomaly) && (
                                <Typography.Text
                                  type="secondary"
                                  className={styles.signalNote}
                                >
                                  {[
                                    shouldRenderAdjustmentReason(
                                      signal.raw_signal,
                                      signal.signal,
                                    )
                                      ? `Adjustment: ${reliabilityReasonText(
                                          signal.reliability.adjustment_reason,
                                        )}`
                                      : null,
                                    signal.orderbook_anomaly
                                      ? `Order-book ${signal.orderbook_anomaly.is_anomalous ? "anomalous" : "clear"} · imbalance ${formatPercent(signal.orderbook_anomaly.imbalance, 1)}`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </Typography.Text>
                              )}
                            </div>
                          ))}
                        </div>
                      </Space>
                    </div>
                  )}
                </Card>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
