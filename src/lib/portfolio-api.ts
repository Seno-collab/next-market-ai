import type { ApiResponse, PortfolioResponse } from "@/types/portfolio";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchPortfolio(token: string): Promise<PortfolioResponse> {
  const res = await fetch(`${API_BASE}/api/trading/portfolio`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const body = (await res.json()) as ApiResponse<PortfolioResponse>;
  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`);
  }
  if (!body.data) {
    throw new ApiError(res.status, "Missing portfolio response data");
  }
  return body.data;
}
