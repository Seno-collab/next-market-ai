import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type TrainBody = {
  symbol?: string;
  interval?: string;
  limit?: number;
  train_ratio?: number;
  epochs?: number;
};

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

  try {
    const body = (await request.json()) as TrainBody;

    // Build query params from JSON body fields.
    const params = new URLSearchParams();
    if (body.symbol)      params.set("symbol",      body.symbol.toUpperCase());
    if (body.interval)    params.set("interval",    body.interval);
    if (body.limit)       params.set("limit",       String(body.limit));
    if (body.train_ratio) params.set("train_ratio", String(body.train_ratio));
    if (body.epochs)      params.set("epochs",      String(body.epochs));

    const response = await fetch(
      `${API_BASE_URL}/api/coinai/train?${params.toString()}`,
      { method: "POST", cache: "no-store" },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
  }
});
