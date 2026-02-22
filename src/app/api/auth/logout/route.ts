import { NextRequest, NextResponse } from "next/server";
import { logoutUser, requireAuthContext } from "@/features/auth/server/authService";
import { getBearerToken } from "@/features/auth/server/utils";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/server";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";

export const POST = withApiLogging(async (request: NextRequest) => {
  const t = createTranslator(getRequestLocale(request));
  const cookieOptions = getAuthCookieOptions(request);
  const headerToken = getBearerToken(request.headers.get("authorization"));
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const token = headerToken ?? cookieToken ?? null;

  if (token) {
    try {
      const { email } = requireAuthContext(token);
      logoutUser(email);
    } catch {
      // Ignore invalid tokens so logout stays idempotent.
    }
  }

  const response = NextResponse.json({ message: t("auth.success.logout") });
  response.cookies.set(AUTH_COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
  return response;
});
