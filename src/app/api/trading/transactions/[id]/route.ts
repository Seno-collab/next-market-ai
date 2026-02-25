import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	resolveTradingAuthHeader,
	tradingUnauthorizedResponse,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/trading/transactions/:id */
export const GET = withApiLogging(
	async (request: NextRequest, ctx: RouteContext) => {
		const authHeader = resolveTradingAuthHeader(request);
		if (!authHeader) {
			return tradingUnauthorizedResponse();
		}

		const { id } = await ctx.params;
		try {
			return await proxyTradingJson(
				request,
				`/api/trading/transactions/${id}`,
				{
					authHeader,
				},
			);
		} catch {
			return tradingUnavailableResponse();
		}
	},
);

/** DELETE /api/trading/transactions/:id */
export const DELETE = withApiLogging(
	async (request: NextRequest, ctx: RouteContext) => {
		const authHeader = resolveTradingAuthHeader(request);
		if (!authHeader) {
			return tradingUnauthorizedResponse();
		}

		const { id } = await ctx.params;
		try {
			return await proxyTradingJson(
				request,
				`/api/trading/transactions/${id}`,
				{
					method: "DELETE",
					authHeader,
				},
			);
		} catch {
			return tradingUnavailableResponse();
		}
	},
);
