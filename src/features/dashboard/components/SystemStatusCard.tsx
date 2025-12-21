"use client";

import { Card, List, Space, Tag, Typography } from "antd";
import { CloudServerOutlined } from "@ant-design/icons";
import { systemStatuses } from "@/features/dashboard/constants";
import { useLocale } from "@/hooks/useLocale";

const statusTagColor: Record<(typeof systemStatuses)[number]["status"], string> = {
  success: "green",
  processing: "blue",
  warning: "orange",
  error: "red",
};

const { Text } = Typography;

type SystemStatusCardProps = {
  className?: string;
};

export function SystemStatusCard({ className }: SystemStatusCardProps) {
  const { t } = useLocale();

  return (
    <Card
      className={className}
      title={
        <Space>
          <CloudServerOutlined />
          <span>{t("dashboard.systemTitle")}</span>
        </Space>
      }
      variant="borderless"
    >
      <List
        dataSource={systemStatuses}
        renderItem={(item) => (
          <List.Item style={{ display: "flex", justifyContent: "space-between" }}>
            <Space orientation="vertical" size={0}>
              <Text strong>{t(item.nameKey)}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.id}
              </Text>
            </Space>
            <Space>
              <Text>{t(item.valueKey)}</Text>
              <Tag color={statusTagColor[item.status]}>
                {t(`systemStatus.statusLabel.${item.status}`)}
              </Tag>
            </Space>
          </List.Item>
        )}
      />
    </Card>
  );
}
