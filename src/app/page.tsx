"use client";

import { Col, Layout, Row, Space } from "antd";
import AppHeader from "@/components/layout/AppHeader";
import { HeroSection } from "@/features/dashboard/components/HeroSection";
import { StatsPanel } from "@/features/dashboard/components/StatsPanel";
import { StatusCard } from "@/features/dashboard/components/StatusCard";
import { AuthDemoPanel } from "@/features/dashboard/components/AuthDemoPanel";
import { QuickActionsCard } from "@/features/dashboard/components/QuickActionsCard";
import { SystemStatusCard } from "@/features/dashboard/components/SystemStatusCard";
import { ActivityTimelineCard } from "@/features/dashboard/components/ActivityTimelineCard";
import { useApiStatus } from "@/hooks/useApiStatus";

const { Content } = Layout;

export default function HomePage() {
  const { data, error, loading, refresh } = useApiStatus();

  return (
    <Layout className="app-shell" style={{ background: "transparent" }}>
      <AppHeader onRefresh={refresh} loading={loading} />
      <Content style={{ padding: "32px min(5vw, 48px) 48px" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <HeroSection />
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <StatsPanel />
            </Col>
            <Col xs={24} lg={10}>
              <StatusCard data={data} error={error} loading={loading} onRefresh={refresh} />
            </Col>
          </Row>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12} xl={8}>
              <QuickActionsCard />
            </Col>
            <Col xs={24} md={12} xl={8}>
              <SystemStatusCard />
            </Col>
            <Col xs={24} md={24} xl={8}>
              <ActivityTimelineCard />
            </Col>
          </Row>
          <AuthDemoPanel />
        </Space>
      </Content>
    </Layout>
  );
}
