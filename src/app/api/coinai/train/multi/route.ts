import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type TrainMultiBody = {
	symbols?: string[];
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

/** POST /api/coinai/train/multi */
export const POST = withApiLogging(async (request: NextRequest) => {
	const origin = new URL(request.url).origin;
	if (!API_BASE_URL || API_BASE_URL === origin) {
		return NextResponse.json(
			{ message: "CoinAI service not configured" },
			{ status: 503 },
		);
	}

	try {
		const body = (await request.json().catch(() => ({}))) as TrainMultiBody;
		const symbols = Array.isArray(body.symbols)
			? body.symbols.map((symbol) => symbol.toUpperCase())
			: [];
		const auth = resolveAuthHeader(request);
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (auth) headers.Authorization = auth;

		const response = await fetch(`${API_BASE_URL}/api/coinai/train/multi`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				...body,
				symbols,
			}),
			cache: "no-store",
		});
		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch {
		return NextResponse.json(
			{ message: "CoinAI service unavailable" },
			{ status: 502 },
		);
	}
});
