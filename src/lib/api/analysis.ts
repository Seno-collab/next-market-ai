import type { AnalysisResult, DailyReport, ApiResponse } from "@/types/trading";

export type { AnalysisResult, DailyReport };

async function fetchAnalysisApi<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "GET", cache: "no-store" });
  const body = (await res.json()) as ApiResponse<T>;
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  if (!("data" in body) || body.data === undefined) throw new Error("Missing data in response");
  return body.data;
}

export const analysisApi = {
  /** GET /api/trading/analysis/:symbol?interval= */
  getAnalysis(symbol: string, interval = "1h"): Promise<AnalysisResult> {
    return fetchAnalysisApi<AnalysisResult>(
      `/api/trading/analysis/${symbol.toUpperCase()}?interval=${interval}`,
    );
  },

  /** GET /api/trading/report/daily?symbol=&interval=&date= */
  getDailyReport(symbol: string, interval = "1h", date?: string): Promise<DailyReport> {
    const params = new URLSearchParams({ symbol: symbol.toUpperCase(), interval });
    if (date) params.set("date", date);
    return fetchAnalysisApi<DailyReport>(`/api/trading/report/daily?${params.toString()}`);
  },
};
