import { NextResponse } from "next/server";
import { registerUser } from "@/features/auth/server/authService";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";

export const POST = withApiLogging(async (request: Request) => {
	const t = createTranslator(getRequestLocale(request));
	try {
		const payload = await request.json();
		const result = registerUser(payload);
		return NextResponse.json(result);
	} catch (error) {
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? t(error.message)
						: t("auth.errors.registerFailed"),
			},
			{ status: 400 },
		);
	}
});
