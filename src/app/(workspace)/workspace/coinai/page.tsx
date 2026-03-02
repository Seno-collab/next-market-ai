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
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
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
import { toCoinAIViewModel } from "@/lib/coinai-adapter";
import {
  formatPercent,
  reliabilityBadgeColor,
  reliabilityReasonText,
  shouldRenderAdjustmentReason,
} from "@/lib/coinai-ui";
import type {
  CoinAIAlgorithm,
  CoinAISignal,
  MultiTrainReport,
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

const ALGORITHMS = ["auto", "linear", "ensemble"] as const;
type ModelAlgorithm = (typeof ALGORITHMS)[number];

const SYMBOL_REGEX = /^[A-Z0-9]{5,20}$/;
const REFRESH_REGEX = /^(\d+)([sm])$/i;
const MAX_REFRESH_MS = 10 * 60 * 1000;
const MIN_REFRESH_MS = 5 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 5 * 1000;
const DEFAULT_MIN_TRUST_SCORE = 0.58;

const SIG_CLR: Record<CoinAISignal, string> = {
  BUY: "#15803d",
  SELL: "#b91c1c",
  HOLD: "#475569",
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
  if (/stream_opened|stream_done/i.test(status)) return "success";
  if (/stream_starting/i.test(status)) return "processing";
  if (/disconnect/i.test(status)) return "warning";
  if (/error/i.test(status)) return "error";
  return "default";
}

export default function CoinAIPage() {
  const screens = useBreakpoint();
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [addValue, setAddValue] = useState("BTCUSDT");

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
  const [multiEpochs, setMultiEpochs] = useState(800);
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
        setErrorTrain("Algorithm must be auto, linear, or ensemble");
        return;
      }
      if (!isValidTrustScore(trainMinTrustScore)) {
        setErrorTrain("Min trust score must be in range 0..1");
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
            limit: 500,
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
      trainMinTrustScore,
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
      setRealtimeError("Algorithm must be auto, linear, or ensemble");
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
    realtimeInterval,
    realtimeLimit,
    realtimeMaxUpdates,
    realtimeMinTrustScore,
    realtimeRefresh,
    realtimeSymbol,
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
      setMultiError("Algorithm must be auto, linear, or ensemble");
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
    if (
      !Number.isInteger(multiEpochs) ||
      !Number.isFinite(multiEpochs) ||
      (multiEpochs !== 0 && multiEpochs < 1) ||
      multiEpochs > 3000
    ) {
      setMultiError("Epochs must be 0 or an integer in range 1..3000");
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
        epochs: multiEpochs,
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
    multiLimit,
    multiMinTrustScore,
    multiSymbols,
    multiTrainRatio,
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
        `${formatGeneratedAt(report.generated_at)} · ${report.symbol} ${report.interval} · ${report.signal} (${Math.round(report.reliability.score * 100)}% trust)`,
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
        `Multi-symbol training completed: ${multiReport.symbols.length} symbols on ${formatGeneratedAt(multiReport.generated_at)}`,
      );
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
    realtimeStatus,
    realtimeStreaming,
    realtimeUpdates,
    report,
  ]);

  const analysisTabs = useMemo<NonNullable<TabsProps["items"]>>(() => {
    if (!report) return [];
    const viewModel = reportView ?? toCoinAIViewModel(report);
    const reliability = report.reliability;

    const metricRows = [
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
        positive: true,
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
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Flex gap={8} wrap="wrap">
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
            </Flex>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={12}>
                <Card size="small" className={styles.metricCard}>
                  <Typography.Text type="secondary">
                    Predicted Return
                  </Typography.Text>
                  <Typography.Text
                    className={
                      report.next_predicted_return >= 0
                        ? styles.metricPositive
                        : styles.metricNegative
                    }
                  >
                    {fmtSignedPercent(report.next_predicted_return)}
                  </Typography.Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" className={styles.metricCard}>
                  <Typography.Text type="secondary">Win Rate</Typography.Text>
                  <Typography.Text className={styles.metricPositive}>
                    {(report.backtest.win_rate * 100).toFixed(1)}%
                  </Typography.Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" className={styles.metricCard}>
                  <Typography.Text type="secondary">
                    Directional Acc
                  </Typography.Text>
                  <Typography.Text>
                    {(report.test_directional_acc * 100).toFixed(1)}%
                  </Typography.Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" className={styles.metricCard}>
                  <Typography.Text type="secondary">Sharpe</Typography.Text>
                  <Typography.Text>
                    {report.backtest.sharpe.toFixed(2)}
                  </Typography.Text>
                </Card>
              </Col>
            </Row>
          </Space>
        ),
      },
      {
        key: "signals",
        label: "Signals",
        children: (
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Flex gap={8} wrap="wrap">
              <Tag>{`Raw ${viewModel.rawSignal} -> Final ${viewModel.signal}`}</Tag>
              <Tag>{`Threshold L ${formatThreshold(viewModel.thresholds.long)} / S ${formatThreshold(viewModel.thresholds.short)}`}</Tag>
              <Tag>{`Min trust ${(reliability.min_trusted_score ?? DEFAULT_MIN_TRUST_SCORE).toFixed(2)}`}</Tag>
              <Tag color={viewModel.optimizationUsed ? "blue" : "default"}>
                {viewModel.optimizationUsed
                  ? "Threshold optimization ON"
                  : "Threshold optimization OFF"}
              </Tag>
              {shouldRenderAdjustmentReason(
                viewModel.rawSignal,
                viewModel.signal,
              ) && (
                <Tag color="volcano">
                  {`Adjustment: ${reliabilityReasonText(reliability.adjustment_reason)}`}
                </Tag>
              )}
            </Flex>
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
          </Space>
        ),
      },
      {
        key: "metrics",
        label: "Metrics",
        children: (
          <div className={styles.dataList}>
            {metricRows.map((item) => (
              <div key={item.label} className={styles.dataListItem}>
                <Flex justify="space-between" style={{ width: "100%" }}>
                  <Typography.Text type="secondary">
                    {item.label}
                  </Typography.Text>
                  <Typography.Text
                    className={
                      item.positive
                        ? styles.metricPositive
                        : styles.metricNegative
                    }
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
            <Input.Search
              value={addValue}
              onChange={(event) =>
                setAddValue(event.target.value.toUpperCase())
              }
              onSearch={(value) => {
                void handleQuickAdd(value);
              }}
              enterButton="Add"
              loading={addLoading}
              placeholder="Add symbol (e.g. BTCUSDT)"
              className={styles.searchInput}
            />
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
                        Run Analyze to generate Overview, Signals, Metrics, and
                        Logs.
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

            <Row gutter={[16, 16]}>
              <Col xs={24} md={24} lg={12}>
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
                  <Row gutter={[12, 12]}>
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
                    <Card size="small" className={styles.subCard}>
                      <Row gutter={[12, 12]}>
                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary">
                            Signal
                          </Typography.Text>
                          <Typography.Text
                            className={styles.metricValue}
                            style={{
                              color:
                                SIG_CLR[
                                  realtimeView?.signal ?? realtimeReport.signal
                                ],
                            }}
                          >
                            {`${realtimeReport.symbol} · ${realtimeView?.signal ?? realtimeReport.signal}`}
                          </Typography.Text>
                        </Col>
                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary">
                            Predicted Return
                          </Typography.Text>
                          <Typography.Text
                            className={
                              realtimeReport.next_predicted_return >= 0
                                ? styles.metricPositive
                                : styles.metricNegative
                            }
                          >
                            {fmtSignedPercent(
                              realtimeReport.next_predicted_return,
                              3,
                            )}
                          </Typography.Text>
                        </Col>
                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary">
                            Reliability
                          </Typography.Text>
                          <Typography.Text className={styles.metricValue}>
                            {`${Math.round((realtimeReport.reliability?.score ?? 0) * 100)}% (${realtimeReport.reliability?.level ?? "N/A"})`}
                          </Typography.Text>
                        </Col>
                        <Col xs={24} md={12}>
                          <Typography.Text type="secondary">
                            Updated
                          </Typography.Text>
                          <Typography.Text className={styles.metricValue}>
                            {formatGeneratedAt(realtimeReport.generated_at)}
                          </Typography.Text>
                        </Col>
                      </Row>
                    </Card>
                  )}
                </Card>
              </Col>

              <Col xs={24} md={24} lg={12}>
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
                  <Row gutter={[12, 12]}>
                    <Col span={24}>
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
                    <Card size="small" className={styles.subCard}>
                      <Space
                        orientation="vertical"
                        size={10}
                        style={{ width: "100%" }}
                      >
                        <Typography.Text
                          type="secondary"
                          className={styles.secondaryText}
                        >
                          {`${multiReport.symbols.join(" + ")} · ${multiReport.total_candles} candles · ${multiReport.train_samples} train / ${multiReport.test_samples} test · ${formatGeneratedAt(multiReport.generated_at)}`}
                        </Typography.Text>
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
                                    {trustLabel(signal.reliability?.score)}
                                  </Tag>
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
                            </div>
                          ))}
                        </div>
                      </Space>
                    </Card>
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
