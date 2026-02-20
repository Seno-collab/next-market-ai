"use client";

import dynamic from "next/dynamic";
import { Button, Space, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph, Text } = Typography;

const Error404Scene = dynamic(
  () => import("@/features/errors/components/Error404Scene"),
  { ssr: false, loading: () => <div className="error-3d-loading"><Spin size="large" /></div> }
);

export default function NotFound() {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="error-shell-3d error-404-simple">
      <div className="error-3d-bg">
        <Error404Scene />
      </div>

      <div className="error-overlay" />

      <div className="error-3d-content error-404-centered">
        <div className="error-404-card">
          <div className="error-badge">
            <span className="error-badge-dot" />
            {t("errors.label")}
          </div>

          <div className="error-code-3d">
            <span className="error-digit">4</span>
            <span className="error-digit error-digit-zero">0</span>
            <span className="error-digit">4</span>
          </div>

          <Title level={2} className="error-title-3d">
            {t("errors.notFound.title")}
          </Title>

          <Paragraph className="error-subtitle-3d error-404-subtitle">
            {t("errors.notFound.subtitle")}
          </Paragraph>

          <Space size="middle" className="error-actions-3d" wrap>
            <Button
              type="primary"
              size="large"
              className="error-primary-3d"
              onClick={() => router.push("/")}
            >
              {t("errors.notFound.primaryCta")}
            </Button>
            <Button
              size="large"
              className="error-secondary-3d"
              onClick={() => router.push("/login")}
            >
              {t("errors.notFound.secondaryCta")}
            </Button>
          </Space>

          <Text className="error-meta-3d">{t("errors.notFound.meta")}</Text>
        </div>
      </div>
    </div>
  );
}
