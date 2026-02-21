import { randomUUID } from "crypto";
import type { MenuAnalytics, MenuItem, MenuItemInput, MenuItemUpdate } from "@/features/menu/types";

const items = new Map<string, MenuItem>();

function normalizeInput(input: MenuItemInput): MenuItemInput {
  if (!input.name?.trim()) {
    throw new Error("menu.errors.nameRequired");
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("menu.errors.priceInvalid");
  }
  const available = input.available ?? input.is_active ?? true;
  const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  const sku = typeof input.sku === "string" ? input.sku.trim() : "";
  return {
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    category: input.category || "extra",
    price: Number(input.price),
    sku: sku || undefined,
    available,
    is_active: available,
    imageUrl,
  };
}

export function listMenuItems() {
  return Array.from(items.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createMenuItem(payload: MenuItemInput) {
  const data = normalizeInput(payload);
  const now = new Date().toISOString();
  const available = data.available ?? true;
  const isActive = data.is_active ?? available;
  const item: MenuItem = {
    id: randomUUID(),
    ...data,
    available,
    is_active: isActive,
    createdAt: now,
    updatedAt: now,
  };
  items.set(item.id, item);
  return item;
}

export function upsertMenuItem(item: MenuItem) {
  items.set(item.id, item);
}

export function updateMenuItem(id: string, updates: MenuItemUpdate) {
  const current = items.get(id);
  if (!current) {
    throw new Error("menu.errors.itemNotFound");
  }
  const nextAvailable = updates.available ?? updates.is_active ?? current.available;
  const nextImageUrl =
    updates.imageUrl !== undefined
      ? typeof updates.imageUrl === "string"
        ? updates.imageUrl.trim()
        : ""
      : current.imageUrl ?? "";
  const nextSku =
    updates.sku !== undefined ? (typeof updates.sku === "string" ? updates.sku.trim() : "") : current.sku ?? "";
  const next: MenuItem = {
    ...current,
    ...updates,
    name: updates.name?.trim() ?? current.name,
    description: updates.description?.trim() ?? current.description,
    category: updates.category ?? current.category,
    price: updates.price ?? current.price,
    sku: nextSku || undefined,
    available: nextAvailable,
    is_active: nextAvailable,
    imageUrl: nextImageUrl,
    updatedAt: new Date().toISOString(),
  };
  if (!next.name) {
    throw new Error("menu.errors.nameRequired");
  }
  if (!Number.isFinite(next.price) || next.price <= 0) {
    throw new Error("menu.errors.priceInvalid");
  }
  items.set(id, next);
  return next;
}

export function deleteMenuItem(id: string) {
  if (!items.has(id)) {
    throw new Error("menu.errors.itemNotFound");
  }
  items.delete(id);
}

export function getMenuAnalytics(): MenuAnalytics {
  const data = listMenuItems();
  const totalItems = data.length;
  const availableItems = data.filter((item) => item.available).length;
  const averagePrice = totalItems === 0 ? 0 : data.reduce((sum, item) => sum + item.price, 0) / totalItems;
  const categoryMap = new Map<string, number>();
  data.forEach((item) => {
    categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + 1);
  });
  const categories = Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count }));
  const topItems = [...data]
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map(({ id, name, price, category }) => ({ id, name, price, category }));

  return {
    totalItems,
    availableItems,
    averagePrice,
    categories,
    topItems,
    updatedAt: new Date().toISOString(),
  };
}
