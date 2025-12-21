"use client";

import { Card, Space, Typography } from "antd";
import { MenuAnalyticsPanel } from "@/features/menu/components/MenuAnalyticsPanel";
import { useMenuAnalytics } from "@/features/menu/hooks/useMenuAnalytics";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph } = Typography;

export default function AnalyticsPage() {
  const { data, loading, error } = useMenuAnalytics();
  const { t } = useLocale();

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card variant="borderless" className="glass-card">
        <Title level={3} style={{ margin: 0 }}>
          {t("analytics.title")}
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {t("analytics.subtitle")}
        </Paragraph>
      </Card>
      <MenuAnalyticsPanel data={data} loading={loading} error={error} />
    </Space>
  );
}
