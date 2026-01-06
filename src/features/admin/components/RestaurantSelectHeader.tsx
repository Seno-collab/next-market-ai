"use client";

import { Select, Typography } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { useLocale } from "@/hooks/useLocale";
import { useRestaurantSelect } from "@/features/admin/hooks/useRestaurantSelect";
import { useHasHydrated } from "@/hooks/useHasHydrated";

const { Text } = Typography;

export function RestaurantSelectHeader() {
  const { t } = useLocale();
  const { options, loading, value, handleChange, filterOption } =
    useRestaurantSelect();
  const hydrated = useHasHydrated();

  if (!hydrated) {
    return null;
  }

  return (
    <div className="admin-restaurant-select">
      <Text className="admin-restaurant-label" type="secondary">
        {t("login.restaurantLabel")}
      </Text>
      <Select
        allowClear
        showSearch
        value={value}
        placeholder={t("login.restaurantPlaceholder")}
        options={options}
        loading={loading}
        className="admin-restaurant-picker"
        suffixIcon={<ShopOutlined />}
        filterOption={filterOption}
        onChange={handleChange}
      />
    </div>
  );
}
