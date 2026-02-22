import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** GET /api/coinai/watchlist */
export const GET = withApiLogging(async (request: NextRequest) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "CoinAI service not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/coinai/watchlist`, { cache: "no-store" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
  }
});

/** POST /api/coinai/watchlist  body: { symbol, interval? } */
export const POST = withApiLogging(async (request: NextRequest) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "CoinAI service not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/api/coinai/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
  }
});
