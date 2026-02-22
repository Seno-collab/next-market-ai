import type { TrainReport, WatchlistItem, AddWatchlistRequest, ApiResponse } from "@/types/trading";

export type { TrainReport, WatchlistItem, AddWatchlistRequest };

type UnknownRecord = Record<string, unknown>;

function readRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function normalizeWatchlist(payload: unknown): WatchlistItem[] {
  if (Array.isArray(payload)) {
    return payload as WatchlistItem[];
  }

  const root = readRecord(payload);
  const candidates = [
    root?.watchlist,
    root?.items,
    root?.records,
    readRecord(root?.data)?.watchlist,
    readRecord(root?.data)?.items,
    readRecord(root?.data)?.records,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value as WatchlistItem[];
    }
  }

  return [];
}

async function fetchCoinAI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  if (!("data" in body) || body.data === undefined) throw new Error("Missing data in response");
  return body.data;
}

export const coinAiApi = {
  /** POST /api/coinai/train — train model and get signal */
  train(symbol: string, interval = "1h"): Promise<TrainReport> {
    return fetchCoinAI<TrainReport>("/api/coinai/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: symbol.toUpperCase(), interval }),
    });
  },

  /** GET /api/coinai/watchlist */
  async getWatchlist(): Promise<WatchlistItem[]> {
    const payload = await fetchCoinAI<unknown>("/api/coinai/watchlist");
    return normalizeWatchlist(payload);
  },

  /** POST /api/coinai/watchlist */
  addToWatchlist(req: AddWatchlistRequest): Promise<WatchlistItem> {
    return fetchCoinAI<WatchlistItem>("/api/coinai/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, symbol: req.symbol.toUpperCase() }),
    });
  },

  /** DELETE /api/coinai/watchlist/:symbol */
  removeFromWatchlist(symbol: string): Promise<{ message: string }> {
    return fetchCoinAI<{ message: string }>(
      `/api/coinai/watchlist/${symbol.toUpperCase()}`,
      { method: "DELETE" },
    );
  },
};
