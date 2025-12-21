"use client";

import { Card, Col, Row, Tooltip, Typography } from "antd";
import { Button } from "antd";
import { quickActions } from "@/features/dashboard/constants";
import { useLocale } from "@/hooks/useLocale";

const { Text } = Typography;

type QuickActionsCardProps = {
  className?: string;
};

export function QuickActionsCard({ className }: QuickActionsCardProps) {
  const { t } = useLocale();

  return (
    <Card
      className={className}
      title={t("dashboard.quickActionsTitle")}
      variant="borderless"
      bodyStyle={{ paddingBottom: 8 }}
    >
      <Row gutter={[12, 12]}>
        {quickActions.map((action) => (
          <Col xs={24} sm={12} key={action.key}>
            <Tooltip title={t(action.descriptionKey)} placement="bottom">
              <Button
                block
                type={action.type ?? "default"}
                icon={action.icon}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <Text style={{ color: action.type === "primary" ? "white" : undefined }}>
                  {t(action.labelKey)}
                </Text>
              </Button>
            </Tooltip>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
