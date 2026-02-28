import { useLocale } from "@/hooks/useLocale";
import type { LivePortfolio } from "@/types/portfolio";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const pnlColor = (n: number) =>
  n > 0 ? "pf-val-up" : n < 0 ? "pf-val-dn" : "pf-val-neutral";

interface Props {
  portfolio: LivePortfolio;
  totalPnl: number;
  roiPct: number;
  onRefetch: () => void;
}

export function PortfolioSummary({
  portfolio,
  totalPnl,
  roiPct,
  onRefetch,
}: Props) {
  const { locale, t } = useLocale();
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="pf-summary">
      <div className="pf-summary-grid">
        <SummaryCard
          label={t("portfolioPage.summary.invested")}
          value={fmtUsd(portfolio.total_invested)}
          accent="#38bdf8"
          accentFrom="rgba(56,189,248,0.18)"
          accentTo="rgba(56,189,248,0.04)"
        />
        <SummaryCard
          label={t("portfolioPage.summary.currentValue")}
          value={fmtUsd(portfolio.total_live_value)}
          accent="#a78bfa"
          accentFrom="rgba(167,139,250,0.18)"
          accentTo="rgba(167,139,250,0.04)"
        />
        <SummaryCard
          label={t("portfolioPage.summary.unrealizedPnl")}
          value={fmtUsd(portfolio.total_live_unrealized_pnl)}
          sub={fmtPct(roiPct)}
          valueColor={pnlColor(portfolio.total_live_unrealized_pnl)}
          trend={portfolio.total_live_unrealized_pnl}
          accent={portfolio.total_live_unrealized_pnl >= 0 ? "#34d399" : "#f87171"}
          accentFrom={
            portfolio.total_live_unrealized_pnl >= 0
              ? "rgba(52,211,153,0.18)"
              : "rgba(248,113,113,0.18)"
          }
          accentTo={
            portfolio.total_live_unrealized_pnl >= 0
              ? "rgba(52,211,153,0.04)"
              : "rgba(248,113,113,0.04)"
          }
        />
        <SummaryCard
          label={t("portfolioPage.summary.realizedPnl")}
          value={fmtUsd(portfolio.total_realized_pnl)}
          valueColor={pnlColor(portfolio.total_realized_pnl)}
          trend={portfolio.total_realized_pnl}
          accent={portfolio.total_realized_pnl >= 0 ? "#34d399" : "#f87171"}
          accentFrom={
            portfolio.total_realized_pnl >= 0
              ? "rgba(52,211,153,0.18)"
              : "rgba(248,113,113,0.18)"
          }
          accentTo={
            portfolio.total_realized_pnl >= 0
              ? "rgba(52,211,153,0.04)"
              : "rgba(248,113,113,0.04)"
          }
        />
        <SummaryCard
          label={t("portfolioPage.summary.totalPnl")}
          value={fmtUsd(totalPnl)}
          sub={`${t("portfolioPage.summary.fees")} ${fmtUsd(portfolio.total_fees)}`}
          valueColor={pnlColor(totalPnl)}
          trend={totalPnl}
          highlight
          accent={totalPnl >= 0 ? "#2dd4bf" : "#f87171"}
          accentFrom={
            totalPnl >= 0
              ? "rgba(45,212,191,0.22)"
              : "rgba(248,113,113,0.22)"
          }
          accentTo={
            totalPnl >= 0
              ? "rgba(45,212,191,0.04)"
              : "rgba(248,113,113,0.04)"
          }
        />
      </div>

      <div className="pf-summary-footer">
        <div className="pf-summary-ts">
          <span className="pf-live-ring pf-live-ring-sm">
            <span className="pf-live-ping" />
            <span className="pf-live-dot" />
          </span>
          <span>
            {t("portfolioPage.summary.updated")}{" "}
            {new Date(portfolio.generated_at).toLocaleTimeString(dateLocale)}
          </span>
          <span className="pf-summary-ver">v{portfolio.watermark.version}</span>
        </div>
        <button onClick={onRefetch} className="pf-sync-btn">
          ↻ {t("portfolioPage.summary.sync")}
        </button>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  valueColor = "",
  accent,
  accentFrom,
  accentTo,
  trend,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  accent: string;
  accentFrom: string;
  accentTo: string;
  trend?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`pf-stat-card${highlight ? " pf-stat-highlight" : ""}`}
      style={
        {
          "--card-accent": accent,
          "--card-from": accentFrom,
          "--card-to": accentTo,
        } as React.CSSProperties
      }
    >
      <div className="pf-stat-bar" />
      <p className="pf-stat-label">{label}</p>
      <div className="pf-stat-value-row">
        {trend !== undefined && trend !== 0 && (
          <span className={`pf-stat-arrow ${valueColor}`}>
            {trend > 0 ? "▲" : "▼"}
          </span>
        )}
        <p className={`pf-stat-value ${valueColor}`}>{value}</p>
      </div>
      {sub && <p className={`pf-stat-sub ${valueColor || "pf-val-neutral"}`}>{sub}</p>}
    </div>
  );
}
