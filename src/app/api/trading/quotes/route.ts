import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

/** GET /api/trading/quotes — list all quote assets with pair count */
export const GET = withApiLogging(async (request: NextRequest) => {
	try {
		return await proxyTradingJson(request, "/api/trading/quotes");
	} catch {
		return tradingUnavailableResponse();
	}
});
