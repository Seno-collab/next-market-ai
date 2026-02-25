"use client";

import dynamic from "next/dynamic";
import { useLocale } from "@/hooks/useLocale";
import { Button, Space, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Title, Paragraph, Text } = Typography;

// Dynamic import for Three.js component (no SSR)
const Error500Scene = dynamic(
  () => import("@/features/errors/components/Error500Scene"),
  {
    ssr: false,
    loading: () => (
      <div className="error-3d-loading">
        <Spin size="large" />
      </div>
    ),
  },
);

type ApiError = {
  status: number;
  message: string;
  url: string;
  timestamp: number;
};

export default function Error500Page() {
  const { t } = useLocale();
  const router = useRouter();
  const [errorInfo] = useState<ApiError | null>(() => {
    if (typeof globalThis.window === "undefined") {
      return null;
    }
    const stored = sessionStorage.getItem("api_error");
    if (!stored) {
      return null;
    }
    try {
      const parsed = JSON.parse(stored) as ApiError;
      sessionStorage.removeItem("api_error");
      return parsed;
    } catch {
      return null;
    }
  });

  const handleRetry = () => {
    router.back();
  };

  const handleHome = () => {
    router.push("/");
  };

  return (
    <div className="error-shell-3d error-500">
      {/* 3D Background */}
      <div className="error-3d-bg">
        <Error500Scene />
      </div>

      {/* Overlay gradient */}
      <div className="error-overlay error-overlay-500" />

      {/* Content */}
      <div className="error-3d-content">
        <div className="error-3d-grid">
          {/* Error Info Panel */}
          <div className="error-info-panel">
            <div className="error-badge error-badge-critical">
              <span className="error-badge-dot error-badge-dot-critical" />
              {t("errors.label")}
            </div>

            <div className="error-code-3d error-code-500">
              <span className="error-digit">5</span>
              <span className="error-digit error-digit-zero">0</span>
              <span className="error-digit">0</span>
            </div>

            <Title level={2} className="error-title-3d">
              {t("errors.server.title")}
            </Title>

            <Paragraph className="error-subtitle-3d">
              {errorInfo?.message || t("errors.server.subtitle")}
            </Paragraph>

            <Space size="middle" className="error-actions-3d" wrap>
              <Button
                type="primary"
                size="large"
                className="error-primary-3d error-primary-500"
                onClick={handleRetry}
              >
                {t("errors.server.primaryCta")}
              </Button>
              <Button
                size="large"
                className="error-secondary-3d"
                onClick={handleHome}
              >
                {t("errors.server.secondaryCta")}
              </Button>
            </Space>

            <Text className="error-meta-3d">{t("errors.server.meta")}</Text>
          </div>

          {/* Visual Stats Panel */}
          <div className="error-visual-panel">
            <div className="error-visual-content">
              <div className="error-visual-card-3d error-visual-card-500">
                <div className="error-visual-header">
                  <div className="error-visual-icon error-visual-icon-warning">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="24"
                      height="24"
                    >
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                  </div>
                  <span className="error-visual-label">
                    {t("errors.server.visualLabel")}
                  </span>
                </div>
                <div className="error-visual-value">
                  {t("errors.server.visualValue")}
                </div>
                <div className="error-visual-detail">
                  {t("errors.server.visualDetail")}
                </div>

                <div className="error-visual-bars error-visual-bars-500">
                  <span className="error-bar-3d error-bar-critical" />
                  <span className="error-bar-3d error-bar-critical" />
                  <span className="error-bar-3d error-bar-critical" />
                  <span className="error-bar-3d error-bar-warning" />
                  <span className="error-bar-3d error-bar-warning" />
                  <span className="error-bar-3d error-bar-ok" />
                </div>
              </div>

              <div className="error-stats-row">
                <div className="error-stat error-stat-critical">
                  <span className="error-stat-value">
                    {errorInfo?.status || 500}
                  </span>
                  <span className="error-stat-label">Error Code</span>
                </div>
                <div className="error-stat error-stat-warning">
                  <span className="error-stat-value">Down</span>
                  <span className="error-stat-label">Server Status</span>
                </div>
                <div className="error-stat">
                  <span className="error-stat-value">Auto</span>
                  <span className="error-stat-label">Recovery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
