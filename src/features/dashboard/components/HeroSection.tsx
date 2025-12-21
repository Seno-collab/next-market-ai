"use client";

import { Card, Col, Row, Space, Tag, Typography } from "antd";
import { siteConfig } from "@/config/site";
import { featureHighlights } from "@/features/dashboard/constants";
import ThreeScene from "@/features/dashboard/components/ThreeScene";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph } = Typography;

export function HeroSection() {
  const { t } = useLocale();

  return (
    <Card style={{ background: "linear-gradient(135deg,#101939,#020817)" }} bodyStyle={{ padding: 32 }}>
      <Row gutter={[32, 32]}>
        <Col xs={24} lg={12}>
          <Space orientation="vertical" size="middle">
            <Title level={2} style={{ color: "white", marginBottom: 0 }}>
              {t(siteConfig.hero.titleKey)}
            </Title>
            <Paragraph style={{ color: "rgba(255,255,255,0.75)" }}>
              {t(siteConfig.hero.descriptionKey)}
            </Paragraph>
            <Space wrap>
              {featureHighlights.map(({ titleKey, Icon }) => (
                <Tag
                  key={titleKey}
                  icon={<Icon />}
                  style={{ padding: "6px 12px", borderRadius: 999, fontSize: 14 }}
                >
                  {t(titleKey)}
                </Tag>
              ))}
            </Space>
          </Space>
        </Col>
        <Col xs={24} lg={12}>
          <ThreeScene />
        </Col>
      </Row>
    </Card>
  );
}
