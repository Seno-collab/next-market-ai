"use client";

import { useEffect, useDeferredValue, useRef, useState } from "react";
import { CaretDownOutlined, SearchOutlined } from "@ant-design/icons";
import { Input, Modal, Spin, Tabs, Typography } from "antd";
import type { InputRef } from "antd";

const { Text } = Typography;

type SymbolItem = {
	symbol: string;
	base_asset: string;
	quote_asset: string;
};

type Props = {
	value: string;
	onChange: (symbol: string) => void;
};

const DEFAULT_QUOTES = ["USDT", "BTC", "ETH", "BNB"];
const KNOWN_QUOTES = ["USDT", "USDC", "BUSD", "BTC", "ETH", "BNB"];

async function fetchQuoteTabs(): Promise<string[]> {
	try {
		const res = await fetch("/api/trading/quotes", { cache: "no-store" });
		if (!res.ok) return DEFAULT_QUOTES;
		const body = (await res.json()) as {
			data?: { quotes?: { quote_asset: string }[] };
		};
		const tabs = (body.data?.quotes ?? [])
			.map((q) => q.quote_asset)
			.slice(0, 6);
		return tabs.length > 0 ? tabs : DEFAULT_QUOTES;
	} catch {
		return DEFAULT_QUOTES;
	}
}

async function fetchSymbols(quote: string): Promise<SymbolItem[]> {
	try {
		const res = await fetch(`/api/trading/symbols?quote=${quote}`, {
			cache: "no-store",
		});
		if (!res.ok) return [];
		const body = (await res.json()) as { data?: { symbols?: SymbolItem[] } };
		return body.data?.symbols ?? [];
	} catch {
		return [];
	}
}

function formatDisplay(symbol: string): { base: string; quote: string } {
	for (const q of KNOWN_QUOTES) {
		if (symbol.endsWith(q))
			return { base: symbol.slice(0, -q.length), quote: q };
	}
	return { base: symbol, quote: "" };
}

export default function SymbolSearch({ value, onChange }: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [tab, setTab] = useState("USDT");
	const [quotes, setQuotes] = useState<string[]>(DEFAULT_QUOTES);
	const [symbols, setSymbols] = useState<SymbolItem[]>([]);
	const [loading, setLoading] = useState(false);

	const cacheRef = useRef<Record<string, SymbolItem[]>>({});
	const quotesLoaded = useRef(false);
	const inputRef = useRef<InputRef>(null);
	const deferred = useDeferredValue(query);

	const { base, quote } = formatDisplay(value);

	// Load quote tabs once on first open
	useEffect(() => {
		if (!open || quotesLoaded.current) return;
		quotesLoaded.current = true;
		void fetchQuoteTabs().then(setQuotes);
	}, [open]);

	// Load symbols for current tab (cache per quote)
	useEffect(() => {
		if (!open) return;
		const cached = cacheRef.current[tab];
		if (cached) {
			setSymbols(cached);
			return;
		}
		let cancelled = false;
		setLoading(true);
		void fetchSymbols(tab)
			.then((items) => {
				if (cancelled) {
					return;
				}
				cacheRef.current[tab] = items;
				setSymbols(items);
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [open, tab]);

	useEffect(() => {
		if (open) {
			setQuery("");
			const timer = window.setTimeout(() => inputRef.current?.focus?.(), 100);
			return () => {
				window.clearTimeout(timer);
			};
		}
	}, [open]);

	const normalizedQuery = deferred.trim().toUpperCase();
	const hasQuery = normalizedQuery.length > 0;

	const pool = hasQuery
		? symbols
				.filter(
					(s) =>
						s.symbol.includes(normalizedQuery) ||
						s.base_asset.includes(normalizedQuery),
				)
				.slice(0, 20)
		: symbols.slice(0, 50);

	function select(symbol: string) {
		onChange(symbol);
		setOpen(false);
	}

	return (
		<>
			{/* Trigger button */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					background: "transparent",
					border: "none",
					cursor: "pointer",
					padding: "4px 8px",
					borderRadius: 6,
				}}
			>
				<span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
					{base}
				</span>
				<span style={{ fontSize: 14, opacity: 0.5, lineHeight: 1 }}>
					{quote ? `/${quote}` : ""}
				</span>
				<CaretDownOutlined style={{ fontSize: 12, opacity: 0.6 }} />
			</button>

			{/* Search modal */}
			<Modal
				open={open}
				onCancel={() => setOpen(false)}
				footer={null}
				title={null}
				width={480}
				styles={{ body: { padding: 0 } }}
				destroyOnHidden
			>
				{/* Search input */}
				<div style={{ padding: "16px 16px 0" }}>
					<Input
						ref={inputRef}
						prefix={<SearchOutlined />}
						placeholder="Search symbol (e.g. BTC, SOL, ETH...)"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						allowClear
						size="large"
						autoComplete="off"
					/>
				</div>

				{/* Quote tabs — hidden when searching */}
				{!hasQuery && (
					<div style={{ padding: "0 16px" }}>
						<Tabs
							activeKey={tab}
							onChange={(k) => setTab(k)}
							size="small"
							items={quotes.map((k) => ({ key: k, label: k }))}
						/>
					</div>
				)}

				{/* Symbol list */}
				<div
					style={{ maxHeight: 400, overflowY: "auto", padding: "0 8px 12px" }}
				>
					{loading ? (
						<div style={{ padding: "32px 0", textAlign: "center" }}>
							<Spin />
						</div>
					) : pool.length === 0 ? (
						<div style={{ padding: "32px 0", textAlign: "center" }}>
							<Text type="secondary">
								{hasQuery
									? `No results for "${deferred}"`
									: "No symbols available"}
							</Text>
						</div>
					) : (
						pool.map((item) => (
							<SymbolRow
								key={item.symbol}
								base={item.base_asset}
								quote={item.quote_asset}
								symbol={item.symbol}
								selected={item.symbol === value}
								onClick={() => select(item.symbol)}
							/>
						))
					)}
				</div>
			</Modal>
		</>
	);
}

function SymbolRow({
	base,
	quote,
	symbol,
	selected,
	onClick,
}: {
	base: string;
	quote: string;
	symbol: string;
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: "flex",
				alignItems: "center",
				width: "100%",
				padding: "10px 8px",
				background: selected ? "rgba(38,166,154,0.12)" : "transparent",
				border: "none",
				borderRadius: 6,
				cursor: "pointer",
				gap: 12,
				textAlign: "left",
			}}
		>
			<span
				style={{
					width: 36,
					height: 36,
					borderRadius: "50%",
					background: "rgba(128,128,128,0.15)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: 11,
					fontWeight: 700,
					flexShrink: 0,
					color: selected ? "#26a69a" : undefined,
				}}
			>
				{base.slice(0, 3)}
			</span>

			<span style={{ flex: 1 }}>
				<span style={{ fontWeight: 600, fontSize: 14 }}>{base}</span>
				<span style={{ fontSize: 12, opacity: 0.5 }}>/{quote}</span>
			</span>

			<span style={{ fontSize: 12, color: "#475569" }}>{symbol}</span>

			{selected && (
				<span style={{ fontSize: 12, color: "#26a69a", fontWeight: 600 }}>
					✓
				</span>
			)}
		</button>
	);
}
