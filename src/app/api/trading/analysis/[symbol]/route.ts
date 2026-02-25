import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

type RouteContext = { params: Promise<{ symbol: string }> };

/** GET /api/trading/analysis/:symbol?interval=1h */
export const GET = withApiLogging(
	async (request: NextRequest, ctx: RouteContext) => {
		const { symbol } = await ctx.params;
		const { searchParams } = new URL(request.url);
		const params = new URLSearchParams({
			interval: searchParams.get("interval") ?? "1h",
		});

		try {
			return await proxyTradingJson(
				request,
				`/api/trading/analysis/${symbol.toUpperCase()}`,
				{ search: `?${params.toString()}` },
			);
		} catch {
			return tradingUnavailableResponse();
		}
	},
);
