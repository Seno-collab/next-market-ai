"use client";

import { BulbOutlined, GlobalOutlined, MoonOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import AuthQrBackground from "@/features/auth/components/AuthQrBackground";
import LoginGalaxyScene from "@/features/auth/components/LoginGalaxyScene";

const { Title, Paragraph, Text } = Typography;

type LoginValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { login, error, loadingAction, session } = useAuthSession();
  const [form] = Form.useForm<LoginValues>();
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (values: LoginValues) => {
    setSuccess(null);
    try {
      await login({
        email: values.email,
        password: values.password,
      });
      setSuccess(t("login.success"));
      router.push("/admin/dashboard");
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
            <Text>{t("login.tagline")}</Text>
          </div>
          <Card variant="borderless" className="glass-card auth-card">
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
              <div className="auth-card-header">
                <AuthBrand />
                <div className="auth-header-actions">
                  <AuthThemeSwitch />
                  <AuthLocaleSwitch />
                </div>
              </div>
              <div>
                <Text className="auth-eyebrow">{t("login.eyebrow")}</Text>
                <Title level={2} className="auth-title">
                  {t("login.title")}
                </Title>
                <Paragraph type="secondary" className="auth-subtitle">
                  {t("login.subtitle")}
                </Paragraph>
              </div>
              <Form form={form} layout="vertical" onFinish={handleSubmit} className="auth-form">
                <Form.Item
                  label={t("auth.emailLabel")}
                  name="email"
                  rules={[{ required: true, message: t("auth.emailLabel") }]}
                >
                  <Input type="email" autoComplete="email" />
                </Form.Item>
                <Form.Item
                  label={t("auth.passwordLabel")}
                  name="password"
                  rules={[{ required: true, message: t("auth.passwordLabel") }]}
                >
                  <Input.Password autoComplete="current-password" />
                </Form.Item>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={loadingAction === "login"}
                  className="auth-primary"
                  block
                >
                  {t("login.cta")}
                </Button>
              </Form>
              <Text type="secondary">{t("login.secondaryHint")}</Text>
              {success && <Alert title={success} type="success" showIcon />}
              {error && <Alert title={error} type="error" showIcon />}
              {session?.user && (
                <Text type="secondary">
                  {t("login.signedInAs")}: {session.user.email}
                </Text>
              )}
            </Space>
          </Card>
        </div>
        <div className="auth-visual login-visual">
          <LoginGalaxyScene />
          <div className="login-visual-meta">
            <Text className="login-visual-badge">{t("login.tagline")}</Text>
            <Paragraph type="secondary" className="login-visual-copy">
              {t("login.subtitle")}
            </Paragraph>
          </div>
          <div className="auth-caption">
            <Text>{t("login.visualCaption")}</Text>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthBrand() {
  const { t } = useLocale();
  return (
    <div className="auth-brand">
      <div className="auth-brand-mark" aria-hidden="true">
        <span className="auth-brand-ring" aria-hidden="true" />
        <svg className="auth-brand-qr" viewBox="0 0 64 64" focusable="false" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <rect x="8" y="8" width="8" height="8" rx="2" />
          <rect x="44" y="4" width="16" height="16" rx="3" />
          <rect x="48" y="8" width="8" height="8" rx="2" />
          <rect x="4" y="44" width="16" height="16" rx="3" />
          <rect x="8" y="48" width="8" height="8" rx="2" />
          <rect x="26" y="26" width="6" height="6" rx="1" />
          <rect x="36" y="26" width="6" height="6" rx="1" />
          <rect x="26" y="36" width="6" height="6" rx="1" />
          <rect x="36" y="36" width="6" height="6" rx="1" />
          <rect x="22" y="20" width="4" height="4" rx="1" />
          <rect x="38" y="20" width="4" height="4" rx="1" />
          <rect x="20" y="38" width="4" height="4" rx="1" />
          <rect x="42" y="38" width="4" height="4" rx="1" />
          <rect x="28" y="14" width="4" height="4" rx="1" />
          <rect x="32" y="46" width="4" height="4" rx="1" />
          <rect x="46" y="30" width="4" height="4" rx="1" />
          <rect x="14" y="30" width="4" height="4" rx="1" />
        </svg>
      </div>
      <div className="auth-brand-text">
        <div className="auth-brand-name">QR MENU</div>
        <div className="auth-brand-tagline">{t("login.tagline")}</div>
      </div>
    </div>
  );
}

function AuthLocaleSwitch() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="auth-locale">
      <GlobalOutlined />
      <Button
        size="small"
        type="text"
        className={`auth-locale-button${locale === "vi" ? " is-active" : ""}`}
        onClick={() => setLocale("vi")}
        aria-pressed={locale === "vi"}
      >
        VI
      </Button>
      <Button
        size="small"
        type="text"
        className={`auth-locale-button${locale === "en" ? " is-active" : ""}`}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        EN
      </Button>
    </div>
  );
}

function AuthThemeSwitch() {
  const { mode, setMode } = useTheme();

  return (
    <div className="auth-theme">
      <Button
        size="small"
        type="text"
        className={`auth-theme-button${mode === "light" ? " is-active" : ""}`}
        icon={<BulbOutlined />}
        onClick={() => setMode("light")}
        aria-pressed={mode === "light"}
        aria-label="Light theme"
      />
      <Button
        size="small"
        type="text"
        className={`auth-theme-button${mode === "dark" ? " is-active" : ""}`}
        icon={<MoonOutlined />}
        onClick={() => setMode("dark")}
        aria-pressed={mode === "dark"}
        aria-label="Dark theme"
      />
    </div>
  );
}
