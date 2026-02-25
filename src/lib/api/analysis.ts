import type {
  AnalysisResult,
  ApiResponse,
  DailyReport,
  TradeDecisionMode,
} from "@/types/trading";

export type { AnalysisResult, DailyReport };

type DailyReportOptions = {
  date?: string;
  includeCoinAI?: boolean;
  decisionMode?: TradeDecisionMode;
};

async function fetchAnalysisApi<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: "GET", cache: "no-store", signal });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  if (!("data" in body) || body.data === undefined) throw new Error("Missing data in response");
  return body.data;
}

export const analysisApi = {
  /** GET /api/trading/analysis/:symbol?interval= */
  getAnalysis(
    symbol: string,
    interval = "1h",
    signal?: AbortSignal,
  ): Promise<AnalysisResult> {
    return fetchAnalysisApi<AnalysisResult>(
      `/api/trading/analysis/${symbol.toUpperCase()}?interval=${interval}`,
      signal,
    );
  },

  /** GET /api/trading/report/daily?symbol=&interval=&date=&include_coinai=&decision_mode= */
  getDailyReport(
    symbol: string,
    interval = "1h",
    options?: DailyReportOptions,
    signal?: AbortSignal,
  ): Promise<DailyReport> {
    const params = new URLSearchParams({ symbol: symbol.toUpperCase(), interval });
    if (options?.date) params.set("date", options.date);
    if (options?.includeCoinAI !== undefined) {
      params.set("include_coinai", String(options.includeCoinAI));
    }
    if (options?.decisionMode) {
      params.set("decision_mode", options.decisionMode);
    }
    return fetchAnalysisApi<DailyReport>(
      `/api/trading/report/daily?${params.toString()}`,
      signal,
    );
  },
};
