"use client";

import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import { featureHighlights, summaryStats } from "@/features/dashboard/constants";
import { useLocale } from "@/hooks/useLocale";

const { Text, Paragraph } = Typography;

export function StatsPanel() {
  const { t } = useLocale();

  return (
    <Card title={t("dashboard.statsTitle")} variant="borderless">
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          {summaryStats.map(({ titleKey, value, Icon, color }) => (
            <Col key={titleKey} xs={24} sm={12}>
              <Statistic title={t(titleKey)} prefix={<Icon style={{ color }} />} value={value} />
            </Col>
          ))}
        </Row>
        {featureHighlights.map(({ titleKey, descriptionKey, Icon }) => (
          <Card
            key={titleKey}
            size="small"
            style={{ background: "#f5f8ff" }}
            bodyStyle={{ display: "flex", gap: 12 }}
          >
            <div style={{ fontSize: 20, color: "#1677ff" }}>
              <Icon />
            </div>
            <div>
              <Text strong>{t(titleKey)}</Text>
              <Paragraph style={{ marginBottom: 0 }}>{t(descriptionKey)}</Paragraph>
            </div>
          </Card>
        ))}
      </Space>
    </Card>
  );
}
