import { NextRequest } from "next/server";
import {
  proxyTradingJson,
  resolveTradingAuthHeader,
  tradingUnauthorizedResponse,
  tradingUnavailableResponse,
} from "@/app/api/trading/_utils";
import { withApiLogging } from "@/lib/api/withApiLogging";

/** GET /api/trading/transactions/history?limit= */
export const GET = withApiLogging(async (request: NextRequest) => {
  const authHeader = resolveTradingAuthHeader(request);
  if (!authHeader) {
    return tradingUnauthorizedResponse();
  }

  const search = new URL(request.url).search;
  try {
    return await proxyTradingJson(request, "/api/trading/transactions/history", {
      authHeader,
      search,
    });
  } catch {
    return tradingUnavailableResponse();
  }
});
