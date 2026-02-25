import {
	parseResponseCode,
	readMessage,
	resolveAuthHeader,
	type TokenRecord,
} from "@/app/api/auth/_utils";
import {
	changePassword,
	requireAuthContext,
} from "@/features/auth/server/authService";
import { getBearerToken } from "@/features/auth/server/utils";
import { NextRequest, NextResponse } from "next/server";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_BASE_URL } from "@/lib/auth/server";

async function handleChangePassword(request: NextRequest) {
	const locale = getRequestLocale(request);
	const t = createTranslator(locale);
	try {
		const payload = (await request.json()) as TokenRecord;
		const currentPassword =
			typeof payload.currentPassword === "string"
				? payload.currentPassword
				: typeof payload.old_password === "string"
					? payload.old_password
					: typeof payload.oldPassword === "string"
						? payload.oldPassword
						: "";
		const newPassword =
			typeof payload.newPassword === "string"
				? payload.newPassword
				: typeof payload.new_password === "string"
					? payload.new_password
					: typeof payload.confirm_password === "string"
						? payload.confirm_password
						: "";

		if (!currentPassword || !newPassword) {
			throw new Error("auth.errors.passwordInfoMissing");
		}

		const origin = new URL(request.url).origin;
		if (AUTH_BASE_URL && AUTH_BASE_URL !== origin) {
			const authHeader = resolveAuthHeader(request);
			if (!authHeader) {
				throw new Error("auth.errors.bearerTokenMissing");
			}
			const response = await fetch(
				`${AUTH_BASE_URL}/api/auth/change-password`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						authorization: authHeader,
						"x-locale": locale,
					},
					body: JSON.stringify({
						old_password: currentPassword,
						new_password: newPassword,
						confirm_password: newPassword,
					}),
				},
			);
			const data = (await response.json().catch(() => ({}))) as TokenRecord;
			const responseCode = parseResponseCode(data.response_code);
			const responseCodeError = responseCode !== null && responseCode >= 400;
			if (!response.ok || responseCodeError) {
				const status = response.ok ? (responseCode ?? 400) : response.status;
				const upstreamMessage = readMessage(data);
				const message = upstreamMessage
					? t(upstreamMessage)
					: response.statusText || t("auth.errors.changePasswordFailed");
				return NextResponse.json({ message }, { status });
			}
			return NextResponse.json({ message: t("auth.success.changePassword") });
		}

		const token = getBearerToken(request.headers.get("authorization"));
		if (!token) {
			throw new Error("auth.errors.bearerTokenMissing");
		}
		const { email } = requireAuthContext(token);
		const user = changePassword(email, currentPassword, newPassword);
		return NextResponse.json({
			user,
			message: t("auth.success.changePassword"),
		});
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? t(error.message)
						: t("auth.errors.changePasswordFailed"),
			},
			{ status: 400 },
		);
	}
}

export const POST = withApiLogging(handleChangePassword);
export const PATCH = withApiLogging(handleChangePassword);
