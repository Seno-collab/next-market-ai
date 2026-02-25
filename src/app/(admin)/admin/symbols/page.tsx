"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
	AppstoreOutlined,
	LineChartOutlined,
	PlusOutlined,
	SearchOutlined,
	StarOutlined,
} from "@ant-design/icons";
import { Input, Spin, message } from "antd";
import { coinAiApi } from "@/lib/api/coinai";
import type { QuoteItem, SymbolItem } from "@/types/trading";

/* ── Coin avatar colour palette (by first letter) ─────────────────────────── */
const LETTER_COLORS: Record<string, [string, string]> = {
	A: ["#f59e0b", "#fbbf24"],
	B: ["#3b82f6", "#60a5fa"],
	C: ["#8b5cf6", "#a78bfa"],
	D: ["#ec4899", "#f472b6"],
	E: ["#10b981", "#34d399"],
	F: ["#f97316", "#fb923c"],
	G: ["#6366f1", "#818cf8"],
	H: ["#14b8a6", "#2dd4bf"],
	I: ["#ef4444", "#f87171"],
	J: ["#a855f7", "#c084fc"],
	K: ["#06b6d4", "#22d3ee"],
	L: ["#84cc16", "#a3e635"],
	M: ["#f43f5e", "#fb7185"],
	N: ["#22c55e", "#4ade80"],
	O: ["#fb923c", "#fdba74"],
	P: ["#818cf8", "#a5b4fc"],
	Q: ["#2dd4bf", "#5eead4"],
	R: ["#fbbf24", "#fcd34d"],
	S: ["#34d399", "#6ee7b7"],
	T: ["#60a5fa", "#93c5fd"],
	U: ["#c084fc", "#d8b4fe"],
	V: ["#4ade80", "#86efac"],
	W: ["#fb7185", "#fda4af"],
	X: ["#38bdf8", "#7dd3fc"],
	Y: ["#a3e635", "#bef264"],
	Z: ["#e879f9", "#f0abfc"],
};
function coinGradient(base: string): string {
	const [a, b] = LETTER_COLORS[base[0]?.toUpperCase() ?? ""] ?? [
		"#475569",
		"#64748b",
	];
	return `linear-gradient(135deg, ${a}, ${b})`;
}
function coinTextColor(base: string): string {
	return LETTER_COLORS[base[0]?.toUpperCase() ?? ""]?.[0] ?? "#94a3b8";
}

/* ── Fetch helpers ─────────────────────────────────────────────────────────── */
async function fetchQuotes(): Promise<QuoteItem[]> {
	try {
		const res = await fetch("/api/trading/quotes", { cache: "no-store" });
		if (!res.ok) return [];
		const body = (await res.json()) as { data?: { quotes?: QuoteItem[] } };
		return body.data?.quotes ?? [];
	} catch {
		return [];
	}
}

async function fetchSymbols(quote: string): Promise<SymbolItem[]> {
	try {
		const qs = quote ? `?quote=${quote}` : "";
		const res = await fetch(`/api/trading/symbols${qs}`, { cache: "no-store" });
		if (!res.ok) return [];
		const body = (await res.json()) as { data?: { symbols?: SymbolItem[] } };
		return body.data?.symbols ?? [];
	} catch {
		return [];
	}
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function SymbolsPage() {
	const [quotes, setQuotes] = useState<QuoteItem[]>([]);
	const [symbols, setSymbols] = useState<SymbolItem[]>([]);
	const [activeQuote, setActiveQuote] = useState("USDT");
	const [search, setSearch] = useState("");
	const [loadingQ, setLoadingQ] = useState(true);
	const [loadingS, setLoadingS] = useState(false);
	const [adding, setAdding] = useState<Set<string>>(new Set());
	const [added, setAdded] = useState<Set<string>>(new Set());

	const symbolCache = useRef<Record<string, SymbolItem[]>>({});
	const deferred = useDeferredValue(search);
	const [msgApi, ctxHolder] = message.useMessage();

	useEffect(() => {
		void fetchQuotes().then((q) => {
			setQuotes(q);
			setLoadingQ(false);
		});
	}, []);

	useEffect(() => {
		const cached = symbolCache.current[activeQuote];
		if (cached) {
			setSymbols(cached);
			return;
		}
		setLoadingS(true);
		setSearch("");
		void fetchSymbols(activeQuote).then((s) => {
			symbolCache.current[activeQuote] = s;
			setSymbols(s);
			setLoadingS(false);
		});
	}, [activeQuote]);

	const filtered = useMemo(() => {
		const q = deferred.trim().toUpperCase();
		if (!q) return symbols;
		return symbols.filter(
			(s) => s.symbol.includes(q) || s.base_asset.includes(q),
		);
	}, [symbols, deferred]);

	async function handleWatch(sym: string) {
		setAdding((p) => new Set(p).add(sym));
		try {
			await coinAiApi.addToWatchlist({ symbol: sym });
			setAdded((p) => new Set(p).add(sym));
			void msgApi.success(`${sym} added to watchlist`);
		} catch (e) {
			void msgApi.error((e as Error).message);
		} finally {
			setAdding((p) => {
				const n = new Set(p);
				n.delete(sym);
				return n;
			});
		}
	}

	const visible = filtered.slice(0, 200);
	const activeCount =
		quotes.find((q) => q.quote_asset === activeQuote)?.symbol_count ??
		symbols.length;

	return (
		<div className="sb-shell">
			{ctxHolder}

			{/* ── Hero ── */}
			<div className="sb-hero">
				<div className="sb-hero-left">
					<div className="sb-eyebrow">
						<AppstoreOutlined /> MARKET EXPLORER
					</div>
					<h1 className="sb-title">
						Browse{" "}
						<span className="sb-title-accent">
							{activeQuote ? `${activeQuote} ` : "All "}Pairs
						</span>
					</h1>
					<p className="sb-subtitle">
						{loadingS
							? "Loading…"
							: `${filtered.length.toLocaleString()} of ${(activeCount || symbols.length).toLocaleString()} trading pairs`}
					</p>
				</div>
				<div className="sb-hero-stat">
					<span className="sb-stat-num">{filtered.length}</span>
					<span className="sb-stat-lbl">pairs shown</span>
				</div>
			</div>

			{/* ── Controls panel (tabs + search) ── */}
			<div className="sb-controls">
				{/* Quote tab pills */}
				<div className="sb-tab-row">
					{loadingQ ? (
						<Spin size="small" />
					) : (
						<>
							<button
								className={`sb-pill${activeQuote === "" ? " sb-pill-active" : ""}`}
								onClick={() => setActiveQuote("")}
							>
								<span className="sb-pill-label">ALL</span>
							</button>
							{quotes.map((q) => (
								<button
									key={q.quote_asset}
									className={`sb-pill${activeQuote === q.quote_asset ? " sb-pill-active" : ""}`}
									onClick={() => setActiveQuote(q.quote_asset)}
								>
									<span className="sb-pill-label">{q.quote_asset}</span>
									<span className="sb-pill-badge">{q.symbol_count}</span>
								</button>
							))}
						</>
					)}
				</div>

				{/* Search */}
				<div className="sb-search-wrap">
					<Input
						prefix={<SearchOutlined className="sb-search-icon" />}
						placeholder={`Search ${activeQuote || "all"} pairs…`}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						allowClear
						size="large"
						className="sb-search-input"
					/>
				</div>
			</div>

			{/* ── List ── */}
			{loadingS ? (
				<div className="sb-center-spin">
					<Spin size="large" />
					<span className="sb-spin-txt">Fetching pairs…</span>
				</div>
			) : filtered.length === 0 ? (
				<div className="sb-empty">
					<div className="sb-empty-icon-wrap">
						<SearchOutlined style={{ fontSize: 32, color: "#334155" }} />
					</div>
					<p className="sb-empty-title">
						No pairs found for &ldquo;{search}&rdquo;
					</p>
					<p className="sb-empty-hint">
						Try a different name or switch the quote tab
					</p>
				</div>
			) : (
				<div className="sb-list-panel">
					{/* Sticky column header */}
					<div className="sb-list-hd">
						<span className="sb-hd-num">#</span>
						<span className="sb-hd-name">Pair</span>
						<span className="sb-hd-quote">Quote</span>
						<span className="sb-hd-actions">Actions</span>
					</div>

					{/* Rows */}
					<div className="sb-list">
						{visible.map((item, i) => {
							const grad = coinGradient(item.base_asset);
							const tclr = coinTextColor(item.base_asset);
							const isAdded = added.has(item.symbol);
							const isAdding = adding.has(item.symbol);
							return (
								<div key={item.symbol} className="sb-item">
									<span className="sb-item-num">{i + 1}</span>

									<div className="sb-item-avatar" style={{ background: grad }}>
										{item.base_asset.slice(0, 3)}
									</div>

									<div className="sb-item-info">
										<span className="sb-item-base" style={{ color: tclr }}>
											{item.base_asset}
										</span>
										<span className="sb-item-symbol">{item.symbol}</span>
									</div>

									<span
										className="sb-item-qtag"
										style={{
											color: tclr,
											background: `${tclr}18`,
											borderColor: `${tclr}35`,
										}}
									>
										{item.quote_asset}
									</span>

									<div className="sb-item-actions">
										<Link
											href={`/admin/trading?symbol=${item.symbol}`}
											className="sb-btn-chart"
										>
											<LineChartOutlined />
											<span className="sb-btn-txt">Chart</span>
										</Link>
										<button
											className={`sb-btn-star${isAdded ? " sb-btn-star-active" : ""}`}
											disabled={isAdding || isAdded}
											onClick={() => void handleWatch(item.symbol)}
											title={isAdded ? "In watchlist" : "Add to watchlist"}
										>
											{isAdding ? (
												<Spin size="small" />
											) : isAdded ? (
												<StarOutlined />
											) : (
												<PlusOutlined />
											)}
										</button>
									</div>
								</div>
							);
						})}
					</div>

					{filtered.length > 200 && (
						<div className="sb-overflow-hint">
							<span>
								Showing <strong>200</strong> of{" "}
								<strong>{filtered.length.toLocaleString()}</strong> pairs
							</span>
							<span className="sb-hint-arrow">— type to narrow down</span>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
