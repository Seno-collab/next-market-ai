import { NextResponse } from "next/server";
import {
	extractTokenPair,
	parseResponseCode,
	readMessage,
	type TokenRecord,
} from "@/app/api/auth/_utils";
import { loginUser } from "@/features/auth/server/authService";
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
		const origin = new URL(request.url).origin;

		if (!AUTH_BASE_URL || AUTH_BASE_URL === origin) {
			const result = loginUser(payload);
			const response = NextResponse.json(result);
			response.cookies.set(
				AUTH_COOKIE_NAME,
				result.tokens.accessToken,
				cookieOptions,
			);
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
			const status = authResponse.ok
				? (responseCode ?? 400)
				: authResponse.status;
			const isInvalidCredentials = status === 401 || status === 403;
			const upstreamMessage = readMessage(data);
			const message = isInvalidCredentials
				? t("auth.errors.invalidCredentials")
				: upstreamMessage
					? t(upstreamMessage)
					: authResponse.statusText || t("auth.errors.loginFailed");
			return NextResponse.json({ message }, { status });
		}

		const tokens = extractTokenPair(data);
		if (!tokens) {
			return NextResponse.json(
				{ message: t("auth.errors.missingTokenFromServer") },
				{ status: 502 },
			);
		}

		const user =
			(data.user as unknown) ??
			(data.data && typeof data.data === "object"
				? (data.data as TokenRecord).user
				: null) ??
			null;

		const response = NextResponse.json({ user, tokens });
		response.cookies.set(AUTH_COOKIE_NAME, tokens.accessToken, cookieOptions);
		return response;
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? t(error.message)
						: t("auth.errors.loginFailed"),
			},
			{ status: 400 },
		);
	}
});
