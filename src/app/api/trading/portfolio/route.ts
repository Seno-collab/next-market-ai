import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolveAuthHeader(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header) return header;
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie) return `Bearer ${cookie}`;
  return null;
}

/** GET /api/trading/portfolio — fetch aggregated P&L positions */
export const GET = withApiLogging(async (request: NextRequest) => {
  const auth = resolveAuthHeader(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "Trading API not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/trading/portfolio`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Trading service unavailable" }, { status: 502 });
  }
});
