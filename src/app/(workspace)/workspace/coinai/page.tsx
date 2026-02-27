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
	Spin,
	Tag,
	Typography,
	message,
} from "antd";
import { coinAiApi, isCoinAiApiError } from "@/lib/coinai-api";
import { toCoinAIViewModel } from "@/lib/coinai-adapter";
import {
	formatPercent,
	reliabilityBadgeColor,
	reliabilityReasonText,
	shouldRenderAdjustmentReason,
} from "@/lib/coinai-ui";
import SymbolSearch from "@/features/trading/components/SymbolSearch";
import type {
	CoinAIAlgorithm,
	CoinAISignal,
	MultiTrainReport,
	TrainReport,
} from "@/types/coinai";

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


const COMPACT_IV_COUNT = 6;

function IntervalPicker({
	value,
	onChange,
}: {
	value: Interval;
	onChange: (v: Interval) => void;
}) {
	const [open, setOpen] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);
	const compact = INTERVALS.slice(0, COMPACT_IV_COUNT) as unknown as Interval[];
	const more = INTERVALS.slice(COMPACT_IV_COUNT) as unknown as Interval[];
	const activeInMore = (more as string[]).includes(value);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<div className="ci-period-row">
			{compact.map((iv) => (
				<button
					key={iv}
					className={`ci-period-btn${value === iv ? " ci-period-active" : ""}`}
					onClick={() => onChange(iv)}
				>
					{iv}
				</button>
			))}
			<div className="ci-period-more-wrap" ref={wrapRef}>
				<button
					type="button"
					className={`ci-period-more-btn${activeInMore ? " is-active" : ""}${open ? " is-open" : ""}`}
					onClick={() => setOpen((prev) => !prev)}
				>
					{activeInMore ? value : `+${more.length}`}
					<span className="ci-period-more-caret">{open ? "^" : "v"}</span>
				</button>
				<div className={`ci-period-dropdown${open ? " is-open" : ""}`}>
					{more.map((iv) => (
						<button
							key={iv}
							type="button"
							className={`ci-period-dropdown-item${value === iv ? " is-selected" : ""}`}
							onClick={() => {
								onChange(iv);
								setOpen(false);
							}}
						>
							{iv}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

function AlgorithmPicker({
	value,
	onChange,
}: {
	value: CoinAIAlgorithm;
	onChange: (v: CoinAIAlgorithm) => void;
}) {
	return (
		<div className="ci-period-row">
			{ALGORITHMS.map((alg) => (
				<button
					key={alg}
					className={`ci-period-btn${value === alg ? " ci-period-active" : ""}`}
					onClick={() => onChange(alg)}
				>
					{alg.toUpperCase()}
				</button>
			))}
		</div>
	);
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
			if (isCoinAiApiError(error)) {
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
				onError: (message, status) => {
					setRealtimeError(message);
					if (status === 429 || /too many coinai train requests/i.test(message)) {
						triggerTrainCooldown();
					}
					if (
						status === 401 ||
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
						<AlgorithmPicker value={trainAlgorithm} onChange={setTrainAlgorithm} />
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
									<div className="ci-sig-symbol">
										{reportView?.symbol ?? report.symbol}
									</div>
									<div className="ci-sig-iv">
										· {reportView?.interval ?? report.interval} ·{" "}
										{(reportView?.modelAlgorithm ?? report.model_algorithm ?? "auto").toUpperCase()}
									</div>
								</div>
								<div className="ci-sig-center">
									<div
										className="ci-sig-label"
										style={{
											color: SIG_CLR[reportView?.signal ?? report.signal],
										}}
									>
										{reportView?.signal ?? report.signal}
									</div>
									<div className="ci-sig-iv">
										raw {reportView?.rawSignal ?? report.raw_signal} {"->"} final{" "}
										{reportView?.signal ?? report.signal}
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
								<Tag color={reliabilityBadgeColor(report.reliability)}>
									Reliability {Math.round((report.reliability.score ?? 0) * 100)}%
								</Tag>
								<Tag color={report.reliability?.is_trusted ? "green" : "volcano"}>
									{report.reliability?.is_trusted ? "Trusted" : "Not trusted"}
								</Tag>
								{shouldRenderAdjustmentReason(
									reportView?.rawSignal ?? report.raw_signal,
									reportView?.signal ?? report.signal,
								) && (
									<Tag color="volcano">
										Adjustment:{" "}
										{reliabilityReasonText(report.reliability.adjustment_reason)}
									</Tag>
								)}
								<Tag>
									min trust {(report.reliability.min_trusted_score ?? DEFAULT_MIN_TRUST_SCORE).toFixed(2)}
								</Tag>
								<Tag>
									Thresholds L{" "}
									{formatThreshold(reportView?.thresholds.long ?? report.applied_long_threshold)} / S{" "}
									{formatThreshold(reportView?.thresholds.short ?? report.applied_short_threshold)}
								</Tag>
								{report.threshold_optimization && (
									<Tag color={report.threshold_optimization.used ? "blue" : "default"}>
										Threshold Opt{" "}
										{report.threshold_optimization.used
											? `ON (${report.threshold_optimization.candidate_pairs} pairs)`
											: "OFF"}
									</Tag>
								)}
							</div>
							<div className="ci-row-actions">
								<Tag>
									dir {formatPercent(report.reliability.components.directional_acc_score, 1)}
								</Tag>
								<Tag>err {formatPercent(report.reliability.components.error_score, 1)}</Tag>
								<Tag>
									sharpe {formatPercent(report.reliability.components.sharpe_score, 1)}
								</Tag>
								<Tag>
									dd {formatPercent(report.reliability.components.drawdown_score, 1)}
								</Tag>
								<Tag>
									str {formatPercent(report.reliability.components.signal_strength_score, 1)}
								</Tag>
								<Tag>
									support {formatPercent(report.reliability.components.trade_support_score, 1)}
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
							<IntervalPicker value={realtimeInterval} onChange={setRealtimeInterval} />
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Algorithm</span>
							<AlgorithmPicker value={realtimeAlgorithm} onChange={setRealtimeAlgorithm} />
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
										{realtimeView?.rawSignal ?? realtimeReport.raw_signal} {"->"}{" "}
										{realtimeView?.signal ?? realtimeReport.signal}
									</strong>
								</div>
								<div className="ci-mini-item">
									<span>Thresholds</span>
									<strong>
										L {formatThreshold(realtimeReport.applied_long_threshold)} / S{" "}
										{formatThreshold(realtimeReport.applied_short_threshold)}
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
									<strong>
										{shouldRenderAdjustmentReason(
											realtimeView?.rawSignal ?? realtimeReport.raw_signal,
											realtimeView?.signal ?? realtimeReport.signal,
										)
											? reliabilityReasonText(
													realtimeReport.reliability.adjustment_reason,
												)
											: "No adjustment"}
									</strong>
								</div>
								<div className="ci-mini-item">
									<span>Support Score</span>
									<strong>
										{formatPercent(
											realtimeReport.reliability.components.trade_support_score,
											1,
										)}
									</strong>
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
							<IntervalPicker value={multiInterval} onChange={setMultiInterval} />
						</div>
						<div className="ci-ctrl">
							<span className="ci-ctrl-label">Algorithm</span>
							<AlgorithmPicker value={multiAlgorithm} onChange={setMultiAlgorithm} />
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
									min={0}
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
									min={0}
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
								min={0}
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
								{multiReport.symbols.join(" + ")} · {multiReport.total_candles} candles ·{" "}
								{multiReport.train_samples} train / {multiReport.test_samples} test
								{" · "}
								{(multiReport.model_algorithm ?? multiAlgorithm).toUpperCase()} · L{" "}
								{formatThreshold(multiReport.applied_long_threshold)} / S{" "}
								{formatThreshold(multiReport.applied_short_threshold)}
								{" · "}generated {formatGeneratedAt(multiReport.generated_at)}
							</div>
							{multiReport.threshold_optimization && (
								<div className="ci-multi-summary">
									Threshold optimization:{" "}
									{multiReport.threshold_optimization.used
										? `enabled (${multiReport.threshold_optimization.candidate_pairs} candidate pairs, score ${multiReport.threshold_optimization.score.toFixed(3)})`
										: "not used"}
								</div>
							)}

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
											{signal.raw_signal ?? signal.signal} {"->"} {signal.signal}
										</span>
										<span className="ci-ms-symbol">
											rel {Math.round(((signal.reliability?.score ?? 0) as number) * 100)}% (
											{signal.reliability?.level ?? "N/A"})
										</span>
										{shouldRenderAdjustmentReason(signal.raw_signal, signal.signal) && (
											<span className="ci-ms-symbol">
												{reliabilityReasonText(signal.reliability.adjustment_reason)}
											</span>
										)}
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
