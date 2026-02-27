import { useLocale } from "@/hooks/useLocale";
import type { LivePortfolio } from "@/types/portfolio";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const pnlTextColor = (n: number) =>
  n > 0 ? "text-emerald-300" : n < 0 ? "text-red-400" : "text-muted-foreground";

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
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label={t("portfolioPage.summary.invested")}
          value={fmtUsd(portfolio.total_invested)}
          bgClass="from-sky-500/20 to-cyan-500/8"
          accentBar="from-sky-400 to-sky-500/30"
        />
        <SummaryCard
          label={t("portfolioPage.summary.currentValue")}
          value={fmtUsd(portfolio.total_live_value)}
          bgClass="from-violet-500/20 to-indigo-500/8"
          accentBar="from-violet-400 to-violet-500/30"
        />
        <SummaryCard
          label={t("portfolioPage.summary.unrealizedPnl")}
          value={fmtUsd(portfolio.total_live_unrealized_pnl)}
          sub={fmtPct(roiPct)}
          valueClass={pnlTextColor(portfolio.total_live_unrealized_pnl)}
          bgClass={
            portfolio.total_live_unrealized_pnl >= 0
              ? "from-emerald-500/20 to-teal-500/8"
              : "from-red-500/20 to-rose-500/8"
          }
          accentBar={
            portfolio.total_live_unrealized_pnl >= 0
              ? "from-emerald-400 to-emerald-500/30"
              : "from-red-400 to-red-500/30"
          }
          trend={portfolio.total_live_unrealized_pnl}
        />
        <SummaryCard
          label={t("portfolioPage.summary.realizedPnl")}
          value={fmtUsd(portfolio.total_realized_pnl)}
          valueClass={pnlTextColor(portfolio.total_realized_pnl)}
          bgClass={
            portfolio.total_realized_pnl >= 0
              ? "from-emerald-500/20 to-green-500/8"
              : "from-red-500/20 to-rose-500/8"
          }
          accentBar={
            portfolio.total_realized_pnl >= 0
              ? "from-emerald-400 to-emerald-500/30"
              : "from-red-400 to-red-500/30"
          }
          trend={portfolio.total_realized_pnl}
        />
        <SummaryCard
          label={t("portfolioPage.summary.totalPnl")}
          value={fmtUsd(totalPnl)}
          sub={`${t("portfolioPage.summary.fees")} ${fmtUsd(portfolio.total_fees)}`}
          valueClass={pnlTextColor(totalPnl)}
          bgClass={
            totalPnl >= 0
              ? "from-teal-500/20 to-emerald-500/8"
              : "from-red-500/20 to-amber-500/8"
          }
          accentBar={
            totalPnl >= 0
              ? "from-teal-400 to-teal-500/30"
              : "from-red-400 to-red-500/30"
          }
          trend={totalPnl}
          highlight
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span>
            {t("portfolioPage.summary.updated")}{" "}
            {new Date(portfolio.generated_at).toLocaleTimeString(dateLocale)} ·{" "}
            <span className="font-mono text-[10px] text-foreground/60">
              v{portfolio.watermark.version}
            </span>
          </span>
        </div>
        <button
          onClick={onRefetch}
          className="rounded-lg border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground/80 transition-all hover:bg-accent hover:text-foreground"
        >
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
  valueClass = "",
  bgClass,
  accentBar,
  trend,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  bgClass: string;
  accentBar: string;
  trend?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border/80 bg-gradient-to-br ${bgClass} p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 ${highlight ? "ring-1 ring-border" : ""}`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl bg-gradient-to-b ${accentBar}`}
      />

      <p className="pl-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>

      <div className="mt-2 flex items-baseline gap-1 pl-1">
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs leading-none ${valueClass}`}>
            {trend > 0 ? "▲" : "▼"}
          </span>
        )}
        <p className={`text-sm font-bold tabular-nums sm:text-base ${valueClass || "text-foreground"}`}>
          {value}
        </p>
      </div>

      {sub && (
        <p className={`mt-0.5 pl-1 text-[11px] tabular-nums ${valueClass || "text-muted-foreground"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}
