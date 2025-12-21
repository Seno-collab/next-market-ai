"use client";

import Link from "next/link";
import { QrcodeOutlined, SafetyOutlined } from "@ant-design/icons";
import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { useLocale } from "@/hooks/useLocale";
import QrCodeScene from "@/features/admin/components/QrCodeScene";

const { Title, Paragraph, Text } = Typography;

export function AdminHero() {
  const { t } = useLocale();

  return (
    <Card className="glass-card hero-card" variant="borderless">
      <Row gutter={[32, 32]} align="middle">
        <Col xs={24} lg={14}>
          <Space orientation="vertical" size="middle">
            <Tag className="neon-tag">{t("adminHero.badge")}</Tag>
            <Title level={2} style={{ marginBottom: 0, color: "#f8fafc" }}>
              {t("adminHero.title")}
            </Title>
            <Paragraph style={{ color: "rgba(248,250,252,0.72)", maxWidth: 520 }}>
              {t("adminHero.subtitle")}
            </Paragraph>
            <Space size="middle" wrap>
              <Link href="/menu">
                <Button type="primary" size="large" icon={<QrcodeOutlined />}>
                  {t("adminHero.primaryAction")}
                </Button>
              </Link>
              <Button size="large" icon={<SafetyOutlined />}>
                {t("adminHero.secondaryAction")}
              </Button>
            </Space>
            <Text type="secondary">{t("adminHero.note")}</Text>
          </Space>
        </Col>
        <Col xs={24} lg={10}>
          <div className="qr-scene">
            <div className="qr-ambient" />
            <div className="qr-frame" />
            <QrCodeScene />
          </div>
        </Col>
      </Row>
    </Card>
  );
}
