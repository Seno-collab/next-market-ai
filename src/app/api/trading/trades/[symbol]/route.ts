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
		const { searchParams } = new URL(request.url);
		const search = new URLSearchParams({
			limit: searchParams.get("limit") ?? "50",
		});

		try {
			return await proxyTradingJson(
				request,
				`/api/trading/trades/${symbol.toUpperCase()}`,
				{ search: `?${search.toString()}` },
			);
		} catch {
			return tradingUnavailableResponse();
		}
	},
);
