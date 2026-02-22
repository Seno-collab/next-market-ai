import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_BASE_URL, AUTH_COOKIE_NAME } from "@/lib/auth/server";
import { createTranslator, getRequestLocale } from "@/i18n/translator";

function resolveAuthHeader(request: NextRequest) {
  const headerToken = request.headers.get("authorization");
  if (headerToken) return headerToken;
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!cookieToken) return null;
  return `Bearer ${cookieToken}`;
}

export const POST = withApiLogging(async (request: NextRequest) => {
  const t = createTranslator(getRequestLocale(request));
  const authHeader = resolveAuthHeader(request);

  if (!authHeader) {
    return NextResponse.json({ message: t("auth.errors.notAuthenticated") }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const shouldProxy = AUTH_BASE_URL && AUTH_BASE_URL !== origin;

  if (shouldProxy) {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/api/auth/heartbeat`, {
        method: "POST",
        headers: { authorization: authHeader },
      });

      if (!response.ok) {
        return NextResponse.json({ message: t("auth.errors.heartbeatFailed") }, { status: response.status });
      }

      return NextResponse.json({ message: "OK" });
    } catch {
      return NextResponse.json({ message: t("auth.errors.heartbeatFailed") }, { status: 502 });
    }
  }

  // Dev/local fallback — no real Redis, just acknowledge
  return NextResponse.json({ message: "OK" });
});
