import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** GET /api/trading/quotes — list all quote assets with pair count */
export const GET = withApiLogging(async (request: NextRequest) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "Trading API not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/trading/quotes`, { cache: "no-store" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Trading service unavailable" }, { status: 502 });
  }
});
