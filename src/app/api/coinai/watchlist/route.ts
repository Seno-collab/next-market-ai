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

/** GET /api/coinai/watchlist */
export const GET = withApiLogging(async (request: NextRequest) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "CoinAI service not configured" }, { status: 503 });
  }

  const auth = resolveAuthHeader(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const headers: Record<string, string> = { Authorization: auth };

  try {
    const response = await fetch(`${API_BASE_URL}/api/coinai/watchlist`, {
      headers,
      cache: "no-store",
    });
    const data = await readUpstreamPayload(response);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
  }
});

/** POST /api/coinai/watchlist  body: { symbol } */
export const POST = withApiLogging(async (request: NextRequest) => {
  const origin = new URL(request.url).origin;
  if (!API_BASE_URL || API_BASE_URL === origin) {
    return NextResponse.json({ message: "CoinAI service not configured" }, { status: 503 });
  }

  const auth = resolveAuthHeader(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: auth,
  };

  try {
    const { symbol } = (await request.json()) as { symbol?: string };
    const response = await fetch(`${API_BASE_URL}/api/coinai/watchlist`, {
      method: "POST",
      headers,
      body: JSON.stringify({ symbol: (symbol ?? "").trim().toUpperCase() }),
      cache: "no-store",
    });
    const data = await readUpstreamPayload(response);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
  }
});
