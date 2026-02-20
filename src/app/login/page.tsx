"use client";

import dynamic from "next/dynamic";
import { BulbOutlined, GlobalOutlined, MoonOutlined, SendOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Form, Input, Spin } from "antd";
import { useState } from "react";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";

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
      // Force a full page reload to ensure cookies are properly read by server components
      // This fixes the issue where router.push doesn't work on VPS due to cache
      window.location.href = "/admin/dashboard";
    } catch {
      // Error state is handled in the auth hook.
    }
  };

  return (
    <div className="chat-login-shell">
      {/* 3D Background */}
      <div className="auth-3d-bg">
        <LoginPortalScene />
      </div>

      {/* Header */}
      <header className="chat-login-header">
        <div className="chat-login-header-left">
          <div className="chat-login-avatar" aria-hidden="true">
            <svg viewBox="0 0 64 64" width="40" height="40" focusable="false" aria-hidden="true">
              <polyline points="8,48 20,32 28,40 40,20 52,28 56,16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <polygon points="52,16 56,16 56,20" fill="currentColor" opacity="0.7" />
              <rect x="12" y="50" width="6" height="8" rx="1" fill="currentColor" opacity="0.4" />
              <rect x="22" y="46" width="6" height="12" rx="1" fill="currentColor" opacity="0.5" />
              <rect x="32" y="42" width="6" height="16" rx="1" fill="currentColor" opacity="0.6" />
              <rect x="42" y="38" width="6" height="20" rx="1" fill="currentColor" opacity="0.7" />
            </svg>
          </div>
          <div className="chat-login-info">
            <span className="chat-login-info-name">{t("site.name") || "Tranding Seno"}</span>
            <span className="chat-login-info-status">{t("login.chatStatus")}</span>
          </div>
        </div>
        <div className="chat-login-header-right">
          <ChatThemeSwitch />
          <ChatLocaleSwitch />
        </div>
      </header>

      {/* Messages area — contains bubbles + form card */}
      <div className="chat-login-messages">
        {/* Bot greeting */}
        <div className="chat-login-bubble chat-login-bubble--bot">
          {t("login.chatGreeting")}
        </div>
        <div className="chat-login-bubble chat-login-bubble--bot">
          {t("login.chatInstruction")}
        </div>

        {/* Interactive form card (Telegram bot style) */}
        <div className="chat-login-card">
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            className="chat-login-card-form"
          >
            <div className="chat-login-card-fields">
              <Form.Item
                name="email"
                rules={[{ required: true, message: t("auth.emailRequired") }]}
                className="chat-login-card-item"
              >
                <Input
                  type="email"
                  autoComplete="email"
                  prefix={<UserOutlined />}
                  placeholder={t("login.emailPlaceholder")}
                  size="large"
                />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[{ required: true, message: t("auth.passwordRequired") }]}
                className="chat-login-card-item"
              >
                <Input.Password
                  autoComplete="current-password"
                  prefix={<LockOutlined />}
                  placeholder={t("auth.passwordLabel")}
                  size="large"
                />
              </Form.Item>
            </div>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loadingAction === "login"}
              className="chat-login-card-btn"
              icon={<SendOutlined />}
              block
            >
              {t("login.cta")}
            </Button>
          </Form>
          <div className="chat-login-card-hint">
            {t("login.secondaryHint")}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div className="chat-login-bubble chat-login-bubble--system chat-login-bubble--success">
            {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="chat-login-bubble chat-login-bubble--system chat-login-bubble--error">
            {error}
          </div>
        )}

        {/* Signed-in info */}
        {session?.user && (
          <div className="chat-login-bubble chat-login-bubble--system">
            {t("login.signedInAs") || "Signed in as"}: {session.user.email}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatLocaleSwitch() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="chat-login-locale">
      <GlobalOutlined />
      <Button
        size="small"
        type="text"
        className={`chat-login-locale-btn${locale === "vi" ? " is-active" : ""}`}
        onClick={() => setLocale("vi")}
        aria-pressed={locale === "vi"}
      >
        VI
      </Button>
      <Button
        size="small"
        type="text"
        className={`chat-login-locale-btn${locale === "en" ? " is-active" : ""}`}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        EN
      </Button>
    </div>
  );
}

function ChatThemeSwitch() {
  const { mode, setMode } = useTheme();

  return (
    <div className="chat-login-theme">
      <Button
        size="small"
        type="text"
        className={`chat-login-theme-btn${mode === "light" ? " is-active" : ""}`}
        icon={<BulbOutlined />}
        onClick={() => setMode("light")}
        aria-pressed={mode === "light"}
        aria-label="Light theme"
      />
      <Button
        size="small"
        type="text"
        className={`chat-login-theme-btn${mode === "dark" ? " is-active" : ""}`}
        icon={<MoonOutlined />}
        onClick={() => setMode("dark")}
        aria-pressed={mode === "dark"}
        aria-label="Dark theme"
      />
    </div>
  );
}
