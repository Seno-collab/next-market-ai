"use client";

import dynamic from "next/dynamic";
import { BulbOutlined, GlobalOutlined, MoonOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Spin, Typography } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";

const { Title, Paragraph, Text } = Typography;

// Dynamic import for Three.js component (no SSR)
const LoginPortalScene = dynamic(
  () => import("@/features/auth/components/LoginPortalScene"),
  { ssr: false, loading: () => <div className="portal-loading"><Spin size="large" /></div> }
);

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
    <div className="auth-shell-3d">
      {/* 3D Background */}
      <div className="auth-3d-bg">
        <LoginPortalScene />
      </div>

      {/* Overlay gradient */}
      <div className="auth-overlay" />

      {/* Content */}
      <div className="auth-3d-content">
        <div className="auth-3d-grid">
          {/* Login Form */}
          <div className="auth-form-panel">
            <Card variant="borderless" className="glass-card auth-card-3d">
              <Space orientation="vertical" size="large" style={{ width: "100%" }}>
                <div className="auth-card-header">
                  <AuthBrand />
                  <div className="auth-header-actions">
                    <AuthThemeSwitch />
                    <AuthLocaleSwitch />
                  </div>
                </div>

                <div className="auth-welcome">
                  <div className="auth-welcome-badge">
                    <LockOutlined /> {t("login.eyebrow") || "Secure Access"}
                  </div>
                  <Title level={2} className="auth-welcome-title">
                    {t("login.title") || "Welcome Back"}
                  </Title>
                  <Paragraph className="auth-welcome-subtitle">
                    {t("login.subtitle") || "Sign in to access your dashboard"}
                  </Paragraph>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSubmit} className="auth-form">
                  <Form.Item
                    label={t("auth.emailLabel") || "Email"}
                    name="email"
                    rules={[{ required: true, message: t("auth.emailRequired") || "Please enter your email" }]}
                  >
                    <Input
                      type="email"
                      autoComplete="email"
                      prefix={<UserOutlined />}
                      placeholder="you@example.com"
                      size="large"
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("auth.passwordLabel") || "Password"}
                    name="password"
                    rules={[{ required: true, message: t("auth.passwordRequired") || "Please enter your password" }]}
                  >
                    <Input.Password
                      autoComplete="current-password"
                      prefix={<LockOutlined />}
                      placeholder="Enter your password"
                      size="large"
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    loading={loadingAction === "login"}
                    className="auth-submit-btn"
                    block
                  >
                    {loadingAction === "login" ? "Signing in..." : t("login.cta") || "Sign In"}
                  </Button>
                </Form>

                <Text type="secondary" className="auth-hint">
                  {t("login.secondaryHint") || "Enter your credentials to continue"}
                </Text>

                {success && <Alert title={success} type="success" showIcon />}
                {error && <Alert title={error} type="error" showIcon />}
                {session?.user && (
                  <Text type="secondary">
                    {t("login.signedInAs") || "Signed in as"}: {session.user.email}
                  </Text>
                )}
              </Space>
            </Card>
          </div>

          {/* Portal Visual Info */}
          <div className="auth-visual-panel">
            <div className="auth-visual-content">
              <div className="portal-info">
                <div className="portal-badge">Enter the Portal</div>
                <h3 className="portal-title">{t("login.tagline") || "AI-Powered Access"}</h3>
                <p className="portal-description">
                  {t("login.visualCaption") || "Step through the gateway to your personalized dashboard experience"}
                </p>
              </div>
              <div className="portal-stats">
                <div className="portal-stat">
                  <span className="portal-stat-value">256-bit</span>
                  <span className="portal-stat-label">Encryption</span>
                </div>
                <div className="portal-stat">
                  <span className="portal-stat-value">99.9%</span>
                  <span className="portal-stat-label">Uptime</span>
                </div>
                <div className="portal-stat">
                  <span className="portal-stat-value">2FA</span>
                  <span className="portal-stat-label">Security</span>
                </div>
              </div>
            </div>
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
        </svg>
      </div>
      <div className="auth-brand-text">
        <div className="auth-brand-name">QR MENU</div>
        <div className="auth-brand-tagline">{t("login.tagline") || "Smart Dining"}</div>
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
