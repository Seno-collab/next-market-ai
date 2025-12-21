import { randomUUID } from "crypto";
import type { MenuAnalytics, MenuItem, MenuItemInput, MenuItemUpdate } from "@/features/menu/types";

const items = new Map<string, MenuItem>();

const seedItems: MenuItemInput[] = [
  {
    name: "Cà phê sữa",
    description: "Cà phê rang xay pha cùng sữa đặc.",
    category: "coffee",
    price: 42000,
    available: true,
  },
  {
    name: "Trà đào cam sả",
    description: "Trà đen ủ lạnh, đào tươi và sả.",
    category: "tea",
    price: 48000,
    available: true,
  },
  {
    name: "Bánh tiramisu",
    description: "Bánh mềm vị cacao và mascarpone.",
    category: "dessert",
    price: 55000,
    available: false,
  },
  {
    name: "Bánh mì chảo",
    description: "Trứng ốp la, xúc xích, pate.",
    category: "food",
    price: 65000,
    available: true,
  },
];

function seedIfEmpty() {
  if (items.size > 0) {
    return;
  }
  const now = new Date().toISOString();
  seedItems.forEach((item) => {
    const id = randomUUID();
    items.set(id, {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    });
  });
}

function normalizeInput(input: MenuItemInput): MenuItemInput {
  if (!input.name?.trim()) {
    throw new Error("Tên món ăn là bắt buộc");
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("Giá món ăn không hợp lệ");
  }
  return {
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    category: input.category || "other",
    price: Number(input.price),
    available: input.available ?? true,
  };
}

export function listMenuItems() {
  seedIfEmpty();
  return Array.from(items.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createMenuItem(payload: MenuItemInput) {
  const data = normalizeInput(payload);
  const now = new Date().toISOString();
  const item: MenuItem = {
    id: randomUUID(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  items.set(item.id, item);
  return item;
}

export function updateMenuItem(id: string, updates: MenuItemUpdate) {
  const current = items.get(id);
  if (!current) {
    throw new Error("Không tìm thấy món ăn");
  }
  const next: MenuItem = {
    ...current,
    ...updates,
    name: updates.name?.trim() ?? current.name,
    description: updates.description?.trim() ?? current.description,
    category: updates.category ?? current.category,
    price: updates.price ?? current.price,
    available: updates.available ?? current.available,
    updatedAt: new Date().toISOString(),
  };
  if (!next.name) {
    throw new Error("Tên món ăn là bắt buộc");
  }
  if (!Number.isFinite(next.price) || next.price <= 0) {
    throw new Error("Giá món ăn không hợp lệ");
  }
  items.set(id, next);
  return next;
}

export function deleteMenuItem(id: string) {
  if (!items.has(id)) {
    throw new Error("Không tìm thấy món ăn");
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
