export type MenuItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuItemInput = {
  name: string;
  description?: string;
  category: string;
  price: number;
  available: boolean;
};

export type MenuItemUpdate = Partial<MenuItemInput>;

export type MenuCategorySummary = {
  category: string;
  count: number;
};

export type MenuAnalytics = {
  totalItems: number;
  availableItems: number;
  averagePrice: number;
  categories: MenuCategorySummary[];
  topItems: Array<Pick<MenuItem, "id" | "name" | "price" | "category">>;
  updatedAt: string;
};
