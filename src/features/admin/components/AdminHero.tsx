"use client";

import Link from "next/link";
import { QrcodeOutlined } from "@ant-design/icons";
import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { useLocale } from "@/hooks/useLocale";
import AdminHologramScene from "@/features/admin/components/AdminHologramScene";

const { Title, Paragraph, Text } = Typography;

export function AdminHero() {
  const { t } = useLocale();

  return (
    <Card className="glass-card hero-card dashboard-hero-card" variant="borderless">
      <Row gutter={[32, 32]} align="middle">
        <Col xs={24} lg={14}>
          <Space orientation="vertical" size="middle">
            <Tag className="neon-tag dashboard-badge">{t("adminHero.badge")}</Tag>
            <Title level={2} className="dashboard-hero-title">
              {t("adminHero.title")}
            </Title>
            <Paragraph className="dashboard-hero-subtitle">{t("adminHero.subtitle")}</Paragraph>
            <Space size="middle" wrap>
              <Link href="/menu">
                <Button type="primary" size="large" icon={<QrcodeOutlined />} className="dashboard-primary-button">
                  {t("adminHero.primaryAction")}
                </Button>
              </Link>
            </Space>
            <Text type="secondary" className="dashboard-hero-note">
              {t("adminHero.note")}
            </Text>
          </Space>
        </Col>
        <Col xs={24} lg={10}>
          <div className="holo-card">
            <div className="holo-card-header">
              <span className="holo-pill">{t("adminHero.securityLabel")}</span>
              <span className="holo-card-id">AI-RX • CHAT SECURE</span>
            </div>
            <div className="holo-stage-wrap">
              <AdminHologramScene />
              <div className="holo-chip-grid">
                <div className="holo-chip">
                  <span className="holo-chip-label">{t("adminHero.holoTitle")}</span>
                  <strong>99.98%</strong>
                  <span className="holo-chip-sub">{t("adminHero.uptimeLabel")}</span>
                </div>
                <div className="holo-chip holo-chip-accent">
                  <span className="holo-chip-label">{t("adminHero.qrLabel")}</span>
                  <strong>{t("adminHero.qrStatus")}</strong>
                  <span className="holo-chip-sub">AES-256 / FaceScan</span>
                </div>
                <div className="holo-chip">
                  <span className="holo-chip-label">{t("adminHero.footprintLabel")}</span>
                  <strong>48</strong>
                  <span className="holo-chip-sub">{t("adminHero.footprintSubtitle")}</span>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
