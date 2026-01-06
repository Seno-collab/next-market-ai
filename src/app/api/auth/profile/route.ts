import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext, updateProfile } from "@/features/auth/server/authService";
import { getBearerToken } from "@/features/auth/server/utils";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_BASE_URL, AUTH_COOKIE_NAME } from "@/lib/auth/server";

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

function mapProfileToUser(payload: TokenRecord) {
  const profile = (payload.data && typeof payload.data === "object" ? payload.data : payload) as TokenRecord;
  const email = typeof profile.email === "string" ? profile.email : "";
  const name =
    typeof profile.full_name === "string"
      ? profile.full_name
      : typeof profile.name === "string"
        ? profile.name
        : "";
  const imageUrl =
    typeof profile.image_url === "string"
      ? profile.image_url
      : typeof (profile as Record<string, unknown>).imageUrl === "string"
        ? (profile as Record<string, string>).imageUrl
        : "";
  const id =
    typeof profile.id === "string"
      ? profile.id
      : typeof profile.user_id === "string"
        ? profile.user_id
        : email || "external-user";
  return {
    id,
    email,
    name,
    image_url: imageUrl,
    createdAt: "",
    updatedAt: "",
  };
}

export const GET = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  try {
    const origin = new URL(request.url).origin;
    if (AUTH_BASE_URL && AUTH_BASE_URL !== origin) {
      const authHeader = resolveAuthHeader(request);
      if (!authHeader) {
        throw new Error("auth.errors.bearerTokenMissing");
      }
      const response = await fetch(`${AUTH_BASE_URL}/api/auth/profile`, {
        headers: { authorization: authHeader, "x-locale": locale },
      });
      const data = (await response.json().catch(() => ({}))) as TokenRecord;
      const responseCode = parseResponseCode(data.response_code);
      const responseCodeError = responseCode !== null && responseCode >= 400;
      if (!response.ok || responseCodeError) {
        const status = response.ok ? responseCode ?? 400 : response.status;
        const message =
          typeof data.message === "string" ? t(data.message) : response.statusText || t("auth.errors.profileFailed");
        return NextResponse.json({ message }, { status });
      }
      const user = mapProfileToUser(data);
      return NextResponse.json({ user });
    }

    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) {
      throw new Error("auth.errors.bearerTokenMissing");
    }
    const { user } = requireAuthContext(token);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("auth.errors.profileFailed") },
      { status: 401 },
    );
  }
});

export const PATCH = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  try {
    const payload = (await request.json()) as TokenRecord;
    const nameValue = typeof payload.name === "string" ? payload.name : typeof payload.full_name === "string" ? payload.full_name : "";
    const name = nameValue.trim();
    const imageUrl =
      typeof payload.image_url === "string"
        ? payload.image_url
        : typeof (payload as Record<string, unknown>).imageUrl === "string"
          ? (payload as Record<string, string>).imageUrl
          : undefined;
    if (!name) {
      throw new Error("auth.errors.profileInfoMissing");
    }

    const origin = new URL(request.url).origin;
    if (AUTH_BASE_URL && AUTH_BASE_URL !== origin) {
      const authHeader = resolveAuthHeader(request);
      if (!authHeader) {
        throw new Error("auth.errors.bearerTokenMissing");
      }
      const response = await fetch(`${AUTH_BASE_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", authorization: authHeader, "x-locale": locale },
        body: JSON.stringify({ full_name: name, image_url: imageUrl }),
      });
      const data = (await response.json().catch(() => ({}))) as TokenRecord;
      const responseCode = parseResponseCode(data.response_code);
      const responseCodeError = responseCode !== null && responseCode >= 400;
      if (!response.ok || responseCodeError) {
        const status = response.ok ? responseCode ?? 400 : response.status;
        const message =
          typeof data.message === "string"
            ? t(data.message)
            : response.statusText || t("auth.errors.profileUpdateFailed");
        return NextResponse.json({ message }, { status });
      }
      const user = mapProfileToUser(data);
      return NextResponse.json({ user, message: t("auth.success.profileUpdate") });
    }

    const token = getBearerToken(request.headers.get("authorization"));
    if (!token) {
      throw new Error("auth.errors.bearerTokenMissing");
    }
    const { email } = requireAuthContext(token);
    const user = updateProfile(email, name, imageUrl);
    return NextResponse.json({ user, message: t("auth.success.profileUpdate") });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("auth.errors.profileUpdateFailed") },
      { status: 400 },
    );
  }
});
