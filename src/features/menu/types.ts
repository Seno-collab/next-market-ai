export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  sku?: string;
  topicId?: number | null;
  available: boolean;
  is_active?: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type MenuItemInput = {
  name: string;
  description?: string;
  category: string;
  price: number;
  sku?: string;
  topicId?: number | null;
  available?: boolean;
  is_active?: boolean;
  imageUrl?: string;
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

export type Topic = {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number | null;
  sort_order?: number | null;
  restaurant_id?: number | null;
};

export type TopicInput = {
  name: string;
  slug?: string;
  parent_id?: number | null;
  sort_order?: number | null;
};

export type TopicUpdate = Partial<TopicInput>;

export type OptionGroup = {
  id: number;
  name: string;
  min_select?: number | null;
  max_select?: number | null;
  is_required?: boolean;
  sort_order?: number | null;
  menu_item_id?: number | null;
};

export type OptionGroupInput = {
  name: string;
  menu_item_id: number;
  min_select?: number | null;
  max_select?: number | null;
  is_required?: boolean;
  sort_order?: number | null;
};

export type OptionGroupUpdate = Partial<OptionGroupInput>;

export type OptionItem = {
  id: number;
  name: string;
  option_group_id?: number | null;
  price_delta?: number | null;
  quantity_min?: number | null;
  quantity_max?: number | null;
  sort_order?: number | null;
  linked_menu_item?: number | null;
  is_active?: boolean;
};

export type OptionItemInput = {
  name: string;
  option_group_id: number;
  price_delta?: number | null;
  quantity_min?: number | null;
  quantity_max?: number | null;
  sort_order?: number | null;
  linked_menu_item?: number | null;
  is_active?: boolean;
};

export type OptionItemUpdate = Partial<OptionItemInput>;
