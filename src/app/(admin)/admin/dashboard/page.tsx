"use client";

import dynamic from "next/dynamic";
import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
import {
  GlobalOutlined,
  RiseOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useLocale } from "@/hooks/useLocale";

const { Title, Text } = Typography;

// Dynamic imports for Three.js components (no SSR)
const DashboardGlobeScene = dynamic(
  () => import("@/features/admin/components/DashboardGlobeScene"),
  { ssr: false, loading: () => <div className="scene-loading"><Spin size="large" /></div> }
);

const Dashboard3DStats = dynamic(
  () => import("@/features/admin/components/Dashboard3DStats"),
  { ssr: false, loading: () => <div className="scene-loading"><Spin size="large" /></div> }
);

const DashboardParticleField = dynamic(
  () => import("@/features/admin/components/DashboardParticleField"),
  { ssr: false }
);

// Format number consistently (avoid locale differences)
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const ACTIVITY_ITEMS = [
  { time: "2 min ago", event: "New order received from Tokyo", type: "order" },
  { time: "5 min ago", event: "User registration from London", type: "user" },
  { time: "12 min ago", event: "Payment processed - $1,250", type: "payment" },
  { time: "18 min ago", event: "New order received from New York", type: "order" },
  { time: "25 min ago", event: "System health check completed", type: "system" },
] as const;

export default function AdminDashboardPage() {
  const { t } = useLocale();

  return (
    <div className="dashboard-3d-shell">
      {/* Background particle field */}
      <div className="dashboard-bg-layer">
        <DashboardParticleField />
      </div>

      {/* Main content */}
      <div className="dashboard-3d-content">
        {/* Hero Section with Globe */}
        <section className="dashboard-3d-hero">
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={12}>
              <div className="hero-text-content">
                <div className="hero-badge">
                  <ThunderboltOutlined /> {t("adminHero.badge") || "AI-Powered Dashboard"}
                </div>
                <Title level={1} className="hero-main-title">
                  {t("adminHero.title") || "Welcome to the Future"}
                </Title>
                <Text className="hero-subtitle">
                  {t("adminHero.subtitle") || "Real-time analytics and insights powered by advanced AI. Monitor your business across the globe with stunning 3D visualizations."}
                </Text>
                <div className="hero-stats-row">
                  <div className="hero-stat-pill" style={{ borderColor: "#22d3ee" }}>
                    <span className="stat-icon" style={{ color: "#22d3ee" }}>
                      <ShoppingCartOutlined />
                    </span>
                    <span className="stat-value">{formatNumber(2847)}</span>
                  </div>
                  <div className="hero-stat-pill" style={{ borderColor: "#60a5fa" }}>
                    <span className="stat-value">${formatNumber(48200)}</span>
                  </div>
                  <div className="hero-stat-pill" style={{ borderColor: "#a78bfa" }}>
                    <span className="stat-icon" style={{ color: "#a78bfa" }}>
                      <TeamOutlined />
                    </span>
                    <span className="stat-value">{formatNumber(1234)}</span>
                  </div>
                  <div className="hero-stat-pill" style={{ borderColor: "#34d399" }}>
                    <span className="stat-icon" style={{ color: "#34d399" }}>
                      <SafetyOutlined />
                    </span>
                    <span className="stat-value">98.5%</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="globe-container">
                <div className="globe-glow-ring" />
                <DashboardGlobeScene />
                <div className="globe-label">
                  <GlobalOutlined /> Global Activity
                </div>
              </div>
            </Col>
          </Row>
        </section>

        {/* 3D Stats Section */}
        <section className="dashboard-3d-stats-section">
          <div className="section-header">
            <Title level={2} className="section-title">
              <RiseOutlined /> Live Analytics
            </Title>
            <Text className="section-subtitle">
              Interactive 3D visualization of your key metrics
            </Text>
          </div>
          <div className="stats-3d-container">
            <Dashboard3DStats />
          </div>
        </section>

        {/* Quick Stats Cards */}
        <section className="dashboard-cards-section">
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="glass-card stat-card stat-card-cyan">
                <Statistic
                  title="Total Orders"
                  value={2847}
                  prefix={<ShoppingCartOutlined />}
                  styles={{ content: { color: "#22d3ee" } }}
                />
                <div className="stat-trend positive">+12.5% from last month</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="glass-card stat-card stat-card-blue">
                <Statistic
                  title="Revenue"
                  value={48200}
                  prefix="$"
                  styles={{ content: { color: "#60a5fa" } }}
                />
                <div className="stat-trend positive">+8.2% from last month</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="glass-card stat-card stat-card-purple">
                <Statistic
                  title="Active Users"
                  value={1234}
                  prefix={<TeamOutlined />}
                  styles={{ content: { color: "#a78bfa" } }}
                />
                <div className="stat-trend positive">+23.1% from last month</div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="glass-card stat-card stat-card-green">
                <Statistic
                  title="System Uptime"
                  value={98.5}
                  suffix="%"
                  prefix={<SafetyOutlined />}
                  styles={{ content: { color: "#34d399" } }}
                />
                <div className="stat-trend positive">+0.2% improvement</div>
              </Card>
            </Col>
          </Row>
        </section>

        {/* Activity Grid */}
        <section className="dashboard-activity-section">
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card className="glass-card activity-card">
                <Title level={4} className="card-title">Recent Activity</Title>
                <div className="activity-list">
                  {ACTIVITY_ITEMS.map((item, i) => (
                    <div key={i} className="activity-item">
                      <span className={`activity-dot ${item.type}`} />
                      <span className="activity-time">{item.time}</span>
                      <span className="activity-event">{item.event}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card className="glass-card performance-card">
                <Title level={4} className="card-title">Performance</Title>
                <div className="performance-metrics">
                  <div className="metric-item">
                    <span className="metric-label">API Response</span>
                    <span className="metric-value">45ms</span>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: "92%" }} />
                    </div>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Server Load</span>
                    <span className="metric-value">23%</span>
                    <div className="metric-bar">
                      <div className="metric-fill green" style={{ width: "23%" }} />
                    </div>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Memory Usage</span>
                    <span className="metric-value">61%</span>
                    <div className="metric-bar">
                      <div className="metric-fill yellow" style={{ width: "61%" }} />
                    </div>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Cache Hit Rate</span>
                    <span className="metric-value">94%</span>
                    <div className="metric-bar">
                      <div className="metric-fill" style={{ width: "94%" }} />
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </section>
      </div>
    </div>
  );
}
