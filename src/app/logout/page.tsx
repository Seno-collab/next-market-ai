"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Button, Spin } from "antd";
import {
  LogoutOutlined,
  LoginOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LockOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  TrophyOutlined,
  AreaChartOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useLocale } from "@/hooks/useLocale";
import Sparkline from "@/components/ui/Sparkline";

const LogoutVortexScene = dynamic(
  () => import("@/features/auth/components/LogoutVortexScene"),
  {
    ssr: false,
    loading: () => (
      <div className="vortex-loading">
        <Spin size="large" />
      </div>
    ),
  },
);

const SESSION_KPIS = [
  {
    label: "Session P&L",
    value: "+$3,120",
    icon: <RiseOutlined />,
    color: "#34d399",
    history: [2100, 2300, 2500, 2200, 2800, 3000, 2900, 3100, 3050, 3120],
  },
  {
    label: "Win Rate",
    value: "72.4%",
    icon: <TrophyOutlined />,
    color: "#22d3ee",
    history: [65, 68, 70, 69, 71, 72, 70, 72, 71, 72],
  },
  {
    label: "Trades",
    value: "12",
    icon: <AreaChartOutlined />,
    color: "#60a5fa",
    history: [1, 2, 3, 4, 5, 6, 7, 8, 9, 12],
  },
  {
    label: "Session Time",
    value: "4h 22m",
    icon: <ClockCircleOutlined />,
    color: "#fbbf24",
    history: [30, 60, 90, 120, 150, 180, 210, 240, 252, 262],
  },
] as const;

const ACTIVITY_FEED = [
  {
    icon: <ArrowUpOutlined />,
    color: "#34d399",
    text: "BTC/USDT LONG closed",
    detail: "+$1,110 · +2.33%",
    time: "14:38",
  },
  {
    icon: <ArrowUpOutlined />,
    color: "#34d399",
    text: "ETH/USDT LONG closed",
    detail: "+$700 · +3.62%",
    time: "12:05",
  },
  {
    icon: <ArrowDownOutlined />,
    color: "#34d399",
    text: "SOL/USDT SHORT closed",
    detail: "+$140 · +2.89%",
    time: "10:48",
  },
  {
    icon: <CheckCircleOutlined />,
    color: "#22d3ee",
    text: "Portfolio snapshot saved",
    detail: "All positions stored",
    time: "18:59",
  },
  {
    icon: <LockOutlined />,
    color: "#fbbf24",
    text: "Session locked",
    detail: "Auth token cleared",
    time: "18:59",
  },
] as const;

export default function LogoutPage() {
  const { t } = useLocale();
  const { session, logout, loadingAction, error } = useAuthSession();
  const [success, setSuccess] = useState<string | null>(null);
  const didLogout = useRef(false);

  useEffect(() => {
    if (didLogout.current) return;
    didLogout.current = true;
    logout()
      .then(() => setSuccess(t("logout.success")))
      .catch(() => {});
  }, [logout, t]);

  const handleLogout = async () => {
    setSuccess(null);
    try {
      await logout();
      setSuccess(t("logout.success"));
    } catch {}
  };

  return (
    <div className="auth-shell-3d logout-shell">
      {/* 3D Background */}
      <div className="auth-3d-bg">
        <LogoutVortexScene />
      </div>
      <div className="auth-overlay logout-overlay" />

      {/* Content */}
      <div className="auth-3d-content tl2-content">
        <div className="tl2-grid">
          {/* ── Left: logout card ── */}
          <div className="tl2-left">
            {/* Brand */}
            <div className="tl2-brand">
              <span className="tl2-brand-dot" />
              COIN SWING TRADER
              <span className="tl2-brand-ver">v2.4</span>
            </div>

            {/* Animated icon */}
            <div className="tl2-icon-stage">
              <div className="tl2-ring tl2-r1" />
              <div className="tl2-ring tl2-r2" />
              <div className="tl2-ring tl2-r3" />
              <div className="tl2-icon-bg">
                <LogoutOutlined className="tl2-icon" />
              </div>
            </div>

            {/* Heading */}
            <div className="tl2-badge">
              <LockOutlined /> Đóng phiên giao dịch
            </div>
            <h2 className="tl2-title">
              Đăng xuất
              <br />
              <span className="tl2-title-accent">Coin Swing Trader</span>
            </h2>
            <p className="tl2-desc">
              Phiên giao dịch sẽ được khoá an toàn.
              <br />
              Dữ liệu portfolio được lưu trữ đầy đủ.
            </p>

            <div className="tl2-divider" />

            {/* User + action */}
            {session?.authenticated ? (
              <>
                {session.user && (
                  <div className="tl2-user">
                    <div className="tl2-user-avatar">
                      {(
                        session.user.name?.trim() ||
                        session.user.email?.trim() ||
                        "T"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="tl2-user-info">
                      <div className="tl2-user-name">
                        {session.user.name || "Trader"}
                      </div>
                      <div className="tl2-user-email">{session.user.email}</div>
                    </div>
                    <span className="tl2-online-dot" />
                  </div>
                )}
                <Button
                  type="primary"
                  danger
                  size="large"
                  onClick={handleLogout}
                  loading={loadingAction === "logout"}
                  icon={<LogoutOutlined />}
                  className="tl2-logout-btn"
                  block
                >
                  {t("logout.cta")}
                </Button>
              </>
            ) : (
              <>
                <p className="tl2-no-session">{t("logout.noSession")}</p>
                <Link href="/login" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<LoginOutlined />}
                    className="tl2-login-btn"
                    block
                  >
                    {t("logout.backToLogin")}
                  </Button>
                </Link>
              </>
            )}

            {success && (
              <div className="tl2-feedback tl2-ok">
                <CheckCircleOutlined /> {success}
              </div>
            )}
            {error && <div className="tl2-feedback tl2-err">{error}</div>}

            {/* Security chips */}
            <div className="tl2-chip-row">
              <span className="tl2-chip">
                <LockOutlined /> Encrypted
              </span>
              <span className="tl2-chip">
                <SafetyOutlined /> 2FA
              </span>
              <span className="tl2-chip">
                <CheckCircleOutlined /> Verified
              </span>
            </div>
          </div>

          {/* ── Right: session summary ── */}
          <div className="tl2-right">
            {/* Header */}
            <div className="tl2-right-hd">
              <div className="tl2-right-eyebrow">
                <ThunderboltOutlined /> SESSION SUMMARY
              </div>
              <h3 className="tl2-right-title">
                Phiên giao dịch
                <br />
                <span>đã được bảo vệ</span>
              </h3>
              <p className="tl2-right-desc">
                Tất cả vị thế và dữ liệu giao dịch đã được lưu lại trước khi
                đăng xuất.
              </p>
            </div>

            {/* KPI cards with sparklines */}
            <div className="tl2-kpi-grid">
              {SESSION_KPIS.map((k) => (
                <div
                  key={k.label}
                  className="tl2-kpi-card"
                  style={{ "--kpi-color": k.color } as React.CSSProperties}
                >
                  <div className="tl2-kpi-top">
                    <span className="tl2-kpi-icon" style={{ color: k.color }}>
                      {k.icon}
                    </span>
                    <span className="tl2-kpi-label">{k.label}</span>
                  </div>
                  <div className="tl2-kpi-val" style={{ color: k.color }}>
                    {k.value}
                  </div>
                  <Sparkline
                    data={[...k.history]}
                    width={110}
                    height={32}
                    color={k.color}
                  />
                </div>
              ))}
            </div>

            {/* Activity feed */}
            <div className="tl2-activity">
              <div className="tl2-activity-hd">
                <ClockCircleOutlined /> Activity Log
              </div>
              {ACTIVITY_FEED.map((a, i) => (
                <div key={i} className="tl2-activity-row">
                  <div
                    className="tl2-activity-dot"
                    style={{
                      background: a.color,
                      boxShadow: `0 0 6px ${a.color}90`,
                    }}
                  />
                  <div className="tl2-activity-icon" style={{ color: a.color }}>
                    {a.icon}
                  </div>
                  <div className="tl2-activity-body">
                    <span className="tl2-activity-text">{a.text}</span>
                    <span className="tl2-activity-detail">{a.detail}</span>
                  </div>
                  <span className="tl2-activity-time">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
