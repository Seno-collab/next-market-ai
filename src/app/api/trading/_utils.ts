import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const MESSAGE_UNAUTHORIZED = "Unauthorized";
const MESSAGE_NOT_CONFIGURED = "Trading API not configured";
const MESSAGE_UNAVAILABLE = "Trading service unavailable";

type TradingMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ProxyOptions = {
	method?: TradingMethod;
	authHeader?: string | null;
	body?: BodyInit | null;
	search?: string;
	contentType?: string;
};

function resolveTradingProxyBase(request: NextRequest): string | null {
	const origin = new URL(request.url).origin;
	if (!API_BASE_URL || API_BASE_URL === origin) {
		return null;
	}
	return API_BASE_URL;
}

export function tradingUnauthorizedResponse() {
	return NextResponse.json({ message: MESSAGE_UNAUTHORIZED }, { status: 401 });
}

export function tradingNotConfiguredResponse() {
	return NextResponse.json(
		{ message: MESSAGE_NOT_CONFIGURED },
		{ status: 503 },
	);
}

export function tradingUnavailableResponse() {
	return NextResponse.json({ message: MESSAGE_UNAVAILABLE }, { status: 502 });
}

export function resolveTradingAuthHeader(request: NextRequest): string | null {
	const header = request.headers.get("authorization");
	if (header) {
		return header;
	}
	const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
	if (cookie) {
		return `Bearer ${cookie}`;
	}
	return null;
}

export async function proxyTradingJson(
	request: NextRequest,
	path: string,
	options: ProxyOptions = {},
) {
	const proxyBase = resolveTradingProxyBase(request);
	if (!proxyBase) {
		return tradingNotConfiguredResponse();
	}

	const headers = new Headers();
	if (options.authHeader) {
		headers.set("Authorization", options.authHeader);
	}
	if (options.contentType) {
		headers.set("Content-Type", options.contentType);
	}

	const response = await fetch(
		`${proxyBase}${path}${options.search ? options.search : ""}`,
		{
			method: options.method ?? "GET",
			headers,
			body: options.body,
			cache: "no-store",
		},
	);

	const payload = (await response
		.json()
		.catch(() => ({ message: response.statusText }))) as unknown;
	return NextResponse.json(payload, { status: response.status });
}
