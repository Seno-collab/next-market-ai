"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	BulbOutlined,
	DeleteOutlined,
	EyeOutlined,
	LineChartOutlined,
	PauseCircleOutlined,
	PlayCircleOutlined,
	PlusOutlined,
	RobotOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import {
	Button,
	Form,
	Input,
	InputNumber,
	Modal,
	Segmented,
	Spin,
	Tag,
	Typography,
	message,
} from "antd";
import { coinAiApi, isCoinAiRequestError } from "@/lib/api/coinai";
import SymbolSearch from "@/features/trading/components/SymbolSearch";
import type {
	CoinAIAlgorithm,
	CoinAISignal,
	MultiTrainReport,
	SignalReliability,
	TrainReport,
} from "@/types/trading";

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
const ALGORITHMS = ["auto", "linear", "ensemble"] as const;
type ModelAlgorithm = (typeof ALGORITHMS)[number];
const SYMBOL_REGEX = /^[A-Z0-9]{5,20}$/;
const REFRESH_REGEX = /^(\d+)([sm])$/i;
const MAX_REFRESH_MS = 10 * 60 * 1000;
const MIN_REFRESH_MS = 5 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 5 * 1000;
const DEFAULT_MIN_TRUST_SCORE = 0.58;

const SIG_CLR: Record<CoinAISignal, string> = {
	BUY: "#34d399",
	SELL: "#f87171",
	HOLD: "#94a3b8",
};
const SIG_BG: Record<CoinAISignal, string> = {
	BUY: "rgba(52,211,153,0.1)",
	SELL: "rgba(248,113,113,0.1)",
	HOLD: "rgba(148,163,184,0.07)",
};

function StatCard({
	label,
	value,
	accent,
}: {
	label: string;
	value: string | number;
	accent?: string;
}) {
	return (
		<div
			className="ci-stat"
			style={{ "--ci-stat-accent": accent } as React.CSSProperties}
		>
			<span className="ci-stat-label">{label}</span>
			<span className="ci-stat-val">{value}</span>
		</div>
	);
}

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

function reliabilityLevelColor(level?: SignalReliability["level"]) {
	if (level === "HIGH") return "green";
	if (level === "MEDIUM") return "gold";
	if (level === "LOW") return "red";
	return "default";
}

function reliabilityReasonText(reliability?: SignalReliability) {
	if (!reliability) return "Reliability data unavailable";
	switch (reliability.adjustment_reason) {
		case "trusted":
			return "Signal passed trust gate";
		case "hold_signal":
			return "Model output is HOLD";
		case "score_below_threshold":
			return "Signal downgraded: reliability below threshold";
		case "weak_signal_strength":
			return "Signal downgraded: weak signal strength";
		default:
			return reliability.is_trusted
				? "Signal trusted"
				: "Signal not trusted by reliability gate";
	}
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

export default function CoinAIPage() {
	const [watchlist, setWatchlist] = useState<string[]>([]);
	const [loadingWL, setLoadingWL] = useState(false);
	const [errorWL, setErrorWL] = useState<string | null>(null);

	const [report, setReport] = useState<TrainReport | null>(null);
	const [loadingTrain, setLoadingTrain] = useState(false);
	const [errorTrain, setErrorTrain] = useState<string | null>(null);
	const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
	const [trainAlgorithm, setTrainAlgorithm] = useState<CoinAIAlgorithm>("auto");
	const [trainMinTrustScore, setTrainMinTrustScore] = useState(
		DEFAULT_MIN_TRUST_SCORE,
	);

	const [addOpen, setAddOpen] = useState(false);
	const [addSymbol, setAddSymbol] = useState("BTCUSDT");
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
	const [realtimeReport, setRealtimeReport] = useState<TrainReport | null>(null);
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
	const [trainCooldownUntil, setTrainCooldownUntil] = useState<number | null>(null);
	const [cooldownNow, setCooldownNow] = useState(Date.now());

	const [messageApi, contextHolder] = message.useMessage();
	const realtimeStopRef = useRef<(() => void) | null>(null);
	const loginRedirectingRef = useRef(false);
	const safeWatchlist = Array.isArray(watchlist) ? watchlist : [];
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
			if (isCoinAiRequestError(error)) {
				if (error.status === 401) {
					handleAuthRequired();
					return "Authentication required";
				}
				if (error.status === 429 && options?.trainLimited) {
					triggerTrainCooldown(error.retryAfterMs);
					return "Too many CoinAI train requests. Retry in a few seconds.";
				}
				if (error.status === 503 && /rate limiter unavailable/i.test(error.message)) {
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
				prev && symbols.includes(prev) ? prev : symbols[0] ?? null,
			);
			setRealtimeSymbol((prev) => {
				if (symbols.length === 0) return prev || "BTCUSDT";
				if (!prev) return symbols[0];
				return symbols.includes(prev) ? prev : symbols[0];
			});
		} catch (e) {
			setErrorWL(getCoinAiErrorMessage(e, "Failed to load watchlist"));
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
			} catch (e) {
				setErrorTrain(
					getCoinAiErrorMessage(e, "Unable to train model", {
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
			trainMinTrustScore,
			trainCooldownSeconds,
			trainAlgorithm,
		],
	);

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
				onError: (message) => {
					setRealtimeError(message);
					if (/too many coinai train requests/i.test(message)) {
						triggerTrainCooldown();
					}
					if (
						/(missing|invalid).*(access token|authorization)|unauthorized|authentication/i.test(
							message,
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
		realtimeMinTrustScore,
		realtimeMaxUpdates,
		realtimeRefresh,
		realtimeSymbol,
		stopRealtime,
		trainCooldownSeconds,
		triggerTrainCooldown,
	]);

	async function handleAdd() {
		const symbol = addSymbol.trim().toUpperCase();
		if (!isValidSymbol(symbol)) {
			void messageApi.error("Symbol must match pattern A-Z0-9 (5..20 chars)");
			return;
		}
		setAddLoading(true);
		try {
			await coinAiApi.addToWatchlist({ symbol });
			setAddOpen(false);
			setAddSymbol("BTCUSDT");
			await loadWatchlist();
			void messageApi.success(`${symbol} added to watchlist`);
		} catch (e) {
			void messageApi.error(
				getCoinAiErrorMessage(e, "Failed to add watchlist symbol"),
			);
		} finally {
			setAddLoading(false);
		}
	}

	async function handleRemove(symbol: string) {
		try {
			await coinAiApi.removeFromWatchlist(symbol);
			void messageApi.success(`${symbol} removed`);
			setWatchlist((prev) => prev.filter((s) => s !== symbol));
			if (activeSymbol === symbol) {
				setReport(null);
				setActiveSymbol(null);
			}
		} catch (e) {
			void messageApi.error(
				getCoinAiErrorMessage(e, "Failed to remove watchlist symbol"),
			);
		}
	}

	async function handleRunMultiTrain() {
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
			multiLimit < 50 ||
			multiLimit > 1000
		) {
			setMultiError("Limit must be an integer in range 50..1000");
			return;
		}
		if (
			!Number.isFinite(multiTrainRatio) ||
			multiTrainRatio <= 0 ||
			multiTrainRatio >= 1
		) {
			setMultiError("Train ratio must be in range (0,1)");
			return;
		}
		if (
			!Number.isInteger(multiEpochs) ||
			!Number.isFinite(multiEpochs) ||
			multiEpochs < 1 ||
			multiEpochs > 3000
		) {
			setMultiError("Epochs must be an integer in range 1..3000");
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
		} catch (e) {
			setMultiError(
				getCoinAiErrorMessage(e, "Failed to train multiple symbols", {
					trainLimited: true,
				}),
			);
		} finally {
			setMultiLoading(false);
		}
	}

	const score = report
		? report.signal === "BUY"
			? "#34d399"
			: report.signal === "SELL"
				? "#f87171"
				: "#94a3b8"
		: "#94a3b8";

	const multiSignals = useMemo(
		() => (multiReport?.signals ?? []).slice(0, 12),
		[multiReport],
	);

	return (
		<div className="ci-shell">
			{contextHolder}

			<div className="ci-header">
				<div className="ci-header-left">
					<div className="ci-eyebrow">
						<RobotOutlined /> COIN AI
					</div>
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
			{isTrainCoolingDown && (
				<div className="ci-err-banner">
					<Typography.Text type="warning">
						Too many CoinAI train requests. Retry in {trainCooldownSeconds}s.
					</Typography.Text>
				</div>
			)}

			<div className="ci-layout">
				<div className="ci-panel ci-watchlist-panel">
					<div className="ci-panel-hd">
						<span className="ci-panel-title">
							<EyeOutlined /> Watchlist
						</span>
						<Tag>{safeWatchlist.length} symbols</Tag>
					</div>
					<div className="ci-ctrl">
						<span className="ci-ctrl-label">Single Train Algorithm</span>
						<Segmented
							options={ALGORITHMS.map((item) => ({
								label: item.toUpperCase(),
								value: item,
							}))}
							value={trainAlgorithm}
							onChange={(value) => setTrainAlgorithm(value as CoinAIAlgorithm)}
						/>
					</div>
					<div className="ci-ctrl">
						<span className="ci-ctrl-label">Min Trust Score</span>
						<InputNumber
							min={0}
							max={1}
							step={0.01}
							value={trainMinTrustScore}
							onChange={(value) =>
								setTrainMinTrustScore(
									typeof value === "number" ? value : DEFAULT_MIN_TRUST_SCORE,
								)
							}
						/>
					</div>

					{loadingWL && (
						<div className="ci-center-spin">
							<Spin size="small" />
						</div>
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
							<Button
								size="small"
								icon={<PlusOutlined />}
								onClick={() => setAddOpen(true)}
							>
								Add first symbol
							</Button>
						</div>
					)}

					<div className="ci-wl-list">
						{safeWatchlist.map((sym) => (
							<div
								key={sym}
								className={`ci-wl-row${activeSymbol === sym ? " ci-wl-row-active" : ""}`}
							>
								<div className="ci-wl-info">
									<span className="ci-wl-symbol">{sym}</span>
								</div>
								<div className="ci-wl-actions">
									<Button
										size="small"
										type="primary"
										ghost
										icon={<RobotOutlined />}
										loading={loadingTrain && activeSymbol === sym}
										disabled={isTrainCoolingDown}
										onClick={() => void runTrain(sym, "1h")}
									>
										Analyze
									</Button>
									<Button
										size="small"
										danger
										ghost
										icon={<DeleteOutlined />}
										className="ci-del-btn"
										onClick={() => void handleRemove(sym)}
									/>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="ci-panel ci-result-panel">
					{!report && !loadingTrain && !errorTrain && (
						<div className="ci-result-placeholder">
							<BulbOutlined className="ci-ph-icon" />
							<p className="ci-ph-title">Select a symbol to analyze</p>
							<p className="ci-ph-hint">
								Click &quot;Analyze&quot; on any watchlist item to run the AI
								model
							</p>
						</div>
					)}

					{loadingTrain && (
						<div className="ci-center-spin">
							<Spin size="large" tip="Training AI model...">
								<div className="ci-spin-tip-anchor" />
							</Spin>
						</div>
					)}

					{errorTrain && (
						<div className="ci-err-banner">
							<Typography.Text type="danger">{errorTrain}</Typography.Text>
						</div>
					)}

					{report && !loadingTrain && (
						<>
							<div
								className="ci-signal-banner"
								style={{
									background: SIG_BG[report.signal],
									borderColor: SIG_CLR[report.signal] + "40",
								}}
							>
								<div className="ci-sig-left">
									<div className="ci-sig-symbol">{report.symbol}</div>
									<div className="ci-sig-iv">
										· {report.interval} ·{" "}
										{(report.model_algorithm ?? "auto").toUpperCase()}
									</div>
								</div>
								<div className="ci-sig-center">
									<div
										className="ci-sig-label"
										style={{ color: SIG_CLR[report.signal] }}
									>
										{report.signal}
									</div>
									<div className="ci-sig-iv">
										raw {report.raw_signal} {"->"} final {report.signal}
									</div>
								</div>
								<div className="ci-sig-right">
									<div
										className="ci-conf-ring"
										style={
											{
												"--ring-clr": score,
												"--ring-pct": `${Math.round(report.test_directional_acc * 360)}deg`,
											} as React.CSSProperties
										}
									>
										<span className="ci-conf-num">
											{(report.test_directional_acc * 100).toFixed(1)}%
										</span>
										<span className="ci-conf-lbl">directional acc</span>
									</div>
								</div>
							</div>

							<div className="ci-row-actions">
								<Tag color={reliabilityLevelColor(report.reliability?.level)}>
									Reliability{" "}
									{Math.round((report.reliability?.score ?? 0) * 100)}%
								</Tag>
								<Tag color={report.reliability?.is_trusted ? "green" : "volcano"}>
									{report.reliability?.is_trusted ? "Trusted" : "Not trusted"}
								</Tag>
								<Tag>
									{reliabilityReasonText(report.reliability)} (min{" "}
									{(report.reliability?.min_trusted_score ?? DEFAULT_MIN_TRUST_SCORE).toFixed(2)})
								</Tag>
							</div>

							<div className="ci-kpi-row">
								<StatCard
									label="Predicted Return"
									value={fmtSignedPercent(report.next_predicted_return)}
									accent={
										report.next_predicted_return >= 0 ? "#34d399" : "#f87171"
									}
								/>
								<StatCard
									label="Win Rate"
									value={`${(report.backtest.win_rate * 100).toFixed(1)}%`}
									accent="#7dd3fc"
								/>
								<StatCard
									label="Sharpe Ratio"
									value={report.backtest.sharpe.toFixed(2)}
									accent="#a78bfa"
								/>
								<StatCard
									label="Max Drawdown"
									value={fmtSignedPercent(report.backtest.max_drawdown)}
									accent="#f87171"
								/>
							</div>

							<div className="ci-bt-panel">
								<div className="ci-bt-hd">
									<RobotOutlined /> Backtest Results
								</div>
								<div className="ci-bt-grid">
									<div className="ci-bt-row">
										<span className="ci-bt-k">Total Trades</span>
										<span className="ci-bt-v">{report.backtest.trades}</span>
									</div>
									<div className="ci-bt-row">
										<span className="ci-bt-k">Total Return</span>
										<span
											className={`ci-bt-v ${report.backtest.total_return >= 0 ? "ci-up" : "ci-dn"}`}
										>
											{fmtSignedPercent(report.backtest.total_return)}
										</span>
									</div>
									<div className="ci-bt-row">
										<span className="ci-bt-k">Win Rate</span>
										<span className="ci-bt-v ci-up">
											{(report.backtest.win_rate * 100).toFixed(1)}%
										</span>
									</div>
									<div className="ci-bt-row">
										<span className="ci-bt-k">Sharpe Ratio</span>
										<span className="ci-bt-v">
											{report.backtest.sharpe.toFixed(2)}
										</span>
									</div>
									<div className="ci-bt-row">
										<span className="ci-bt-k">Max Drawdown</span>
										<span className="ci-bt-v ci-dn">
											{fmtSignedPercent(report.backtest.max_drawdown)}
										</span>
									</div>
									<div className="ci-bt-row">
										<span className="ci-bt-k">Generated At</span>
										<span className="ci-bt-v ci-bt-ts">
											{formatGeneratedAt(report.generated_at)}
										</span>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="ci-extra-grid">
				<div className="ci-panel ci-stream-panel">
					<div className="ci-panel-hd">
						<span className="ci-panel-title">
							<LineChartOutlined /> Realtime Train Stream
						</span>
						<Tag color={realtimeStreaming ? "green" : "default"}>
							{realtimeStreaming ? "STREAMING" : "IDLE"}
						</Tag>
					</div>

					<div className="ci-ctrl-grid">
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Symbol</span>
							<SymbolSearch
								value={realtimeSymbol}
								onChangeAction={setRealtimeSymbol}
							/>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Interval</span>
							<Segmented
								options={INTERVALS.map((item) => ({
									label: item.toUpperCase(),
									value: item,
								}))}
								value={realtimeInterval}
								onChange={(value) => setRealtimeInterval(value as Interval)}
							/>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Algorithm</span>
							<Segmented
								options={ALGORITHMS.map((item) => ({
									label: item.toUpperCase(),
									value: item,
								}))}
								value={realtimeAlgorithm}
								onChange={(value) => setRealtimeAlgorithm(value as CoinAIAlgorithm)}
							/>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Min Trust Score</span>
							<InputNumber
								min={0}
								max={1}
								step={0.01}
								value={realtimeMinTrustScore}
								onChange={(value) =>
									setRealtimeMinTrustScore(
										typeof value === "number" ? value : DEFAULT_MIN_TRUST_SCORE,
									)
								}
							/>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Refresh</span>
							<Input
								value={realtimeRefresh}
								onChange={(event) => setRealtimeRefresh(event.target.value)}
								placeholder="20s"
							/>
						</div>
						<div className="ci-ctrl ci-ctrl-row">
							<div className="ci-ctrl-inline">
								<span className="ci-ctrl-label">Limit</span>
								<InputNumber
									min={50}
									max={1000}
									value={realtimeLimit}
									onChange={(value) =>
										setRealtimeLimit(typeof value === "number" ? value : 500)
									}
								/>
							</div>
							<div className="ci-ctrl-inline">
								<span className="ci-ctrl-label">Max Updates</span>
								<InputNumber
									min={1}
									max={1000}
									value={realtimeMaxUpdates}
									onChange={(value) =>
										setRealtimeMaxUpdates(
											typeof value === "number" ? value : 180,
										)
									}
								/>
							</div>
						</div>
					</div>

					<div className="ci-row-actions">
						<Button
							type="primary"
							icon={<PlayCircleOutlined />}
							onClick={startRealtime}
							disabled={realtimeStreaming || isTrainCoolingDown}
						>
							Start Stream
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
					</div>

					{realtimeError && (
						<div className="ci-err-banner">
							<Typography.Text type="danger">{realtimeError}</Typography.Text>
						</div>
					)}

					{realtimeReport && (
						<div className="ci-mini-report">
							<div className="ci-mini-head">
								<div className="ci-mini-symbol">
									{realtimeReport.symbol} · {realtimeReport.interval} ·{" "}
									{(realtimeReport.model_algorithm ?? "linear").toUpperCase()}
								</div>
								<div
									className="ci-mini-signal"
									style={{ color: SIG_CLR[realtimeReport.signal] }}
								>
									{realtimeReport.signal}
								</div>
							</div>
							<div className="ci-mini-grid">
								<div className="ci-mini-item">
									<span>Predicted Return</span>
									<strong
										className={
											realtimeReport.next_predicted_return >= 0 ? "ci-up" : "ci-dn"
										}
									>
										{fmtSignedPercent(realtimeReport.next_predicted_return, 3)}
									</strong>
								</div>
								<div className="ci-mini-item">
									<span>Signals</span>
									<strong>
										{realtimeReport.raw_signal} {"->"} {realtimeReport.signal}
									</strong>
								</div>
								<div className="ci-mini-item">
									<span>Reliability</span>
									<strong>
										{Math.round((realtimeReport.reliability?.score ?? 0) * 100)}% (
										{realtimeReport.reliability?.level ?? "N/A"})
									</strong>
								</div>
								<div className="ci-mini-item">
									<span>Trust Gate</span>
									<strong>{reliabilityReasonText(realtimeReport.reliability)}</strong>
								</div>
								<div className="ci-mini-item">
									<span>Directional Acc</span>
									<strong>
										{(realtimeReport.test_directional_acc * 100).toFixed(1)}%
									</strong>
								</div>
								<div className="ci-mini-item">
									<span>Sharpe</span>
									<strong>{realtimeReport.backtest.sharpe.toFixed(2)}</strong>
								</div>
								<div className="ci-mini-item">
									<span>Updated</span>
									<strong>{formatGeneratedAt(realtimeReport.generated_at)}</strong>
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="ci-panel ci-multi-panel">
					<div className="ci-panel-hd">
						<span className="ci-panel-title">
							<RobotOutlined /> Multi-symbol Train
						</span>
						<Tag>{multiReport?.symbols.length ?? 0} symbols</Tag>
					</div>

					<div className="ci-ctrl-grid">
						<div className="ci-ctrl ci-ctrl-full">
							<span className="ci-ctrl-label">Symbols (comma separated)</span>
							<Input
								value={multiSymbols}
								onChange={(event) => setMultiSymbols(event.target.value.toUpperCase())}
								placeholder="BTCUSDT,ETHUSDT,SOLUSDT"
							/>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Interval</span>
							<Segmented
								options={INTERVALS.map((item) => ({
									label: item.toUpperCase(),
									value: item,
								}))}
								value={multiInterval}
								onChange={(value) => setMultiInterval(value as Interval)}
							/>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Algorithm</span>
							<Segmented
								options={ALGORITHMS.map((item) => ({
									label: item.toUpperCase(),
									value: item,
								}))}
								value={multiAlgorithm}
								onChange={(value) => setMultiAlgorithm(value as CoinAIAlgorithm)}
							/>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Min Trust Score</span>
							<InputNumber
								min={0}
								max={1}
								step={0.01}
								value={multiMinTrustScore}
								onChange={(value) =>
									setMultiMinTrustScore(
										typeof value === "number" ? value : DEFAULT_MIN_TRUST_SCORE,
									)
								}
							/>
						</div>
						<div className="ci-ctrl ci-ctrl-row">
							<div className="ci-ctrl-inline">
								<span className="ci-ctrl-label">Limit</span>
								<InputNumber
									min={50}
									max={1000}
									value={multiLimit}
									onChange={(value) =>
										setMultiLimit(typeof value === "number" ? value : 300)
									}
								/>
							</div>
							<div className="ci-ctrl-inline">
								<span className="ci-ctrl-label">Train Ratio</span>
								<InputNumber
									min={0.01}
									max={0.99}
									step={0.01}
									value={multiTrainRatio}
									onChange={(value) =>
										setMultiTrainRatio(typeof value === "number" ? value : 0.7)
									}
								/>
							</div>
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Epochs</span>
							<InputNumber
								min={1}
								max={3000}
								value={multiEpochs}
								onChange={(value) =>
									setMultiEpochs(typeof value === "number" ? value : 800)
								}
							/>
						</div>
					</div>

					<div className="ci-row-actions">
						<Button
							type="primary"
							icon={<RobotOutlined />}
							loading={multiLoading}
							disabled={isTrainCoolingDown}
							onClick={() => void handleRunMultiTrain()}
						>
							Train Multi
						</Button>
					</div>

					{multiError && (
						<div className="ci-err-banner">
							<Typography.Text type="danger">{multiError}</Typography.Text>
						</div>
					)}

					{multiReport && (
						<div className="ci-multi-wrap">
							<div className="ci-multi-summary">
								{multiReport.symbols.join(" + ")} · {multiReport.total_candles} candles
								{" · "}
								{multiReport.train_samples} train / {multiReport.test_samples} test
								{" · "}generated {formatGeneratedAt(multiReport.generated_at)}
							</div>

							<div className="ci-multi-signals">
								{multiSignals.map((signal) => (
									<div key={signal.symbol} className="ci-multi-signal-card">
										<span className="ci-ms-symbol">{signal.symbol}</span>
										<span
											className="ci-ms-badge"
											style={{
												color: SIG_CLR[signal.signal],
												background: SIG_BG[signal.signal],
											}}
										>
											{signal.signal}
										</span>
										<span
											className={`ci-ms-pct ${signal.next_predicted_return >= 0 ? "ci-up" : "ci-dn"}`}
										>
											{fmtSignedPercent(signal.next_predicted_return, 3)}
										</span>
									</div>
								))}
							</div>

							<div className="ci-kpi-row">
								<StatCard
									label="Directional Acc"
									value={`${(multiReport.test_directional_acc * 100).toFixed(1)}%`}
									accent="#7dd3fc"
								/>
								<StatCard
									label="Sharpe Ratio"
									value={multiReport.backtest.sharpe.toFixed(2)}
									accent="#a78bfa"
								/>
								<StatCard
									label="Return (OOS)"
									value={fmtSignedPercent(multiReport.backtest.total_return)}
									accent={
										multiReport.backtest.total_return >= 0
											? "#34d399"
											: "#f87171"
									}
								/>
								<StatCard
									label="Trades"
									value={multiReport.backtest.trades}
									accent="#f59e0b"
								/>
							</div>
						</div>
					)}
				</div>
			</div>

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
						<SymbolSearch value={addSymbol} onChangeAction={setAddSymbol} />
					</Form.Item>
					<Form.Item style={{ marginBottom: 0 }}>
						<div
							style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
						>
							<Button onClick={() => setAddOpen(false)}>Cancel</Button>
							<Button
								type="primary"
								loading={addLoading}
								onClick={() => void handleAdd()}
							>
								Add Symbol
							</Button>
						</div>
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
}
