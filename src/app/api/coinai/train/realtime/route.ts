import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/** GET /api/coinai/train/realtime?symbol=BTCUSDT&interval=1m&refresh=20s */
export const GET = withApiLogging(async (request: NextRequest) => {
	const origin = new URL(request.url).origin;
	if (!API_BASE_URL || API_BASE_URL === origin) {
		return NextResponse.json(
			{ message: "CoinAI service not configured" },
			{ status: 503 },
		);
	}

	const search = new URL(request.url).search;

	try {
		const response = await fetch(
			`${API_BASE_URL}/api/coinai/train/realtime${search}`,
			{
				method: "GET",
				headers: {
					Accept: "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
				cache: "no-store",
			},
		);

		const contentType = response.headers.get("content-type") ?? "";
		if (!response.ok && !contentType.includes("text/event-stream")) {
			const payload = await response
				.json()
				.catch(() => ({ message: "CoinAI realtime stream unavailable" }));
			return NextResponse.json(payload, { status: response.status });
		}

		if (!response.body) {
			return NextResponse.json(
				{ message: "CoinAI realtime stream unavailable" },
				{ status: response.status || 502 },
			);
		}

		const headers = new Headers();
		headers.set("Content-Type", "text/event-stream; charset=utf-8");
		headers.set("Cache-Control", "no-cache, no-transform");
		headers.set("Connection", "keep-alive");
		headers.set("X-Accel-Buffering", "no");

		return new Response(response.body, {
			status: response.status,
			headers,
		});
	} catch {
		return NextResponse.json(
			{ message: "CoinAI service unavailable" },
			{ status: 502 },
		);
	}
});
