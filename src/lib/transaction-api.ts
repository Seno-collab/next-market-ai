import type {
  ApiResponse,
  CreateTransactionRequest,
  ListTransactionHistoryResponse,
  ListTransactionsResponse,
  Transaction,
} from "@/types/transaction";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchAuthed<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`);
  }
  return body.data as T;
}

// ─────────────────────────────────────────────────────────────────────────────

export const transactionApi = {
  /** POST /api/trading/transactions */
  create(token: string, payload: CreateTransactionRequest) {
    return fetchAuthed<Transaction>("/api/trading/transactions", token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** GET /api/trading/transactions?symbol=&page=&per_page= */
  list(
    token: string,
    query?: { symbol?: string; page?: number; per_page?: number },
  ) {
    const params = new URLSearchParams();
    if (query?.symbol) params.set("symbol", query.symbol.toUpperCase());
    if (query?.page) params.set("page", String(query.page));
    if (query?.per_page) params.set("per_page", String(query.per_page));
    const qs = params.toString();
    return fetchAuthed<ListTransactionsResponse>(
      `/api/trading/transactions${qs ? `?${qs}` : ""}`,
      token,
    );
  },

  /** GET /api/trading/transactions/history?page=&per_page= */
  history(token: string, query?: { page?: number; per_page?: number }) {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.per_page) params.set("per_page", String(query.per_page));
    const qs = params.toString();
    return fetchAuthed<ListTransactionHistoryResponse>(
      `/api/trading/transactions/history${qs ? `?${qs}` : ""}`,
      token,
    );
  },

  /** GET /api/trading/transactions/:id */
  getById(token: string, id: string) {
    return fetchAuthed<Transaction>(`/api/trading/transactions/${id}`, token);
  },

  /** DELETE /api/trading/transactions/:id */
  remove(token: string, id: string) {
    return fetchAuthed<void>(`/api/trading/transactions/${id}`, token, {
      method: "DELETE",
    });
  },
};

export { ApiError };
