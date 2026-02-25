import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

export type TokenRecord = Record<string, unknown>;

export function parseResponseCode(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

export function readMessage(payload: TokenRecord): string | null {
	return typeof payload.message === "string" ? payload.message : null;
}

export function extractTokenPair(payload: TokenRecord) {
	const sources: TokenRecord[] = [];
	if (payload.data && typeof payload.data === "object") {
		sources.push(payload.data as TokenRecord);
	}
	if (payload.tokens && typeof payload.tokens === "object") {
		sources.push(payload.tokens as TokenRecord);
	}
	sources.push(payload);

	const readString = (value: unknown) =>
		typeof value === "string" ? value : undefined;

	for (const source of sources) {
		const accessToken = readString(source.accessToken ?? source.access_token);
		const refreshToken = readString(
			source.refreshToken ?? source.refresh_token,
		);
		if (accessToken && refreshToken) {
			return { accessToken, refreshToken };
		}
	}

	return null;
}

export function resolveAuthHeader(request: NextRequest): string | null {
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
