"use client";

import dynamic from "next/dynamic";
import { Button, Space, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph, Text } = Typography;

// Dynamic import for Three.js component (no SSR)
const Error404Scene = dynamic(
  () => import("@/features/errors/components/Error404Scene"),
  { ssr: false, loading: () => <div className="error-3d-loading"><Spin size="large" /></div> }
);

export default function NotFound() {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="error-shell-3d">
      {/* 3D Background */}
      <div className="error-3d-bg">
        <Error404Scene />
      </div>

      {/* Overlay gradient */}
      <div className="error-overlay" />

      {/* Content */}
      <div className="error-3d-content">
        <div className="error-3d-grid">
          {/* Error Info Panel */}
          <div className="error-info-panel">
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

            <Paragraph className="error-subtitle-3d">
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

          {/* Visual Stats Panel */}
          <div className="error-visual-panel">
            <div className="error-visual-content">
              <div className="error-visual-card-3d">
                <div className="error-visual-header">
                  <div className="error-visual-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <span className="error-visual-label">{t("errors.notFound.visualLabel")}</span>
                </div>
                <div className="error-visual-value">{t("errors.notFound.visualValue")}</div>
                <div className="error-visual-detail">{t("errors.notFound.visualDetail")}</div>

                <div className="error-visual-bars">
                  <span className="error-bar-3d" />
                  <span className="error-bar-3d" />
                  <span className="error-bar-3d" />
                  <span className="error-bar-3d" />
                  <span className="error-bar-3d" />
                  <span className="error-bar-3d" />
                </div>
              </div>

              <div className="error-stats-row">
                <div className="error-stat">
                  <span className="error-stat-value">404</span>
                  <span className="error-stat-label">Error Code</span>
                </div>
                <div className="error-stat">
                  <span className="error-stat-value">Lost</span>
                  <span className="error-stat-label">Page Status</span>
                </div>
                <div className="error-stat">
                  <span className="error-stat-value">Void</span>
                  <span className="error-stat-label">Location</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
