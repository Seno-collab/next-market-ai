import { NextRequest } from "next/server";
import {
	proxyTradingJson,
	tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

export const GET = withApiLogging(
	async (
		request: NextRequest,
		{ params }: { params: Promise<{ symbol: string }> },
	) => {
		const { symbol } = await params;
		try {
			return await proxyTradingJson(
				request,
				`/api/trading/ticker/${symbol.toUpperCase()}`,
			);
		} catch {
			return tradingUnavailableResponse();
		}
	},
);
