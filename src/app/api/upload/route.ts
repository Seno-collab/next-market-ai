import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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

function resolveRestaurantHeader(request: NextRequest) {
  const headerValue = request.headers.get("x-restaurant-id");
  if (!headerValue) {
    return null;
  }
  const trimmed = headerValue.trim();
  return trimmed ? trimmed : null;
}

export const POST = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof (file as File).arrayBuffer !== "function") {
      return NextResponse.json({ message: t("menu.errors.uploadInvalid") }, { status: 400 });
    }

    const typedFile = file as File;
    if (!typedFile.type.startsWith("image/")) {
      return NextResponse.json({ message: t("menu.errors.uploadInvalid") }, { status: 400 });
    }

    if (typedFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ message: t("menu.errors.uploadTooLarge") }, { status: 413 });
    }

    const origin = new URL(request.url).origin;
    const shouldProxy = API_BASE_URL && API_BASE_URL !== origin;

    if (shouldProxy) {
      const upstreamFormData = new FormData();
      upstreamFormData.append("logo", typedFile);
      const headers: HeadersInit = { "x-locale": locale };
      const authHeader = resolveAuthHeader(request);
      const restaurantHeader = resolveRestaurantHeader(request);
      if (authHeader) {
        headers.authorization = authHeader;
      }
      if (restaurantHeader) {
        headers["X-Restaurant-ID"] = restaurantHeader;
      }

      const response = await fetch(`${API_BASE_URL}/api/upload/logo`, {
        method: "POST",
        headers,
        body: upstreamFormData,
      });

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        const message =
          typeof data.message === "string"
            ? t(data.message)
            : response.statusText || t("menu.errors.uploadFailed");
        return NextResponse.json({ message }, { status: response.status });
      }

      const url =
        (data.data && typeof data.data === "object" && typeof (data.data as Record<string, unknown>).url === "string"
          ? (data.data as Record<string, unknown>).url
          : null) ??
        (typeof data.url === "string" ? data.url : null);

      if (!url) {
        return NextResponse.json({ message: t("menu.errors.uploadFailed") }, { status: 502 });
      }

      return NextResponse.json({ url }, { status: 201 });
    }

    const extension = IMAGE_MIME_EXT[typedFile.type] ?? "bin";
    const filename = `${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await typedFile.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : t("menu.errors.uploadFailed") },
      { status: 500 },
    );
  }
});
