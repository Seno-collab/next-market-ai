"use client";

import dynamic from "next/dynamic";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  BulbOutlined,
  GlobalOutlined,
  LockOutlined,
  LoginOutlined,
  MoonOutlined,
  SafetyOutlined,
  UserOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Spin } from "antd";
import { useState } from "react";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import Sparkline from "@/components/ui/Sparkline";

const LoginPortalScene = dynamic(
  () => import("@/features/auth/components/LoginPortalScene"),
  { ssr: false, loading: () => <div className="portal-loading"><Spin size="large" /></div> }
);

type LoginValues = { email: string; password: string };

const MARKET_CARDS = [
  {
    symbol: "BTC/USDT", price: "$97,420", change: 2.44, up: true,
    history: [91200, 92800, 93400, 94100, 95200, 95800, 96100, 96800, 97000, 97420],
  },
  {
    symbol: "ETH/USDT", price: "$4,010", change: 1.76, up: true,
    history: [3720, 3780, 3870, 3840, 3900, 3960, 3940, 3980, 4000, 4010],
  },
  {
    symbol: "SOL/USDT", price: "$235.40", change: -0.84, up: false,
    history: [242, 241, 239, 240, 238, 236, 237, 236, 235, 235],
  },
] as const;

const MARKET_STATS = [
  { label: "Market Cap", value: "$2.43T", up: true,  delta: "+2.1%" },
  { label: "24h Volume",  value: "$138B",  up: false, delta: "-4.8%" },
  { label: "BTC Dom.",    value: "57.2%",  up: true,  delta: "+0.6%" },
  { label: "Fear Index",  value: "72",     up: true,  delta: "Greed" },
] as const;

export default function LoginPage() {
  const { t } = useLocale();
  const { login, error, loadingAction, session } = useAuthSession();
  const [form] = Form.useForm<LoginValues>();
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (values: LoginValues) => {
    setSuccess(null);
    try {
      await login({ email: values.email, password: values.password });
      setSuccess(t("login.success"));
      window.location.href = "/admin/dashboard";
    } catch {}
  };

  return (
    <div className="tlogin-shell">
      {/* 3D background */}
      <div className="auth-3d-bg tlogin-bg">
        <LoginPortalScene />
      </div>
      <div className="tlogin-overlay" />

      {/* Controls: theme + locale */}
      <div className="tlogin-controls">
        <ThemeSwitch />
        <LocaleSwitch />
      </div>

      {/* Main grid */}
      <div className="tlogin-grid">

        {/* ── Left: form panel ── */}
        <div className="tlogin-form-panel">

          {/* Brand */}
          <div className="tlogin-brand">
            <div className="tlogin-brand-icon">
              <svg viewBox="0 0 32 32" width="22" height="22" fill="none" aria-hidden="true">
                <polyline points="3,24 10,14 16,19 23,9 29,13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="29" cy="13" r="2" fill="currentColor"/>
              </svg>
            </div>
            <span className="tlogin-brand-name">TRADING SENO</span>
            <span className="tlogin-brand-live"><span className="tlogin-live-dot" />LIVE</span>
          </div>

          {/* Heading */}
          <div className="tlogin-heading">
            <h1 className="tlogin-title">
              Đăng nhập<br />
              <span className="tlogin-title-accent">Trading Seno</span>
            </h1>
            <p className="tlogin-subtitle">
              Truy cập bảng điều khiển giao dịch với xác thực AI bảo mật đa lớp.
            </p>
          </div>

          {/* Form */}
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            className="tlogin-form"
          >
            <Form.Item
              name="email"
              rules={[{ required: true, message: t("auth.emailRequired") }]}
              className="tlogin-form-item"
            >
              <Input
                type="email"
                autoComplete="email"
                prefix={<UserOutlined className="tlogin-input-icon" />}
                placeholder={t("login.emailPlaceholder")}
                size="large"
                className="tlogin-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: t("auth.passwordRequired") }]}
              className="tlogin-form-item"
            >
              <Input.Password
                autoComplete="current-password"
                prefix={<LockOutlined className="tlogin-input-icon" />}
                placeholder={t("auth.passwordLabel")}
                size="large"
                className="tlogin-input"
              />
            </Form.Item>

            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loadingAction === "login"}
              icon={<LoginOutlined />}
              className="tlogin-submit-btn"
              block
            >
              {t("login.cta")}
            </Button>
          </Form>

          {/* Feedback */}
          {success && (
            <div className="tlogin-feedback tlogin-feedback-success">
              <SafetyOutlined /> {success}
            </div>
          )}
          {error && (
            <div className="tlogin-feedback tlogin-feedback-error">
              {error}
            </div>
          )}
          {session?.user && (
            <div className="tlogin-feedback tlogin-feedback-info">
              {t("login.signedInAs")}: {session.user.email}
            </div>
          )}

          {/* Hint */}
          <p className="tlogin-hint">
            <SafetyOutlined /> {t("login.secondaryHint")}
          </p>
        </div>

        {/* ── Right: market panel ── */}
        <div className="tlogin-market-panel">

          <div className="tlogin-market-badge">
            <ThunderboltOutlined /> MARKET OVERVIEW
          </div>
          <h2 className="tlogin-market-title">
            Thị trường<br />đang hoạt động
          </h2>

          {/* Coin cards with sparkline */}
          <div className="tlogin-coin-list">
            {MARKET_CARDS.map((c) => (
              <div key={c.symbol} className="tlogin-coin-card">
                <div className="tlogin-coin-left">
                  <span className="tlogin-coin-symbol">{c.symbol}</span>
                  <span className="tlogin-coin-price">{c.price}</span>
                </div>
                <Sparkline
                  data={[...c.history]}
                  width={72}
                  height={30}
                  color={c.up ? "#34d399" : "#f87171"}
                />
                <span className={`tlogin-coin-change ${c.up ? "up" : "down"}`}>
                  {c.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {Math.abs(c.change)}%
                </span>
              </div>
            ))}
          </div>

          {/* Market stats grid */}
          <div className="tlogin-stats-grid">
            {MARKET_STATS.map((s) => (
              <div key={s.label} className="tlogin-stat-tile">
                <span className="tlogin-stat-label">{s.label}</span>
                <span className="tlogin-stat-value">{s.value}</span>
                <span className={`tlogin-stat-delta ${s.up ? "up" : "down"}`}>
                  {s.up ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {s.delta}
                </span>
              </div>
            ))}
          </div>

          {/* Security chips */}
          <div className="tlogin-security">
            {[
              { icon: <SafetyOutlined />, label: "AI Authentication" },
              { icon: <LockOutlined />,   label: "End-to-end Encrypted" },
            ].map((f) => (
              <div key={f.label} className="tlogin-security-chip">
                {f.icon} {f.label}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function LocaleSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="tlogin-ctrl-group">
      <GlobalOutlined />
      {(["vi", "en"] as const).map((l) => (
        <button
          key={l}
          className={`tlogin-ctrl-btn${locale === l ? " active" : ""}`}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch() {
  const { mode, setMode } = useTheme();
  return (
    <div className="tlogin-ctrl-group">
      <button
        className={`tlogin-ctrl-btn${mode === "light" ? " active" : ""}`}
        onClick={() => setMode("light")}
        aria-label="Light"
        aria-pressed={mode === "light"}
      >
        <BulbOutlined />
      </button>
      <button
        className={`tlogin-ctrl-btn${mode === "dark" ? " active" : ""}`}
        onClick={() => setMode("dark")}
        aria-label="Dark"
        aria-pressed={mode === "dark"}
      >
        <MoonOutlined />
      </button>
    </div>
  );
}
