export const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;

/**
 * By default cookies are secure only in production. In some environments
 * (e.g. local testing with a production build running on http://localhost)
 * we need to allow overriding this so the auth cookie is sent.
 *
 * Set AUTH_COOKIE_SECURE=false in .env.local when running a prod build over HTTP.
 */
function parseCookieSecureOverride() {
  if (process.env.AUTH_COOKIE_SECURE === "true") {
    return true;
  }
  if (process.env.AUTH_COOKIE_SECURE === "false") {
    return false;
  }
  return null;
}

function isHttpsRequest(request?: Request) {
  if (!request) {
    return process.env.NODE_ENV === "production";
  }

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();

  if (forwardedProto === "https") {
    return true;
  }
  if (forwardedProto === "http") {
    return false;
  }

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function getAuthCookieOptions(request?: Request) {
  const secureOverride = parseCookieSecureOverride();
  const secure = secureOverride ?? isHttpsRequest(request);

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  };
}
