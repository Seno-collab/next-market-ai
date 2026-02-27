"use client";

import { ClosedPositionsTable } from "@/components/portfolio/ClosedPositionsTable";
import { OpenPositionsTable } from "@/components/portfolio/OpenPositionsTable";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { usePortfolioStream } from "@/hooks/usePortfolioStream";
import { getStoredAuthTokens } from "@/lib/api/client";

export default function PortfolioPage() {
  const { t } = useLocale();
  const { tokens } = useAuth();
  const accessToken =
    tokens?.accessToken ?? getStoredAuthTokens()?.accessToken ?? null;

  const {
    portfolio,
    openPositions,
    closedPositions,
    totalPnl,
    roiPct,
    loading,
    error,
    refetch,
  } = usePortfolioStream(accessToken);

  if (loading && !portfolio) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-5">
          <div className="h-27 animate-pulse rounded-2xl bg-muted/40" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-22 animate-pulse rounded-xl bg-muted/40"
              />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-sm font-medium text-red-400">{error}</p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            {t("portfolioPage.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio) return null;

  const hasAnyPositions =
    openPositions.length > 0 || closedPositions.length > 0;

  return (
    <div className="relative isolate">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-sky-500/15 via-emerald-500/8 to-transparent blur-3xl" />

      <div className="container mx-auto space-y-5 px-4 py-6">
        {/* Header */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-500/15 via-background to-emerald-500/15 p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sky-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 right-20 h-28 w-28 rounded-full bg-emerald-500/20 blur-2xl" />

          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500/90">
                {t("portfolioPage.liveBadge")}
              </p>
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {t("portfolioPage.title")}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              {t("portfolioPage.subtitle")}
            </p>
          </div>
        </header>

        <PortfolioSummary
          portfolio={portfolio}
          totalPnl={totalPnl}
          roiPct={roiPct}
          onRefetch={() => {
            void refetch();
          }}
        />

        {hasAnyPositions ? (
          <>
            <OpenPositionsTable positions={openPositions} />
            <ClosedPositionsTable positions={closedPositions} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-lg">
              ◎
            </div>
            <p className="font-medium text-foreground">
              {t("portfolioPage.emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("portfolioPage.emptySubtitle")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
