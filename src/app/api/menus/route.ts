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


function parseCursor(value: string | null) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric;
  }

  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    const decodedNumber = Number(decoded);
    if (Number.isFinite(decodedNumber) && decodedNumber >= 0) {
      return decodedNumber;
    }
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === "object") {
      const offsetCandidate = (parsed as Record<string, unknown>).offset ??
        (parsed as Record<string, unknown>).cursor ??
        (parsed as Record<string, unknown>).start ??
        (parsed as Record<string, unknown>).index;
      const offsetNumber = Number(offsetCandidate);
      if (Number.isFinite(offsetNumber) && offsetNumber >= 0) {
        return offsetNumber;
      }
    }
  } catch {
    // ignore malformed cursor values
  }

  return null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
  const categoryParam = url.searchParams.get("category");
  const filterParam = url.searchParams.get("filter") ?? url.searchParams.get("q");
  const limitParam = url.searchParams.get("limit");
  const pageParam = url.searchParams.get("page");
  const cursorParam = url.searchParams.get("cursor");
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

      const sanitized = { ...data };
      delete (sanitized as Record<string, unknown>).response_code;
      return NextResponse.json(sanitized);
    } catch (error) {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : t("menu.errors.loadFailed") },
        { status: 502 },
      );
    }
  }

  const normalizedCategory = normalizeCategory(categoryParam ?? typeParam);
  const filter = typeof filterParam === "string" ? filterParam.trim().toLowerCase() : "";
  const limit = readNumber(limitParam);
  const page = readNumber(pageParam);
  const cursor = parseCursor(cursorParam);

  let items = listMenuItems();
  if (normalizedCategory) {
    items = items.filter((item) => normalizeCategory(item.category) === normalizedCategory);
  }
  if (filter) {
    items = items.filter((item) => {
      const name = t(item.name).toLowerCase();
      const description = item.description ? t(item.description).toLowerCase() : "";
      const sku = item.sku ? item.sku.toLowerCase() : "";
      return name.includes(filter) || description.includes(filter) || sku.includes(filter);
    });
  }

  const totalItems = items.length;
  const safeLimit = limit && limit > 0 ? limit : totalItems > 0 ? totalItems : 1;

  const start = cursor !== null ? Math.max(0, Math.floor(cursor)) : (() => {
    const pageIndex = page && page > 0 ? page - 1 : 0;
    return pageIndex * safeLimit;
  })();

  const pagedItems = items.slice(start, start + safeLimit);
  const totalPages = safeLimit > 0 ? Math.max(1, Math.ceil(totalItems / safeLimit)) : 1;
  const currentPage = Math.min(Math.max(1, Math.floor(start / safeLimit) + 1), totalPages);
  const nextCursor = start + safeLimit < totalItems ? String(start + safeLimit) : null;
  const prevCursor = start > 0 ? String(Math.max(0, start - safeLimit)) : null;
  const hasMore = Boolean(nextCursor);

  return NextResponse.json({
    items: pagedItems,
    data: {
      items: pagedItems,
      limit: safeLimit,
      page: currentPage,
      cursor: String(start),
      next_cursor: nextCursor,
      prev_cursor: prevCursor,
      has_more: hasMore,
      total_items: totalItems,
      total_pages: totalPages,
    },
    message: "OK",
  });
});
