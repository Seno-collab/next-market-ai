import { createMenuItem, listMenuItems, upsertMenuItem } from "@/features/menu/server/menuStore";
import type { MenuItem } from "@/features/menu/types";
import { NextRequest, NextResponse } from "next/server";
import { createTranslator, getRequestLocale } from "@/i18n/translator";
import { withApiLogging } from "@/lib/api/withApiLogging";
import { AUTH_COOKIE_NAME } from "@/lib/auth/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type TokenRecord = Record<string, unknown>;
type MenuItemFallback = {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  sku?: string;
  topicId?: number | null;
  available?: boolean;
  imageUrl?: string;
};

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

function mapCategoryToType(category: string) {
  switch (category) {
    case "beverage":
    case "dish":
    case "combo":
    case "extra":
      return category;
    case "coffee":
    case "tea":
      return "beverage";
    case "dessert":
    case "food":
      return "dish";
    default:
      return "extra";
  }
}

function mapTypeToCategory(type: string) {
  switch (type) {
    case "beverage":
    case "dish":
    case "combo":
    case "extra":
      return type;
    case "coffee":
    case "tea":
      return "beverage";
    case "dessert":
    case "food":
      return "dish";
    default:
      return "extra";
  }
}

function readRecord(value: unknown): TokenRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as TokenRecord;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on", "active", "enabled"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off", "inactive", "disabled"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function looksLikeMenuItem(record: TokenRecord) {
  return (
    "id" in record ||
    "item_id" in record ||
    "menu_item_id" in record ||
    "name" in record ||
    "title" in record ||
    "type" in record ||
    "category" in record
  );
}

function extractMenuItemRecord(payload: TokenRecord) {
  const data = readRecord(payload.data);
  const nestedItem = data ? readRecord(data.item ?? data.menu_item) : null;
  const directItem = readRecord(payload.item ?? payload.menu_item);
  const candidates = [nestedItem, directItem, data, payload].filter(Boolean) as TokenRecord[];
  return candidates.find((candidate) => looksLikeMenuItem(candidate)) ?? null;
}

function readMenuItemId(record: TokenRecord) {
  const idValue = record.id ?? record.menu_item_id ?? record.item_id ?? record.menuItemId;
  if (typeof idValue === "string" && idValue.trim()) {
    return idValue;
  }
  if (typeof idValue === "number" && Number.isFinite(idValue)) {
    return String(idValue);
  }
  return null;
}

function extractMenuItemId(payload: TokenRecord) {
  const record = extractMenuItemRecord(payload);
  if (!record) {
    return null;
  }
  return readMenuItemId(record);
}

function mapMenuItemPayload(payload: TokenRecord, fallback: MenuItemFallback = {}): MenuItem | null {
  const record = extractMenuItemRecord(payload);
  if (!record) {
    return null;
  }
  const id = readMenuItemId(record);
  if (!id) {
    return null;
  }
  const name = readString(record.name ?? record.title) ?? fallback.name ?? "";
  const description = readString(record.description ?? record.desc ?? record.detail) ?? fallback.description ?? "";
  const typeValue = readString(record.type);
  const category =
    readString(record.category ?? record.category_code) ??
    fallback.category ??
    (typeValue ? mapTypeToCategory(typeValue) : "other");
  const price =
    readNumber(record.price ?? record.price_value ?? record.price_vnd ?? record.priceValue) ?? fallback.price ?? 0;
  const sku = readString(record.sku ?? record.sku_code ?? record.code) ?? fallback.sku ?? "";
  const topicId =
    readNumber(record.topic_id ?? record.topicId ?? record.menu_topic_id) ?? (fallback.topicId ?? null);
  const available =
    readBoolean(record.available ?? record.is_available ?? record.is_active ?? record.active ?? record.status) ??
    fallback.available ??
    true;
  const imageUrl =
    readString(record.image_url ?? record.imageUrl ?? record.image ?? record.thumbnail_url) ?? fallback.imageUrl ?? "";
  const createdAt = readString(record.created_at ?? record.createdAt) ?? new Date().toISOString();
  const updatedAt = readString(record.updated_at ?? record.updatedAt) ?? createdAt;

  return {
    id,
    name,
    description: description || undefined,
    category,
    price,
    sku: sku || undefined,
    topicId: topicId ?? undefined,
    available,
    is_active: available,
    imageUrl: imageUrl || undefined,
    createdAt,
    updatedAt,
  };
}

export const GET = withApiLogging(async () => {
  const items = listMenuItems();
  return NextResponse.json({ items });
});

export const POST = withApiLogging(async (request: NextRequest) => {
  const locale = getRequestLocale(request);
  const t = createTranslator(locale);
  try {
    const payload = await request.json();
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) {
      return NextResponse.json({ message: t("menu.errors.nameRequired") }, { status: 400 });
    }
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ message: t("menu.errors.priceInvalid") }, { status: 400 });
    }
    const description = typeof payload.description === "string" ? payload.description.trim() : "";
    const category = typeof payload.category === "string" && payload.category ? payload.category : "other";
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
    const available = typeof payload.available === "boolean" ? payload.available : true;
    const sku = typeof payload.sku === "string" ? payload.sku.trim() : "";
    const topicId = readNumber(payload.topicId ?? payload.topic_id);

    const origin = new URL(request.url).origin;
    const shouldProxy = API_BASE_URL && API_BASE_URL !== origin;

    if (shouldProxy) {
      const createPayload: Record<string, unknown> = {
        name,
        description: description || undefined,
        price,
        image_url: imageUrl || undefined,
        type: mapCategoryToType(category),
      };

      if (sku) {
        createPayload.sku = sku;
      }
      if (topicId !== null) {
        createPayload.topic_id = topicId;
      }

      const authHeader = resolveAuthHeader(request);
      const restaurantHeader = resolveRestaurantHeader(request);
      const headers: HeadersInit = { "Content-Type": "application/json", "x-locale": locale };
      if (authHeader) {
        headers.authorization = authHeader;
      }
      if (restaurantHeader) {
        headers["X-Restaurant-ID"] = restaurantHeader;
      }

      const response = await fetch(`${API_BASE_URL}/api/menu/items`, {
        method: "POST",
        headers,
        body: JSON.stringify(createPayload),
      });

      const data = (await response.json().catch(() => ({}))) as TokenRecord;
      const responseCode = parseResponseCode(data.response_code);
      const responseCodeError = responseCode !== null && responseCode >= 400;

      if (!response.ok || responseCodeError) {
        const status = response.ok ? responseCode ?? 400 : response.status;
        const message =
          typeof data.message === "string" ? t(data.message) : response.statusText || t("menu.errors.createFailed");
        return NextResponse.json({ message }, { status });
      }

      const createdId = extractMenuItemId(data);
      if (!createdId) {
        return NextResponse.json({ message: t("menu.errors.createFailed") }, { status: 502 });
      }

      const getHeaders: HeadersInit = { "x-locale": locale };
      if (authHeader) {
        getHeaders.authorization = authHeader;
      }
      if (restaurantHeader) {
        getHeaders["X-Restaurant-ID"] = restaurantHeader;
      }

      const itemResponse = await fetch(`${API_BASE_URL}/api/menu/items/${createdId}`, {
        headers: getHeaders,
      });

      const itemData = (await itemResponse.json().catch(() => ({}))) as TokenRecord;
      const itemResponseCode = parseResponseCode(itemData.response_code);
      const itemResponseCodeError = itemResponseCode !== null && itemResponseCode >= 400;

      if (!itemResponse.ok || itemResponseCodeError) {
        const status = itemResponse.ok ? itemResponseCode ?? 400 : itemResponse.status;
        const message =
          typeof itemData.message === "string"
            ? t(itemData.message)
            : itemResponse.statusText || t("menu.errors.createFailed");
        return NextResponse.json({ message }, { status });
      }

      const item = mapMenuItemPayload(itemData, {
        name,
        description,
        category,
        price,
        sku: sku || undefined,
        topicId,
        available,
        imageUrl,
      });

      if (!item) {
        return NextResponse.json({ message: t("menu.errors.createFailed") }, { status: 502 });
      }

      upsertMenuItem(item);
      return NextResponse.json({ item }, { status: 201 });
    }

    const item = createMenuItem({
      name,
      description,
      category,
      price,
      sku: sku || undefined,
      topicId,
      available,
      imageUrl,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? t(error.message) : t("menu.errors.createFailed") },
      { status: 400 },
    );
  }
});
