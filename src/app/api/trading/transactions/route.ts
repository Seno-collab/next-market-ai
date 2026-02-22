import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Forward the Authorization header from the incoming request, falling back to the auth cookie. */
function resolveAuthHeader(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header) return header;
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie) return `Bearer ${cookie}`;
  return null;
}

/** POST /api/trading/transactions — create a new transaction */
export const POST = withApiLogging(async (request: NextRequest) => {
  const auth = resolveAuthHeader(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "Trading API not configured" }, { status: 503 });
  }

  try {
    const body = await request.text();
    const response = await fetch(`${API_BASE_URL}/api/trading/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body,
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Trading service unavailable" }, { status: 502 });
  }
});

/** GET /api/trading/transactions?symbol=&page=&per_page= — list transactions */
export const GET = withApiLogging(async (request: NextRequest) => {
  const auth = resolveAuthHeader(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "Trading API not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/trading/transactions${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers: { Authorization: auth },
        cache: "no-store",
      },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Trading service unavailable" }, { status: 502 });
  }
});
