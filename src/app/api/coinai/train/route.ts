import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type TrainBody = {
  symbol?: string;
  interval?: string;
  algorithm?: "auto" | "linear" | "ensemble";
  limit?: number;
  train_ratio?: number;
  val_ratio?: number;
  min_trust_score?: number;
  epochs?: number;
  long_threshold?: number;
  short_threshold?: number;
  slippage_bps?: number;
  latency_bars?: number;
  max_drawdown_stop?: number;
};

function resolveAuthHeader(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header) return header;
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie) return `Bearer ${cookie}`;
  return null;
}

async function readUpstreamPayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return { message: response.statusText || "CoinAI service unavailable" };
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

/**
 * POST /api/coinai/train
 * Frontend sends JSON body; this proxy converts it to query params
 * because the Go backend expects: POST /api/coinai/train?symbol=...&interval=...
 */
export const POST = withApiLogging(async (request: NextRequest) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "CoinAI service not configured" }, { status: 503 });
  }
  const auth = resolveAuthHeader(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as TrainBody;

    // Build query params from JSON body fields.
    const params = new URLSearchParams();
    if (body.symbol) params.set("symbol", body.symbol.toUpperCase());
    if (body.interval) params.set("interval", body.interval);
    if (body.algorithm) params.set("algorithm", body.algorithm);
    if (typeof body.limit === "number") params.set("limit", String(body.limit));
    if (typeof body.train_ratio === "number") {
      params.set("train_ratio", String(body.train_ratio));
    }
    if (typeof body.val_ratio === "number") {
      params.set("val_ratio", String(body.val_ratio));
    }
    if (typeof body.min_trust_score === "number") {
      params.set("min_trust_score", String(body.min_trust_score));
    }
    if (typeof body.epochs === "number") {
      params.set("epochs", String(body.epochs));
    }
    if (typeof body.long_threshold === "number") {
      params.set("long_threshold", String(body.long_threshold));
    }
    if (typeof body.short_threshold === "number") {
      params.set("short_threshold", String(body.short_threshold));
    }
    if (typeof body.slippage_bps === "number") {
      params.set("slippage_bps", String(body.slippage_bps));
    }
    if (typeof body.latency_bars === "number") {
      params.set("latency_bars", String(body.latency_bars));
    }
    if (typeof body.max_drawdown_stop === "number") {
      params.set("max_drawdown_stop", String(body.max_drawdown_stop));
    }

    const headers: Record<string, string> = { Authorization: auth };

    const response = await fetch(
      `${API_BASE_URL}/api/coinai/train?${params.toString()}`,
      { method: "POST", headers, cache: "no-store" },
    );
    const data = await readUpstreamPayload(response);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
  }
});
