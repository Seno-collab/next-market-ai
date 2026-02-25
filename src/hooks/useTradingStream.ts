"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	BookDelta,
	BookSnapshot,
	KlineUpdate,
	OrderBookState,
	TradeSnapshot,
	TickerSnapshot,
	TickerUpdate,
	TradeUpdate,
	WsMessage,
} from "@/types/trading";

// ── Config ────────────────────────────────────────────────────────────────────

// Exponential backoff: 1s → 2s → 4s → … → 30s cap, ±20% jitter.
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 20;
// Force-reconnect if the server goes silent for this long.
const HEARTBEAT_TIMEOUT_MS = 45_000;
// How long to keep ▲▼ change indicators visible after a delta arrives.
const BOOK_CHANGE_TTL_MS = 600;
// Max trades to keep in memory.
const MAX_TRADES = 150;

function reconnectDelay(attempt: number): number {
	const base = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
	return base * (0.8 + Math.random() * 0.4); // ±20% jitter
}

function tradeFingerprint(t: TradeUpdate): string {
	return `${t.id}:${t.time}:${t.is_buyer ? 1 : 0}:${t.price}:${t.qty}`;
}

function isZeroQuantity(qty: string) {
	return qty === "0" || qty === "0.00000000";
}

function normalizeLevels(
	levels: unknown,
): Array<[price: string, quantity: string]> {
	if (!Array.isArray(levels)) {
		return [];
	}
	const out: Array<[string, string]> = [];
	for (const level of levels) {
		if (!Array.isArray(level) || level.length < 2) {
			continue;
		}
		const [priceRaw, qtyRaw] = level;
		const price = String(priceRaw ?? "");
		const quantity = String(qtyRaw ?? "");
		if (!price || !quantity) {
			continue;
		}
		out.push([price, quantity]);
	}
	return out;
}

function parseUpdateId(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

type UnknownRecord = Record<string, unknown>;
type PartialTicker = Partial<TickerUpdate>;

function toRecord(value: unknown): UnknownRecord | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as UnknownRecord;
}

function readFirst(record: UnknownRecord, keys: string[]) {
	for (const key of keys) {
		if (key in record && record[key] !== undefined && record[key] !== null) {
			return record[key];
		}
	}
	return undefined;
}

function toStringValue(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return undefined;
}

function toNumberValue(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function toBooleanValue(value: unknown): boolean | undefined {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number") {
		if (value === 1) return true;
		if (value === 0) return false;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true" || normalized === "1") return true;
		if (normalized === "false" || normalized === "0") return false;
	}
	return undefined;
}

function normalizeTickerPayload(payload: unknown): PartialTicker | null {
	const root = toRecord(payload);
	if (!root) {
		return null;
	}

	const candidates: UnknownRecord[] = [root];
	const nestedData = toRecord(root.data);
	const nestedTicker = toRecord(root.ticker);
	if (nestedData) {
		candidates.push(nestedData);
	}
	if (nestedTicker) {
		candidates.push(nestedTicker);
	}

	for (const candidate of candidates) {
		const lastPrice = toStringValue(
			readFirst(candidate, ["last_price", "lastPrice", "price"]),
		);
		if (!lastPrice) {
			continue;
		}

		const patch: PartialTicker = {
			symbol: toStringValue(readFirst(candidate, ["symbol"])),
			last_price: lastPrice,
			open_price: toStringValue(
				readFirst(candidate, ["open_price", "openPrice"]),
			),
			high_price: toStringValue(
				readFirst(candidate, ["high_price", "highPrice"]),
			),
			low_price: toStringValue(readFirst(candidate, ["low_price", "lowPrice"])),
			price_change: toStringValue(
				readFirst(candidate, ["price_change", "priceChange"]),
			),
			price_change_percent: toStringValue(
				readFirst(candidate, ["price_change_percent", "priceChangePercent"]),
			),
			volume: toStringValue(readFirst(candidate, ["volume"])),
			quote_volume: toStringValue(
				readFirst(candidate, ["quote_volume", "quoteVolume"]),
			),
			weighted_avg_price: toStringValue(
				readFirst(candidate, ["weighted_avg_price", "weightedAvgPrice"]),
			),
			last_qty: toStringValue(readFirst(candidate, ["last_qty", "lastQty"])),
			best_bid: toStringValue(readFirst(candidate, ["best_bid", "bestBid"])),
			best_bid_qty: toStringValue(
				readFirst(candidate, ["best_bid_qty", "bestBidQty"]),
			),
			best_ask: toStringValue(readFirst(candidate, ["best_ask", "bestAsk"])),
			best_ask_qty: toStringValue(
				readFirst(candidate, ["best_ask_qty", "bestAskQty"]),
			),
			range_percent: toStringValue(
				readFirst(candidate, ["range_percent", "rangePercent"]),
			),
		};

		const tradeCount = toNumberValue(
			readFirst(candidate, ["trade_count", "tradeCount"]),
		);
		if (tradeCount !== undefined) {
			patch.trade_count = tradeCount;
		}

		const openTime = toNumberValue(
			readFirst(candidate, ["open_time", "openTime"]),
		);
		if (openTime !== undefined) {
			patch.open_time = openTime;
		}

		const closeTime = toNumberValue(
			readFirst(candidate, ["close_time", "closeTime"]),
		);
		if (closeTime !== undefined) {
			patch.close_time = closeTime;
		}

		const directionRaw = readFirst(candidate, [
			"price_direction",
			"priceDirection",
		]);
		if (
			directionRaw === "up" ||
			directionRaw === "down" ||
			directionRaw === "flat"
		) {
			patch.price_direction = directionRaw;
		}

		return patch;
	}

	return null;
}

function normalizeTradePayload(payload: unknown): TradeUpdate | null {
	const record = toRecord(payload);
	if (!record) {
		return null;
	}

	const id = toNumberValue(readFirst(record, ["id", "trade_id", "tradeId"]));
	const price = toStringValue(readFirst(record, ["price", "p"]));
	const qty = toStringValue(readFirst(record, ["qty", "quantity", "q"]));
	const time = toNumberValue(
		readFirst(record, ["time", "timestamp", "ts", "T"]),
	);
	if (
		id === undefined ||
		price === undefined ||
		qty === undefined ||
		time === undefined
	) {
		return null;
	}

	// WS canonical field: is_buyer (true=BUY, false=SELL)
	const directIsBuyer = toBooleanValue(
		readFirst(record, ["is_buyer", "isBuyer"]),
	);
	if (directIsBuyer !== undefined) {
		return { id, price, qty, time, is_buyer: directIsBuyer };
	}

	// Some payloads expose REST naming: is_buyer_maker (true means SELL aggressor).
	const buyerMaker = toBooleanValue(
		readFirst(record, ["is_buyer_maker", "isBuyerMaker"]),
	);
	if (buyerMaker !== undefined) {
		return { id, price, qty, time, is_buyer: !buyerMaker };
	}

	return null;
}

function normalizeTradeSnapshotPayload(payload: unknown): TradeSnapshot {
	const root = toRecord(payload);
	const directArray = Array.isArray(payload) ? payload : null;
	const nestedArrays: unknown[] = [];

	if (root) {
		const data = root.data;
		const trades = root.trades;
		const items = root.items;
		if (Array.isArray(data)) nestedArrays.push(data);
		if (Array.isArray(trades)) nestedArrays.push(trades);
		if (Array.isArray(items)) nestedArrays.push(items);
		const nestedDataRecord = toRecord(data);
		if (nestedDataRecord) {
			if (Array.isArray(nestedDataRecord.trades)) {
				nestedArrays.push(nestedDataRecord.trades);
			}
			if (Array.isArray(nestedDataRecord.items)) {
				nestedArrays.push(nestedDataRecord.items);
			}
		}
	}

	const candidates = [directArray, ...nestedArrays].filter(
		(v): v is unknown[] => Array.isArray(v),
	);
	for (const arr of candidates) {
		const normalized = arr
			.map(normalizeTradePayload)
			.filter((t): t is TradeUpdate => t !== null);
		if (normalized.length > 0) {
			return normalized;
		}
	}

	return [];
}

function mergeTrades(
	base: TradeUpdate[],
	incoming: TradeUpdate[],
	limit = MAX_TRADES,
): TradeUpdate[] {
	const seen = new Set<string>();
	const merged: TradeUpdate[] = [];
	for (const trade of [...incoming, ...base]) {
		const key = tradeFingerprint(trade);
		if (seen.has(key)) continue;
		seen.add(key);
		merged.push(trade);
		if (merged.length >= limit) {
			break;
		}
	}
	return merged;
}

function mergeTickerPatch(
	previous: TickerUpdate | TickerSnapshot | null,
	patch: PartialTicker,
	fallbackSymbol?: string,
): TickerUpdate {
	const now = Date.now();
	const symbol = patch.symbol ?? previous?.symbol ?? fallbackSymbol ?? "";
	const lastPrice = patch.last_price ?? previous?.last_price ?? "0";

	return {
		symbol,
		last_price: lastPrice,
		open_price: patch.open_price ?? previous?.open_price ?? lastPrice,
		high_price: patch.high_price ?? previous?.high_price ?? lastPrice,
		low_price: patch.low_price ?? previous?.low_price ?? lastPrice,
		price_change: patch.price_change ?? previous?.price_change ?? "0",
		price_change_percent:
			patch.price_change_percent ?? previous?.price_change_percent ?? "0",
		volume: patch.volume ?? previous?.volume ?? "0",
		quote_volume: patch.quote_volume ?? previous?.quote_volume ?? "0",
		weighted_avg_price:
			patch.weighted_avg_price ?? previous?.weighted_avg_price ?? lastPrice,
		last_qty: patch.last_qty ?? previous?.last_qty ?? "0",
		trade_count: patch.trade_count ?? previous?.trade_count ?? 0,
		best_bid: patch.best_bid ?? previous?.best_bid ?? lastPrice,
		best_bid_qty: patch.best_bid_qty ?? previous?.best_bid_qty ?? "0",
		best_ask: patch.best_ask ?? previous?.best_ask ?? lastPrice,
		best_ask_qty: patch.best_ask_qty ?? previous?.best_ask_qty ?? "0",
		open_time: patch.open_time ?? previous?.open_time ?? now,
		close_time: patch.close_time ?? previous?.close_time ?? now,
		price_direction:
			patch.price_direction ?? previous?.price_direction ?? "flat",
		range_percent: patch.range_percent ?? previous?.range_percent ?? "0",
	};
}

function getWsBase(): string {
	const explicit = process.env.NEXT_PUBLIC_WS_BASE_URL;
	if (explicit) return explicit.replace(/\/+$/, "");
	const apiUrl = process.env.NEXT_PUBLIC_API_URL;
	if (apiUrl) return apiUrl.replace(/^http/, "ws").replace(/\/+$/, "");
	if (typeof window !== "undefined")
		return window.location.origin.replace(/^http/, "ws");
	return "ws://localhost:8080";
}

// ── Book helpers ──────────────────────────────────────────────────────────────

function snapshotToState(snap: BookSnapshot): OrderBookState {
	return {
		lastUpdateId: snap.last_update_id,
		bids: new Map(snap.bids.map((l) => [l.price, l.quantity])),
		asks: new Map(snap.asks.map((l) => [l.price, l.quantity])),
		bestBid: snap.best_bid,
		bestAsk: snap.best_ask,
		spread: snap.spread,
		spreadPercent: snap.spread_percent,
		midPrice: snap.mid_price,
		totalBidQty: snap.total_bid_qty,
		totalAskQty: snap.total_ask_qty,
	};
}

// ── Public types ──────────────────────────────────────────────────────────────

/** Direction of a size change on a price level from the last book_delta. */
export type BookChange = "up" | "down";
/**
 * Map of price → change direction — populated after each book_delta,
 * auto-cleared after BOOK_CHANGE_TTL_MS so ▲▼ indicators fade out.
 */
export type BookChangeMap = Map<string, BookChange>;

export type TradingStreamState = {
	/**
	 * One-time snapshot sent by the server on connect.
	 * Available immediately — use as baseline before the first ticker_update arrives.
	 */
	tickerSnapshot: TickerSnapshot | null;
	/** Live ticker from ticker_update (~1/s). Overrides tickerSnapshot in the UI. */
	ticker: TickerUpdate | null;
	orderBook: OrderBookState | null;
	/** Size changes from the most-recent book_delta (price → "up"|"down"). */
	bookChanges: BookChangeMap;
	trades: TradeUpdate[];
	liveCandle: KlineUpdate | null;
	connected: boolean;
	/** True while waiting to re-attempt after a drop. */
	reconnecting: boolean;
	/** True after first successful connection — gates "Connection lost" banner. */
	everConnected: boolean;
};

export type TradingStreamReturn = TradingStreamState & {
	reconnect: () => void;
};

const EMPTY_CHANGES: BookChangeMap = new Map();

function createInitialStreamState(): TradingStreamState {
	return {
		tickerSnapshot: null,
		ticker: null,
		orderBook: null,
		bookChanges: EMPTY_CHANGES,
		trades: [],
		liveCandle: null,
		connected: false,
		reconnecting: false,
		everConnected: false,
	};
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTradingStream(symbol: string): TradingStreamReturn {
	const [state, setState] = useState<TradingStreamState>(
		createInitialStreamState,
	);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectAttempts = useRef(0);
	const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const heartbeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const changeResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Deltas buffered while waiting for book_snapshot.
	const pendingDeltas = useRef<BookDelta[]>([]);

	// ── Timers ──────────────────────────────────────────────────────────────────

	const clearHeartbeat = useCallback(() => {
		if (heartbeatTimer.current) {
			clearTimeout(heartbeatTimer.current);
			heartbeatTimer.current = null;
		}
	}, []);

	const clearChangeReset = useCallback(() => {
		if (changeResetTimer.current) {
			clearTimeout(changeResetTimer.current);
			changeResetTimer.current = null;
		}
	}, []);

	const resetHeartbeat = useCallback(() => {
		clearHeartbeat();
		heartbeatTimer.current = setTimeout(() => {
			wsRef.current?.close();
		}, HEARTBEAT_TIMEOUT_MS);
	}, [clearHeartbeat]);

	const scheduleChangeClear = useCallback(() => {
		clearChangeReset();
		changeResetTimer.current = setTimeout(() => {
			changeResetTimer.current = null;
			setState((s) =>
				s.bookChanges.size === 0 ? s : { ...s, bookChanges: EMPTY_CHANGES },
			);
		}, BOOK_CHANGE_TTL_MS);
	}, [clearChangeReset]);

	// ── closeSocket ─────────────────────────────────────────────────────────────

	const closeSocket = useCallback(
		(detach = false) => {
			clearHeartbeat();
			clearChangeReset();
			const ws = wsRef.current;
			if (!ws) return;
			if (detach) wsRef.current = null;
			ws.close();
		},
		[clearHeartbeat, clearChangeReset],
	);

	// ── applyDelta: returns new OrderBookState + BookChangeMap ──────────────────

	const applyDelta = useCallback(
		(
			book: OrderBookState,
			delta: BookDelta,
		): { book: OrderBookState; changes: BookChangeMap } => {
			const bids = new Map(book.bids);
			const asks = new Map(book.asks);
			const changes = new Map<string, BookChange>();

			const bidLevels = normalizeLevels(delta.bids);
			const askLevels = normalizeLevels(delta.asks);

			for (const [price, qty] of bidLevels) {
				if (isZeroQuantity(qty)) {
					bids.delete(price);
				} else {
					const prev = bids.get(price);
					if (prev !== undefined)
						changes.set(
							price,
							parseFloat(qty) > parseFloat(prev) ? "up" : "down",
						);
					bids.set(price, qty);
				}
			}
			for (const [price, qty] of askLevels) {
				if (isZeroQuantity(qty)) {
					asks.delete(price);
				} else {
					const prev = asks.get(price);
					if (prev !== undefined)
						changes.set(
							price,
							parseFloat(qty) > parseFloat(prev) ? "up" : "down",
						);
					asks.set(price, qty);
				}
			}

			return {
				book: { ...book, lastUpdateId: delta.last_update_id, bids, asks },
				changes,
			};
		},
		[],
	);

	// ── handleMessage ────────────────────────────────────────────────────────────

	const handleMessage = useCallback(
		(raw: string) => {
			let msg: WsMessage;
			try {
				msg = JSON.parse(raw) as WsMessage;
			} catch {
				return;
			}

			switch (msg.type) {
				// ── book_snapshot ──────────────────────────────────────────────────────
				case "book_snapshot": {
					const snap = msg.data as BookSnapshot;
					let book = snapshotToState(snap);

					// Apply buffered deltas that arrived before the snapshot.
					const allChanges = new Map<string, BookChange>();
					for (const delta of pendingDeltas.current) {
						if (delta.last_update_id <= snap.last_update_id) continue; // stale
						if (delta.first_update_id > snap.last_update_id + 1) break; // gap
						const { book: nb, changes } = applyDelta(book, delta);
						book = nb;
						for (const [k, v] of changes) allChanges.set(k, v);
					}
					pendingDeltas.current = [];
					setState((s) => ({ ...s, orderBook: book, bookChanges: allChanges }));
					if (allChanges.size > 0) scheduleChangeClear();
					break;
				}

				// ── ticker_snapshot ────────────────────────────────────────────────────
				// Sent once on connect — provides immediate ticker data before the first
				// ticker_update arrives (~1s delay). Store separately so the UI can
				// distinguish "initial snapshot" from "live data".
				case "ticker_snapshot":
					{
						const snapshotPatch = normalizeTickerPayload(msg.data ?? msg);
						if (!snapshotPatch) {
							break;
						}
						setState((s) => ({
							...s,
							tickerSnapshot: mergeTickerPatch(
								s.tickerSnapshot,
								snapshotPatch,
								msg.symbol,
							),
						}));
					}
					break;

				// ── ticker_update ──────────────────────────────────────────────────────
				case "ticker_update": {
					const updatePatch = normalizeTickerPayload(msg.data ?? msg);
					if (!updatePatch) {
						break;
					}
					setState((s) => ({
						...s,
						ticker: mergeTickerPatch(
							s.ticker ?? s.tickerSnapshot,
							updatePatch,
							msg.symbol,
						),
					}));
					break;
				}

				// ── trade_update ───────────────────────────────────────────────────────
				case "trade_snapshot": {
					const snapshot = normalizeTradeSnapshotPayload(msg.data ?? msg);
					if (snapshot.length === 0) {
						break;
					}
					setState((s) => ({ ...s, trades: mergeTrades([], snapshot) }));
					break;
				}

				// ── trade_update ───────────────────────────────────────────────────────
				case "trade_update":
					setState((s) => {
						const incoming = normalizeTradePayload(msg.data ?? msg);
						if (!incoming) {
							return s;
						}
						return { ...s, trades: mergeTrades(s.trades, [incoming]) };
					});
					break;

				// ── book_delta ─────────────────────────────────────────────────────────
				case "book_delta": {
					const delta = msg.data as BookDelta;
					let gapDetected = false;
					let hasChanges = false;
					setState((s) => {
						if (!s.orderBook) {
							pendingDeltas.current.push(delta);
							return s;
						}
						const firstUpdateId = parseUpdateId(delta.first_update_id);
						const lastUpdateId = parseUpdateId(delta.last_update_id);
						if (
							lastUpdateId !== null &&
							lastUpdateId <= s.orderBook.lastUpdateId
						)
							return s; // stale
						if (
							firstUpdateId !== null &&
							firstUpdateId > s.orderBook.lastUpdateId + 1
						) {
							// Gap → reset, wait for new snapshot.
							pendingDeltas.current = [];
							gapDetected = true;
							return { ...s, orderBook: null, bookChanges: EMPTY_CHANGES };
						}
						const { book, changes } = applyDelta(s.orderBook, delta);
						hasChanges = changes.size > 0;
						const nextBook =
							lastUpdateId !== null ? { ...book, lastUpdateId } : book;
						return { ...s, orderBook: nextBook, bookChanges: changes };
					});
					// Side effects outside setState — idempotent, safe in Strict Mode.
					if (gapDetected) closeSocket();
					if (hasChanges) scheduleChangeClear();
					break;
				}

				// ── kline_update ───────────────────────────────────────────────────────
				case "kline_update":
					setState((s) => ({ ...s, liveCandle: msg.data as KlineUpdate }));
					break;

				// ── stream_reconnected ─────────────────────────────────────────────────
				// Server Binance upstream reconnected — reset book and buffer new deltas
				// until a fresh book_snapshot arrives.
				case "stream_reconnected":
					pendingDeltas.current = [];
					setState((s) => ({
						...s,
						orderBook: null,
						bookChanges: EMPTY_CHANGES,
					}));
					break;
			}
		},
		[applyDelta, closeSocket, scheduleChangeClear],
	);

	// ── connect ──────────────────────────────────────────────────────────────────

	const connect = useCallback(() => {
		if (!symbol || wsRef.current) return;
		if (reconnectTimer.current) {
			clearTimeout(reconnectTimer.current);
			reconnectTimer.current = null;
		}

		const ws = new WebSocket(
			`${getWsBase()}/ws/trading?symbol=${symbol.toUpperCase()}`,
		);
		wsRef.current = ws;

		ws.onopen = () => {
			if (wsRef.current !== ws) return;
			reconnectAttempts.current = 0;
			resetHeartbeat();
			setState((s) => ({
				...s,
				connected: true,
				reconnecting: false,
				everConnected: true,
			}));
		};

		ws.onmessage = (e) => {
			if (wsRef.current !== ws) return;
			resetHeartbeat();
			handleMessage(e.data as string);
		};

		ws.onclose = () => {
			if (wsRef.current !== ws) return;
			wsRef.current = null;
			clearHeartbeat();
			clearChangeReset();

			const willRetry = reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS;
			setState((s) => ({ ...s, connected: false, reconnecting: willRetry }));
			pendingDeltas.current = [];

			if (willRetry) {
				const delay = reconnectDelay(reconnectAttempts.current);
				reconnectAttempts.current += 1;
				if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
				reconnectTimer.current = setTimeout(() => {
					reconnectTimer.current = null;
					connect();
				}, delay);
			}
		};

		ws.onerror = () => {
			if (wsRef.current !== ws) return;
			ws.close();
		};
	}, [symbol, handleMessage, resetHeartbeat, clearHeartbeat, clearChangeReset]);

	// ── reconnect (manual) ───────────────────────────────────────────────────────

	const reconnect = useCallback(() => {
		if (reconnectTimer.current) {
			clearTimeout(reconnectTimer.current);
			reconnectTimer.current = null;
		}
		clearHeartbeat();
		clearChangeReset();
		closeSocket(true);
		reconnectAttempts.current = 0;
		pendingDeltas.current = [];
		setState((s) => ({ ...s, connected: false, reconnecting: true }));
		connect();
	}, [closeSocket, connect, clearHeartbeat, clearChangeReset]);

	// ── effect: mount / symbol change ────────────────────────────────────────────

	useEffect(() => {
		setState(createInitialStreamState());
		pendingDeltas.current = [];
		reconnectAttempts.current = 0;
		connect();

		return () => {
			if (reconnectTimer.current) {
				clearTimeout(reconnectTimer.current);
				reconnectTimer.current = null;
			}
			clearHeartbeat();
			clearChangeReset();
			closeSocket(true);
		};
	}, [closeSocket, connect, clearHeartbeat, clearChangeReset]);

	return { ...state, reconnect };
}
