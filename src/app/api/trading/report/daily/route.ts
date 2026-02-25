import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

/** GET /api/trading/report/daily?symbol=BTCUSDT&interval=1h&date=2026-02-22 */
export const GET = withApiLogging(async (request: NextRequest) => {
	const search = new URL(request.url).search;
	try {
		return await proxyTradingJson(request, "/api/trading/report/daily", {
			search,
		});
	} catch {
		return tradingUnavailableResponse();
	}
});
