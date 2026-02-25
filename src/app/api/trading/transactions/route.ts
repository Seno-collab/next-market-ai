import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	resolveTradingAuthHeader,
	tradingUnauthorizedResponse,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

/** POST /api/trading/transactions — create a new transaction */
export const POST = withApiLogging(async (request: NextRequest) => {
	const authHeader = resolveTradingAuthHeader(request);
	if (!authHeader) {
		return tradingUnauthorizedResponse();
	}

	try {
		const body = await request.text();
		return await proxyTradingJson(request, "/api/trading/transactions", {
			method: "POST",
			authHeader,
			contentType: "application/json",
			body,
		});
	} catch {
		return tradingUnavailableResponse();
	}
});

/** GET /api/trading/transactions?symbol=&page=&per_page= — list transactions */
export const GET = withApiLogging(async (request: NextRequest) => {
	const authHeader = resolveTradingAuthHeader(request);
	if (!authHeader) {
		return tradingUnauthorizedResponse();
	}

	const search = new URL(request.url).search;
	try {
		return await proxyTradingJson(request, "/api/trading/transactions", {
			authHeader,
			search,
		});
	} catch {
		return tradingUnavailableResponse();
	}
});
