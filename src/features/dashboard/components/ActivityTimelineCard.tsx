"use client";

import { Card, Space, Tag, Timeline, Typography } from "antd";
import { activityFeed } from "@/features/dashboard/constants";
import { useLocale } from "@/hooks/useLocale";

const { Text } = Typography;

const statusColorMap = {
  success: "green",
  info: "blue",
  warning: "orange",
} as const;

export function ActivityTimelineCard() {
  const { t } = useLocale();

  return (
    <Card title={t("dashboard.activityTitle")} variant="borderless">
      <Timeline
        items={activityFeed.map((item) => ({
          color: statusColorMap[item.status],
          children: (
            <Space orientation="vertical" size={0}>
              <Space size="small">
                <Text strong>{t(item.labelKey)}</Text>
                <Tag>{t(item.timestampKey)}</Tag>
              </Space>
              <Text type="secondary">{t(item.descriptionKey)}</Text>
            </Space>
          ),
        }))}
      />
    </Card>
  );
}
