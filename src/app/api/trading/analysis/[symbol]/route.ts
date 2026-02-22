import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type RouteContext = { params: Promise<{ symbol: string }> };

/** GET /api/trading/analysis/:symbol?interval=1h */
export const GET = withApiLogging(async (request: NextRequest, ctx: RouteContext) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "Trading API not configured" }, { status: 503 });
  }

  const { symbol } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get("interval") ?? "1h";

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/trading/analysis/${symbol.toUpperCase()}?interval=${interval}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Trading service unavailable" }, { status: 502 });
  }
});
