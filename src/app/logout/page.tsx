"use client";

import Link from "next/link";
import { Alert, Button, Card, Space, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import QrCodeScene from "@/features/admin/components/QrCodeScene";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useLocale } from "@/hooks/useLocale";
import AuthQrBackground from "@/features/auth/components/AuthQrBackground";

const { Title, Paragraph, Text } = Typography;

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
    <div className="auth-shell">
      <div className="auth-backdrop" />
      <AuthQrBackground />
      <div className="auth-grid">
        <div className="auth-panel">
          <div className="auth-tagline">
            <Text>{t("logout.tagline")}</Text>
          </div>
          <Card variant="borderless" className="glass-card auth-card">
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
              <div>
                <Text className="auth-eyebrow">{t("logout.eyebrow")}</Text>
                <Title level={2} className="auth-title">
                  {t("logout.title")}
                </Title>
                <Paragraph type="secondary" className="auth-subtitle">
                  {t("logout.subtitle")}</Paragraph>
              </div>
              {session?.authenticated ? (
                <>
                  {session.user && (
                    <Text type="secondary">
                      {t("logout.signedInAs")}: {session.user.email}
                    </Text>
                  )}
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleLogout}
                    loading={loadingAction === "logout"}
                    className="auth-primary"
                    block
                  >
                    {t("logout.cta")}
                  </Button>
                </>
              ) : (
                <>
                  <Text type="secondary">{t("logout.noSession")}</Text>
                  <Link href="/login" className="auth-link">
                    {t("logout.backToLogin")}
                  </Link>
                </>
              )}
              {success && <Alert title={success} type="success" showIcon />}
              {error && <Alert title={error} type="error" showIcon />}
            </Space>
          </Card>
        </div>
        <div className="auth-visual">
          <QrCodeScene />
          <div className="auth-caption">
            <Text>{t("logout.visualCaption")}</Text>
          </div>
        </div>
      </div>
    </div>
  );
}
