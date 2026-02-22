import { NextResponse } from "next/server";
import { refreshTokens } from "@/features/auth/server/authService";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_BASE_URL, AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/server";

type TokenRecord = Record<string, unknown>;

function parseResponseCode(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractTokens(payload: TokenRecord) {
  const sources: TokenRecord[] = [];
  if (payload.data && typeof payload.data === "object") {
    sources.push(payload.data as TokenRecord);
  }
  if (payload.tokens && typeof payload.tokens === "object") {
    sources.push(payload.tokens as TokenRecord);
  }
  sources.push(payload);

  const readString = (value: unknown) => (typeof value === "string" ? value : undefined);

  for (const source of sources) {
    const accessToken = readString(source.accessToken ?? source.access_token);
    const refreshToken = readString(source.refreshToken ?? source.refresh_token);
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
  }
  return null;
}

export const POST = withApiLogging(async (request: Request) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  const cookieOptions = getAuthCookieOptions(request);
  try {
    const payload = await request.json();
    const refreshToken = payload?.refreshToken ?? payload?.refresh_token;
    if (!refreshToken) {
      throw new Error("errors.refreshTokenMissing");
    }
    const origin = new URL(request.url).origin;
    if (!AUTH_BASE_URL || AUTH_BASE_URL === origin) {
      const tokens = refreshTokens(refreshToken);
      const response = NextResponse.json({ tokens });
      response.cookies.set(AUTH_COOKIE_NAME, tokens.accessToken, cookieOptions);
      return response;
    }

    const response = await fetch(`${AUTH_BASE_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-locale": locale },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = (await response.json().catch(() => ({}))) as TokenRecord;
    const responseCode = parseResponseCode(data.response_code);
    const responseCodeError = responseCode !== null && responseCode >= 400;

    if (!response.ok || responseCodeError) {
      const status = response.ok ? responseCode ?? 400 : response.status;
      const message =
        typeof data.message === "string" ? t(data.message) : response.statusText || t("auth.errors.refreshFailed");
      return NextResponse.json({ message }, { status });
    }

    const tokens = extractTokens(data);
    if (!tokens) {
      return NextResponse.json({ message: t("auth.errors.refreshFailed") }, { status: 502 });
    }
    const nextResponse = NextResponse.json({ tokens });
    nextResponse.cookies.set(AUTH_COOKIE_NAME, tokens.accessToken, cookieOptions);
    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("auth.errors.refreshFailed") },
      { status: 400 },
    );
  }
});
