import { fetchJson } from "@/lib/api/client";
import type {
  Transaction,
  CreateTransactionRequest,
  ListTransactionsResponse,
} from "@/types/trading";

export type { Transaction, CreateTransactionRequest, ListTransactionsResponse };

export type ListTransactionsQuery = {
  symbol?: string;
  page?: number;
  per_page?: number;
};

type UnknownRecord = Record<string, unknown>;

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

function readRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeListResponse(
  payload: unknown,
  query?: ListTransactionsQuery,
): ListTransactionsResponse {
  const root = readRecord(payload);
  const firstData = readRecord(root?.data);
  const secondData = readRecord(firstData?.data);
  const source = secondData ?? firstData ?? root;

  const transactionsValue =
    source?.transactions ?? source?.items ?? source?.records;
  const transactions = Array.isArray(transactionsValue)
    ? (transactionsValue as Transaction[])
    : [];

  const totalRaw = source?.total ?? source?.total_items ?? source?.totalItems;
  const pageRaw = source?.page ?? source?.current_page ?? source?.currentPage;
  const perPageRaw = source?.per_page ?? source?.perPage ?? source?.limit;

  const total = readNumber(totalRaw) ?? transactions.length;
  const page = readNumber(pageRaw) ?? query?.page ?? DEFAULT_PAGE;
  const perPage = readNumber(perPageRaw) ?? query?.per_page ?? DEFAULT_PER_PAGE;

  return {
    transactions,
    total: Math.max(0, Math.floor(total)),
    page: Math.max(1, Math.floor(page)),
    per_page: Math.max(1, Math.floor(perPage)),
  };
}

/**
 * Client for the /api/trading/transactions proxy endpoints.
 *
 * Auth is handled automatically by fetchJson (reads the access token from
 * localStorage and injects "Authorization: Bearer <token>" on every request).
 * Token refresh / retry on 401 is also handled transparently.
 */
export const transactionApi = {
  /** POST /api/trading/transactions */
  create(payload: CreateTransactionRequest): Promise<Transaction> {
    return fetchJson<Transaction>("/api/trading/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        symbol: payload.symbol.toUpperCase(),
        side: payload.side.toUpperCase() as "BUY" | "SELL",
      }),
      cache: "no-store",
    });
  },

  /** GET /api/trading/transactions?symbol=&page=&per_page= */
  async list(query?: ListTransactionsQuery): Promise<ListTransactionsResponse> {
    const params = new URLSearchParams();
    if (query?.symbol) params.set("symbol", query.symbol.toUpperCase());
    if (query?.page) params.set("page", String(query.page));
    if (query?.per_page) params.set("per_page", String(query.per_page));
    const qs = params.toString();
    const payload = await fetchJson<unknown>(
      `/api/trading/transactions${qs ? `?${qs}` : ""}`,
      { method: "GET", cache: "no-store" },
    );
    return normalizeListResponse(payload, query);
  },

  /** GET /api/trading/transactions/:id */
  getById(id: string): Promise<Transaction> {
    return fetchJson<Transaction>(`/api/trading/transactions/${id}`, {
      method: "GET",
      cache: "no-store",
    });
  },

  /** DELETE /api/trading/transactions/:id */
  remove(id: string): Promise<void> {
    return fetchJson<void>(`/api/trading/transactions/${id}`, {
      method: "DELETE",
      cache: "no-store",
    });
  },
};
