import { NextRequest, NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type MaybeErrorWithCause = Error & {
	cause?: {
		code?: string;
		message?: string;
	};
};

function isUpstreamTerminationError(error: unknown) {
	if (!(error instanceof Error)) {
		return false;
	}

	const candidate = error as MaybeErrorWithCause;
	if (candidate.name === "AbortError") {
		return true;
	}

	const message = candidate.message.toLowerCase();
	if (message.includes("terminated") || message.includes("aborted")) {
		return true;
	}

	const causeCode = candidate.cause?.code;
	if (causeCode === "UND_ERR_SOCKET") {
		return true;
	}

	return false;
}

function bridgeRealtimeStream(upstream: ReadableStream<Uint8Array>) {
	const reader = upstream.getReader();

	return new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						controller.close();
						return;
					}
					if (value) {
						controller.enqueue(value);
					}
				}
			} catch (error) {
				if (isUpstreamTerminationError(error)) {
					controller.close();
					return;
				}
				controller.error(error);
			}
		},
		async cancel() {
			try {
				await reader.cancel();
			} catch {
				// Reader can already be closed when downstream disconnects.
			}
		},
	});
}

function resolveAuthHeader(request: NextRequest): string | null {
	const header = request.headers.get("authorization");
	if (header) return header;
	const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
	if (cookie) return `Bearer ${cookie}`;
	return null;
}

function buildSseHeaders() {
	const headers = new Headers();
	headers.set("Content-Type", "text/event-stream; charset=utf-8");
	headers.set("Cache-Control", "no-cache, no-transform");
	headers.set("Connection", "keep-alive");
	headers.set("X-Accel-Buffering", "no");
	return headers;
}

function toSseEvent(event: string, payload: unknown) {
	return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function createSseErrorResponse(status: number, message: string) {
	const streamPayload =
		toSseEvent("error", { message, status }) +
		toSseEvent("status", { status: "stream_done" });
	return new Response(streamPayload, {
		status: 200,
		headers: buildSseHeaders(),
	});
}

function requestPrefersSse(request: NextRequest) {
	const accept = request.headers.get("accept") ?? "";
	return accept.includes("text/event-stream");
}

async function readUpstreamPayload(response: Response) {
	const text = await response.text();
	if (!text) {
		return { message: response.statusText || "CoinAI realtime stream unavailable" };
	}
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return { message: text };
	}
}

/** GET /api/coinai/train/realtime?symbol=BTCUSDT&interval=1m&refresh=20s */
export const GET = withApiLogging(async (request: NextRequest) => {
	const wantsSse = requestPrefersSse(request);
	const origin = new URL(request.url).origin;
	if (!API_BASE_URL || API_BASE_URL === origin) {
		if (wantsSse) {
			return createSseErrorResponse(503, "CoinAI service not configured");
		}
		return NextResponse.json({ message: "CoinAI service not configured" }, { status: 503 });
	}

	const search = new URL(request.url).search;
	const auth = resolveAuthHeader(request);
	if (!auth) {
		if (wantsSse) {
			return createSseErrorResponse(401, "Unauthorized");
		}
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}
	const upstreamHeaders: Record<string, string> = {
		Accept: "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		Authorization: auth,
	};

	try {
		const response = await fetch(
				`${API_BASE_URL}/api/coinai/train/realtime${search}`,
				{
					method: "GET",
					headers: upstreamHeaders,
					cache: "no-store",
					signal: request.signal,
				},
			);

		const contentType = response.headers.get("content-type") ?? "";
		if (!response.ok && !contentType.includes("text/event-stream")) {
			const payload = (await readUpstreamPayload(response)) as { message?: string };
			const message = payload?.message || "CoinAI realtime stream unavailable";
			if (wantsSse) {
				return createSseErrorResponse(response.status, message);
			}
			return NextResponse.json(payload, { status: response.status });
		}

		if (!response.body) {
			const status = response.status || 502;
			if (wantsSse) {
				return createSseErrorResponse(status, "CoinAI realtime stream unavailable");
			}
			return NextResponse.json({ message: "CoinAI realtime stream unavailable" }, { status });
		}

		const bridgedStream = bridgeRealtimeStream(response.body);

		return new Response(bridgedStream, {
			status: response.status,
			headers: buildSseHeaders(),
		});
	} catch {
		if (wantsSse) {
			return createSseErrorResponse(502, "CoinAI service unavailable");
		}
		return NextResponse.json({ message: "CoinAI service unavailable" }, { status: 502 });
	}
});
