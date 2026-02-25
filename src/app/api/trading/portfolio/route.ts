import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	resolveTradingAuthHeader,
	tradingUnauthorizedResponse,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

/** GET /api/trading/portfolio — fetch aggregated P&L positions */
export const GET = withApiLogging(async (request: NextRequest) => {
	const authHeader = resolveTradingAuthHeader(request);
	if (!authHeader) {
		return tradingUnauthorizedResponse();
	}

	try {
		return await proxyTradingJson(request, "/api/trading/portfolio", {
			authHeader,
		});
	} catch {
		return tradingUnavailableResponse();
	}
});
