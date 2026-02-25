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
import { coinAiApi } from "@/lib/api/coinai";
import SymbolSearch from "@/features/trading/components/SymbolSearch";
import type {
	CoinAISignal,
	MultiTrainReport,
	TrainReport,
} from "@/types/trading";

const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;
type Interval = (typeof INTERVALS)[number];

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

export default function CoinAIPage() {
	const [watchlist, setWatchlist] = useState<string[]>([]);
	const [loadingWL, setLoadingWL] = useState(false);
	const [errorWL, setErrorWL] = useState<string | null>(null);

	const [report, setReport] = useState<TrainReport | null>(null);
	const [loadingTrain, setLoadingTrain] = useState(false);
	const [errorTrain, setErrorTrain] = useState<string | null>(null);
	const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

	const [addOpen, setAddOpen] = useState(false);
	const [addSymbol, setAddSymbol] = useState("BTCUSDT");
	const [addLoading, setAddLoading] = useState(false);

	const [realtimeSymbol, setRealtimeSymbol] = useState("BTCUSDT");
	const [realtimeInterval, setRealtimeInterval] = useState<Interval>("1m");
	const [realtimeRefresh, setRealtimeRefresh] = useState("20s");
	const [realtimeLimit, setRealtimeLimit] = useState(500);
	const [realtimeMaxUpdates, setRealtimeMaxUpdates] = useState(20);
	const [realtimeStreaming, setRealtimeStreaming] = useState(false);
	const [realtimeStatus, setRealtimeStatus] = useState("idle");
	const [realtimeError, setRealtimeError] = useState<string | null>(null);
	const [realtimeReport, setRealtimeReport] = useState<TrainReport | null>(null);
	const [realtimeUpdates, setRealtimeUpdates] = useState(0);

	const [multiSymbols, setMultiSymbols] = useState("BTCUSDT,ETHUSDT,SOLUSDT");
	const [multiInterval, setMultiInterval] = useState<Interval>("1h");
	const [multiLimit, setMultiLimit] = useState(300);
	const [multiTrainRatio, setMultiTrainRatio] = useState(0.7);
	const [multiEpochs, setMultiEpochs] = useState(800);
	const [multiLoading, setMultiLoading] = useState(false);
	const [multiError, setMultiError] = useState<string | null>(null);
	const [multiReport, setMultiReport] = useState<MultiTrainReport | null>(null);

	const [messageApi, contextHolder] = message.useMessage();
	const realtimeStopRef = useRef<(() => void) | null>(null);
	const safeWatchlist = Array.isArray(watchlist) ? watchlist : [];

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
			setErrorWL((e as Error).message);
		} finally {
			setLoadingWL(false);
		}
	}, []);

	useEffect(() => {
		void loadWatchlist();
	}, [loadWatchlist]);

	const runTrain = useCallback(async (symbol: string, interval: Interval) => {
		setLoadingTrain(true);
		setErrorTrain(null);
		setActiveSymbol(symbol);
		try {
			setReport(await coinAiApi.train(symbol, interval, { limit: 500 }));
		} catch (e) {
			setErrorTrain((e as Error).message);
		} finally {
			setLoadingTrain(false);
		}
	}, []);

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
		if (!symbol) {
			setRealtimeError("Symbol is required");
			return;
		}
		if (
			!Number.isInteger(realtimeMaxUpdates) ||
			!Number.isFinite(realtimeMaxUpdates) ||
			realtimeMaxUpdates <= 0
		) {
			setRealtimeError("max_updates must be a positive integer");
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
				interval: realtimeInterval,
				refresh: realtimeRefresh || "20s",
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
		realtimeInterval,
		realtimeLimit,
		realtimeMaxUpdates,
		realtimeRefresh,
		realtimeSymbol,
		stopRealtime,
	]);

	async function handleAdd() {
		setAddLoading(true);
		const symbol = addSymbol.trim().toUpperCase();
		try {
			await coinAiApi.addToWatchlist({ symbol });
			setAddOpen(false);
			setAddSymbol("BTCUSDT");
			await loadWatchlist();
			void messageApi.success(`${symbol} added to watchlist`);
		} catch (e) {
			void messageApi.error((e as Error).message);
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
			void messageApi.error((e as Error).message);
		}
	}

	async function handleRunMultiTrain() {
		const symbols = multiSymbols
			.split(",")
			.map((item) => item.trim().toUpperCase())
			.filter(Boolean);

		if (symbols.length < 2) {
			setMultiError("Please enter at least 2 symbols");
			return;
		}

		setMultiLoading(true);
		setMultiError(null);
		try {
			const result = await coinAiApi.trainMulti({
				symbols,
				interval: multiInterval,
				limit: multiLimit,
				train_ratio: multiTrainRatio,
				epochs: multiEpochs,
			});
			setMultiReport(result);
		} catch (e) {
			setMultiError((e as Error).message);
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

			<div className="ci-layout">
				<div className="ci-panel ci-watchlist-panel">
					<div className="ci-panel-hd">
						<span className="ci-panel-title">
							<EyeOutlined /> Watchlist
						</span>
						<Tag>{safeWatchlist.length} symbols</Tag>
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
									<div className="ci-sig-iv">· {report.interval}</div>
								</div>
								<div className="ci-sig-center">
									<div
										className="ci-sig-label"
										style={{ color: SIG_CLR[report.signal] }}
									>
										{report.signal}
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
							<SymbolSearch value={realtimeSymbol} onChange={setRealtimeSymbol} />
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
									min={100}
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
										setRealtimeMaxUpdates(typeof value === "number" ? value : 20)
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
							disabled={realtimeStreaming}
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
									{realtimeReport.symbol} · {realtimeReport.interval}
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
						<div className="ci-ctrl ci-ctrl-row">
							<div className="ci-ctrl-inline">
								<span className="ci-ctrl-label">Limit</span>
								<InputNumber
									min={10}
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
									min={0.1}
									max={0.95}
									step={0.05}
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
								min={50}
								max={5000}
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
						<SymbolSearch value={addSymbol} onChange={setAddSymbol} />
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
