import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type RouteContext = { params: Promise<{ symbol: string }> };

/** DELETE /api/coinai/watchlist/:symbol */
export const DELETE = withApiLogging(async (request: NextRequest, ctx: RouteContext) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "CoinAI service not configured" }, { status: 503 });
  }

  const { symbol } = await ctx.params;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/coinai/watchlist/${symbol.toUpperCase()}`,
      { method: "DELETE", cache: "no-store" },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
  }
});
