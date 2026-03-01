"use client";

import { Col, Grid, Row } from "antd";
import { ClosedPositionsTable } from "@/components/portfolio/ClosedPositionsTable";
import { OpenPositionsTable } from "@/components/portfolio/OpenPositionsTable";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { usePortfolioStream } from "@/hooks/usePortfolioStream";
import { getStoredAuthTokens } from "@/lib/api/client";

const { useBreakpoint } = Grid;
const GRID_GUTTER = { xs: 8, sm: 16, md: 24, lg: 32 } as const;

export default function PortfolioPage() {
  const screens = useBreakpoint();
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
  const skeletonCount = screens.lg ? 5 : screens.sm ? 4 : 3;

  if (loading && !portfolio) {
    return (
      <div className="pf-shell">
        <div className="pf-skeleton-header" />
        <div className="pf-skeleton-grid">
          <Row gutter={[GRID_GUTTER, GRID_GUTTER]}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Col key={i} xs={24} sm={12} md={12} lg={8} xl={4} xxl={4}>
                <div className="pf-skeleton-card" />
              </Col>
            ))}
          </Row>
        </div>
        <div className="pf-skeleton-table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pf-shell">
        <div className="pf-error-state">
          <div className="pf-error-icon">⚠</div>
          <p className="pf-error-msg">{error}</p>
          <button onClick={() => void refetch()} className="pf-error-btn">
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
    <div className="pf-shell">
      {/* bg blobs */}
      <div className="pf-blob pf-blob-a" />
      <div className="pf-blob pf-blob-b" />

      {/* Header */}
      <header className="pf-header">
        <div className="pf-header-inner">
          <div className="pf-eyebrow">
            <span className="pf-live-ring">
              <span className="pf-live-ping" />
              <span className="pf-live-dot" />
            </span>
            {t("portfolioPage.liveBadge")}
          </div>
          <h1 className="pf-title">{t("portfolioPage.title")}</h1>
          <p className="pf-subtitle">{t("portfolioPage.subtitle")}</p>
        </div>
        <div className="pf-header-deco" />
      </header>

      {/* Summary cards */}
      <PortfolioSummary
        portfolio={portfolio}
        totalPnl={totalPnl}
        roiPct={roiPct}
        onRefetch={() => void refetch()}
      />

      {/* Positions */}
      {hasAnyPositions ? (
        <div className="pf-tables">
          <OpenPositionsTable positions={openPositions} />
          <ClosedPositionsTable positions={closedPositions} />
        </div>
      ) : (
        <div className="pf-empty">
          <div className="pf-empty-icon">◎</div>
          <p className="pf-empty-title">{t("portfolioPage.emptyTitle")}</p>
          <p className="pf-empty-sub">{t("portfolioPage.emptySubtitle")}</p>
        </div>
      )}
    </div>
  );
}
