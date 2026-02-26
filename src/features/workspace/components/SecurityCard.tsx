"use client";

import { CheckCircleOutlined, KeyOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import { Card, Divider, Space, Tag, Typography } from "antd";
import type { ReactNode } from "react";
import { useLocale } from "@/hooks/useLocale";

const { Text } = Typography;

type SecurityItem = {
  key: string;
  icon: ReactNode;
  status: "success" | "processing" | "warning";
};

export function SecurityCard() {
  const { t } = useLocale();

  const items: SecurityItem[] = [
    { key: "mfa", icon: <SafetyOutlined />, status: "success" },
    { key: "session", icon: <LockOutlined />, status: "processing" },
    { key: "role", icon: <KeyOutlined />, status: "success" },
    { key: "audit", icon: <CheckCircleOutlined />, status: "warning" },
  ];

  const statusColor: Record<SecurityItem["status"], string> = {
    success: "green",
    processing: "blue",
    warning: "orange",
  };

  return (
    <Card className="glass-card" variant="borderless">
      <Space orientation="vertical" size="small" style={{ width: "100%" }}>
        <Text style={{ color: "#f8fafc", fontWeight: 600 }}>{t("security.title")}</Text>
        <Text type="secondary">{t("security.subtitle")}</Text>
        <Divider style={{ marginBlock: 16, borderColor: "rgba(148,163,184,0.2)" }} />
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {items.map((item) => (
            <div key={item.key} className="security-row">
              <Space size="small">
                <span className="security-icon">{item.icon}</span>
                <Text strong>{t(`security.items.${item.key}.title`)}</Text>
              </Space>
              <Space size="small">
                <Text type="secondary">{t(`security.items.${item.key}.detail`)}</Text>
                <Tag color={statusColor[item.status]}>{t(`security.status.${item.status}`)}</Tag>
              </Space>
            </div>
          ))}
        </Space>
      </Space>
    </Card>
  );
}
