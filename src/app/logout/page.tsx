"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Alert, Button, Card, Space, Spin, Typography } from "antd";
import { LogoutOutlined, HomeOutlined, LoginOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useLocale } from "@/hooks/useLocale";

const { Title, Paragraph, Text } = Typography;

// Dynamic import for Three.js component (no SSR)
const LogoutVortexScene = dynamic(
  () => import("@/features/auth/components/LogoutVortexScene"),
  { ssr: false, loading: () => <div className="vortex-loading"><Spin size="large" /></div> }
);

export default function LogoutPage() {
  const { t } = useLocale();
  const { session, logout, loadingAction, error } = useAuthSession();
  const [success, setSuccess] = useState<string | null>(null);
  const didLogout = useRef(false);

  useEffect(() => {
    if (didLogout.current) {
      return;
    }
    didLogout.current = true;
    logout()
      .then(() => setSuccess(t("logout.success")))
      .catch(() => {
        // Error state is handled in the auth hook.
      });
  }, [logout, t]);

  const handleLogout = async () => {
    setSuccess(null);
    try {
      await logout();
      setSuccess(t("logout.success"));
    } catch {
      // Error state is handled in the auth hook.
    }
  };

  return (
    <div className="auth-shell-3d logout-shell">
      {/* 3D Background */}
      <div className="auth-3d-bg">
        <LogoutVortexScene />
      </div>

      {/* Overlay gradient */}
      <div className="auth-overlay logout-overlay" />

      {/* Content */}
      <div className="auth-3d-content">
        <div className="logout-3d-grid">
          {/* Logout Card */}
          <div className="logout-card-panel">
            <Card variant="borderless" className="glass-card logout-card-3d">
              <Space orientation="vertical" size="large" style={{ width: "100%" }} align="center">
                {/* Animated icon */}
                <div className="logout-icon-wrapper">
                  <div className="logout-icon-ring" />
                  <div className="logout-icon-ring delay-1" />
                  <div className="logout-icon-ring delay-2" />
                  <LogoutOutlined className="logout-main-icon" />
                </div>

                <div className="logout-content">
                  <div className="logout-badge">{t("logout.eyebrow")}</div>
                  <Title level={2} className="logout-title">
                    {t("logout.title")}
                  </Title>
                  <Paragraph className="logout-subtitle">
                    {t("logout.subtitle")}
                  </Paragraph>
                </div>

                {session?.authenticated ? (
                  <div className="logout-session-info">
                    {session.user && (
                      <div className="logout-user-badge">
                        <span className="logout-user-icon">@</span>
                        <span>{session.user.email}</span>
                      </div>
                    )}
                    <Button
                      type="primary"
                      danger
                      size="large"
                      onClick={handleLogout}
                      loading={loadingAction === "logout"}
                      icon={<LogoutOutlined />}
                      className="logout-btn"
                      block
                    >
                      {loadingAction === "logout" ? t("logout.cta") : t("logout.cta")}
                    </Button>
                  </div>
                ) : (
                  <div className="logout-actions">
                    <Text type="secondary" className="logout-no-session">
                      {t("logout.noSession")}
                    </Text>
                    <div className="logout-links">
                      <Link href="/login">
                        <Button
                          type="primary"
                          size="large"
                          icon={<LoginOutlined />}
                          className="logout-login-btn"
                        >
                          {t("logout.backToLogin")}
                        </Button>
                      </Link>
                      <Link href="/">
                        <Button
                          size="large"
                          icon={<HomeOutlined />}
                          className="logout-home-btn"
                        >
                          {t("nav.home") || "Home"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {success && <Alert message={success} type="success" showIcon className="logout-alert" />}
                {error && <Alert message={error} type="error" showIcon className="logout-alert" />}
              </Space>
            </Card>
          </div>

          {/* Visual Info */}
          <div className="logout-visual-panel">
            <div className="logout-visual-content">
              <div className="vortex-info">
                <div className="vortex-badge">{t("logout.vortexBadge")}</div>
                <h3 className="vortex-title">{t("logout.tagline")}</h3>
                <p className="vortex-description">
                  {t("logout.visualCaption")}
                </p>
              </div>
              <div className="vortex-features">
                <div className="vortex-feature">
                  <div className="vortex-feature-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                    </svg>
                  </div>
                  <span>{t("logout.features.sessionSecured")}</span>
                </div>
                <div className="vortex-feature">
                  <div className="vortex-feature-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <span>{t("logout.features.dataSaved")}</span>
                </div>
                <div className="vortex-feature">
                  <div className="vortex-feature-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  </div>
                  <span>{t("logout.features.tokenCleared")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
