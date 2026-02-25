import { NextResponse } from "next/server";
import {
	extractTokenPair,
	parseResponseCode,
	readMessage,
	type TokenRecord,
} from "@/app/api/auth/_utils";
import { refreshTokens } from "@/features/auth/server/authService";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import {
	AUTH_BASE_URL,
	AUTH_COOKIE_NAME,
	getAuthCookieOptions,
} from "@/lib/auth/server";

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
			const status = response.ok ? (responseCode ?? 400) : response.status;
			const upstreamMessage = readMessage(data);
			const message = upstreamMessage
				? t(upstreamMessage)
				: response.statusText || t("auth.errors.refreshFailed");
			return NextResponse.json({ message }, { status });
		}

		const tokens = extractTokenPair(data);
		if (!tokens) {
			return NextResponse.json(
				{ message: t("auth.errors.refreshFailed") },
				{ status: 502 },
			);
		}
		const nextResponse = NextResponse.json({ tokens });
		nextResponse.cookies.set(
			AUTH_COOKIE_NAME,
			tokens.accessToken,
			cookieOptions,
		);
		return nextResponse;
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? t(error.message)
						: t("auth.errors.refreshFailed"),
			},
			{ status: 400 },
		);
	}
});
