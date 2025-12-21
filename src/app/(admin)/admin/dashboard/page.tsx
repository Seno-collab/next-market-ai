"use client";

import { Col, Row, Space } from "antd";
import { MenuAnalyticsPanel } from "@/features/menu/components/MenuAnalyticsPanel";
import { useMenuAnalytics } from "@/features/menu/hooks/useMenuAnalytics";
import { QuickActionsCard } from "@/features/dashboard/components/QuickActionsCard";
import { SystemStatusCard } from "@/features/dashboard/components/SystemStatusCard";
import { AdminHero } from "@/features/admin/components/AdminHero";
import { SecurityCard } from "@/features/admin/components/SecurityCard";

export default function AdminDashboardPage() {
  const { data, loading, error } = useMenuAnalytics();

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <AdminHero />
      <MenuAnalyticsPanel data={data} loading={loading} error={error} />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={12}>
          <QuickActionsCard className="glass-card" />
        </Col>
        <Col xs={24} xl={12}>
          <SecurityCard />
        </Col>
      </Row>
      <SystemStatusCard className="glass-card" />
    </Space>
  );
}
