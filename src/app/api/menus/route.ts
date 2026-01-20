import { listMenuItems } from "@/features/menu/server/menuStore";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";
import { normalizeCategory, parseResponseCode } from "@/lib/menu/utils";
import { NextResponse, type NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type TokenRecord = Record<string, unknown>;

function resolveAuthHeader(request: NextRequest) {
  const headerToken = request.headers.get("authorization");
  if (headerToken) {
    return headerToken;
  }
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return null;
  }
  return `Bearer ${cookieToken}`;
}

function resolveRestaurantHeader(request: NextRequest) {
  const headerValue = request.headers.get("x-restaurant-id");
  if (!headerValue) {
    return null;
  }
  const trimmed = headerValue.trim();
  return trimmed ? trimmed : null;
}


function parseTopics(value: string | null) {
  if (!value) {
    return { ids: [] as number[], keywords: [] as string[] };
  }
  const ids = new Set<number>();
  const keywords: string[] = [];
  value
    .split(/[,|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const numeric = Number(part);
      if (Number.isFinite(numeric)) {
        ids.add(numeric);
        return;
      }
      keywords.push(part.toLowerCase());
    });
  return { ids: Array.from(ids), keywords };
}

function buildProxyUrl(request: NextRequest) {
  const targetUrl = new URL(`${API_BASE_URL}/api/menus`);
  targetUrl.search = new URL(request.url).search;
  return targetUrl.toString();
}

export const GET = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const topicsParam = url.searchParams.get("topics") ?? url.searchParams.get("topic");
  const origin = url.origin;
  const shouldProxy = API_BASE_URL && API_BASE_URL !== origin;

  if (shouldProxy) {
    try {
      const authHeader = resolveAuthHeader(request);
      const restaurantHeader = resolveRestaurantHeader(request);
      const headers: HeadersInit = { "x-locale": locale };
      if (authHeader) {
        headers.authorization = authHeader;
      }
      if (restaurantHeader) {
        headers["X-Restaurant-ID"] = restaurantHeader;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let response: Response;
      try {
        response = await fetch(buildProxyUrl(request), { headers, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      const data = (await response.json().catch(() => ({}))) as TokenRecord;
      const responseCode = parseResponseCode(data.response_code);
      const responseCodeError = responseCode !== null && responseCode >= 400;

      if (!response.ok || responseCodeError) {
        const status = response.ok ? responseCode ?? 400 : response.status;
        const message =
          typeof data.message === "string" ? t(data.message) : response.statusText || t("menu.errors.loadFailed");
        return NextResponse.json({ message }, { status });
      }

      return NextResponse.json(data);
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : t("menu.errors.loadFailed") },
        { status: 502 },
      );
    }
  }

  const normalizedCategory = normalizeCategory(typeParam);
  const topics = parseTopics(topicsParam);
  const keywords = topics.keywords;
  const topicIds = topics.ids;

  let items = listMenuItems();
  if (normalizedCategory) {
    items = items.filter((item) => normalizeCategory(item.category) === normalizedCategory);
  }
  if (topicIds.length > 0) {
    items = items.filter((item) => typeof item.topicId === "number" && topicIds.includes(item.topicId));
  }
  if (keywords.length > 0) {
    items = items.filter((item) => {
      const name = t(item.name).toLowerCase();
      const description = item.description ? t(item.description).toLowerCase() : "";
      const sku = item.sku ? item.sku.toLowerCase() : "";
      return keywords.some((keyword) => name.includes(keyword) || description.includes(keyword) || sku.includes(keyword));
    });
  }

  return NextResponse.json({ items, message: "OK", response_code: 200 });
});
