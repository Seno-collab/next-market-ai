"use client";

import { Alert, Card, Col, Empty, Progress, Row, Space, Statistic, Tag, Typography } from "antd";
import type { MenuAnalytics } from "@/features/menu/types";
import { menuCategories } from "@/features/menu/constants";
import { useLocale } from "@/hooks/useLocale";
import { useHasHydrated } from "@/hooks/useHasHydrated";

const { Text } = Typography;

type MenuAnalyticsPanelProps = {
  data: MenuAnalytics | null;
  loading: boolean;
  error: string | null;
};

export function MenuAnalyticsPanel({ data, loading, error }: MenuAnalyticsPanelProps) {
  const { t, locale } = useLocale();
  const hydrated = useHasHydrated();
  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  if (!data && !loading) {
    return <Empty description={t("menu.empty")} />;
  }

  const total = data?.totalItems ?? 0;
  const categories = data?.categories ?? [];

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={8}>
        <Card title={t("analytics.summary")} loading={loading} variant="borderless" className="glass-card">
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <Statistic title={t("analytics.totalItems")} value={data?.totalItems ?? 0} />
            <Statistic title={t("analytics.availableItems")} value={data?.availableItems ?? 0} />
            <Statistic
              title={t("analytics.averagePrice")}
              value={data ? formatter.format(data.averagePrice) : "--"}
            />
            {data?.updatedAt && (
              <Text type="secondary">
                {t("analytics.updatedAt")}:{" "}
                {hydrated
                  ? new Date(data.updatedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-US")
                  : "--"}
              </Text>
            )}
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card title={t("analytics.categories")} loading={loading} variant="borderless" className="glass-card">
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            {categories.map((category) => {
              const categoryConfig = menuCategories.find((item) => item.value === category.category);
              const percent = total === 0 ? 0 : Math.round((category.count / total) * 100);
              return (
                <div key={category.category}>
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Text strong>{categoryConfig ? t(categoryConfig.labelKey) : category.category}</Text>
                    <Tag color="blue">{category.count}</Tag>
                  </Space>
                  <Progress percent={percent} strokeColor="#1677ff" showInfo={false} />
                </div>
              );
            })}
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card title={t("analytics.topItems")} loading={loading} variant="borderless" className="glass-card">
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            {(data?.topItems ?? []).map((item) => (
              <div key={item.id}>
                <Space orientation="vertical" size={0}>
                  <Text strong>{t(item.name)}</Text>
                  <Text type="secondary">{formatter.format(item.price)}</Text>
                </Space>
              </div>
            ))}
            {(data?.topItems ?? []).length === 0 && (
              <Text type="secondary">{t("menu.empty")}</Text>
            )}
          </Space>
        </Card>
      </Col>
    </Row>
  );
}
