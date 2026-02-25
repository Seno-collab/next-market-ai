import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

/** GET /api/trading/symbols?quote=USDT&search=BTC */
export const GET = withApiLogging(async (request: NextRequest) => {
	const search = new URL(request.url).search;
	try {
		return await proxyTradingJson(request, "/api/trading/symbols", { search });
	} catch {
		return tradingUnavailableResponse();
	}
});
