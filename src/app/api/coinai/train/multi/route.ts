import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type TrainMultiBody = {
	symbols?: string[];
	interval?: string;
	limit?: number;
	train_ratio?: number;
	epochs?: number;
};

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
		const body = (await request.json()) as TrainMultiBody;
		const symbols = Array.isArray(body.symbols)
			? body.symbols.map((symbol) => symbol.toUpperCase())
			: [];

		const response = await fetch(`${API_BASE_URL}/api/coinai/train/multi`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
