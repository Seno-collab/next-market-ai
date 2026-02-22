import { NextResponse } from "next/server";
import { loginUser } from "@/features/auth/server/authService";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_BASE_URL, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "@/lib/auth/server";

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
  try {
    const payload = await request.json();
    const origin = new URL(request.url).origin;

    if (!AUTH_BASE_URL || AUTH_BASE_URL === origin) {
      const result = loginUser(payload);
      const response = NextResponse.json(result);
      response.cookies.set(AUTH_COOKIE_NAME, result.tokens.accessToken, AUTH_COOKIE_OPTIONS);
      return response;
    }

    const authResponse = await fetch(`${AUTH_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-locale": locale },
      body: JSON.stringify(payload),
    });

    const data = (await authResponse.json().catch(() => ({}))) as TokenRecord;
    const responseCode = parseResponseCode(data.response_code);
    const responseCodeError = responseCode !== null && responseCode >= 400;

    if (!authResponse.ok || responseCodeError) {
      const status = authResponse.ok ? responseCode ?? 400 : authResponse.status;
      const isInvalidCredentials = status === 401 || status === 403;
      const message = isInvalidCredentials
        ? t("auth.errors.invalidCredentials")
        : typeof data.message === "string"
          ? t(data.message)
          : authResponse.statusText || t("auth.errors.loginFailed");
      return NextResponse.json({ message }, { status });
    }

    const tokens = extractTokens(data);
    if (!tokens) {
      return NextResponse.json({ message: t("auth.errors.missingTokenFromServer") }, { status: 502 });
    }

    const user =
      (data.user as unknown) ??
      (data.data && typeof data.data === "object" ? (data.data as TokenRecord).user : null) ??
      null;

    const response = NextResponse.json({ user, tokens });
    response.cookies.set(AUTH_COOKIE_NAME, tokens.accessToken, AUTH_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? t(error.message) : t("auth.errors.loginFailed"),
      },
      { status: 400 },
    );
  }
});
