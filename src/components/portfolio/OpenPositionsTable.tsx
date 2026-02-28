import { useLocale } from "@/hooks/useLocale";
import type { LivePositionRow } from "@/types/portfolio";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtQty = (n: number) => n.toFixed(8).replace(/\.?0+$/, "");
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function PnlBadge({ value, sub }: { value: number; sub?: string }) {
  const cls =
    value > 0
      ? "pf-pnl-badge pf-pnl-up"
      : value < 0
        ? "pf-pnl-badge pf-pnl-dn"
        : "pf-pnl-badge pf-pnl-neutral";
  return (
    <span className={cls}>
      <span className="pf-pnl-arrow">{value > 0 ? "▲" : value < 0 ? "▼" : ""}</span>
      <span className="pf-pnl-main">{fmtUsd(value)}</span>
      {sub && <span className="pf-pnl-pct">{sub}</span>}
    </span>
  );
}

function ChangeBadge({ pct }: { pct: number }) {
  const cls =
    pct > 0
      ? "pf-change-badge pf-change-up"
      : pct < 0
        ? "pf-change-badge pf-change-dn"
        : "pf-change-badge pf-change-neutral";
  return (
    <span className={cls}>
      {pct > 0 ? "▲" : pct < 0 ? "▼" : ""}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

interface Props {
  positions: LivePositionRow[];
}

export function OpenPositionsTable({ positions }: Props) {
  const { t } = useLocale();
  if (positions.length === 0) return null;

  return (
    <section className="pf-table-section">
      <div className="pf-section-hd pf-open-hd">
        <div className="pf-section-hd-left">
          <span className="pf-live-ring">
            <span className="pf-live-ping" />
            <span className="pf-live-dot" />
          </span>
          <h2 className="pf-section-title">{t("portfolioPage.openPositions")}</h2>
        </div>
        <span className="pf-count-badge pf-count-sky">{positions.length}</span>
      </div>

      <div className="pf-table-scroll">
        <table className="pf-table">
          <thead>
            <tr className="pf-thead-row">
              {[
                { label: t("portfolioPage.table.symbol"), align: "left" },
                { label: t("portfolioPage.table.netQty"), align: "right" },
                { label: t("portfolioPage.table.avgBuy"), align: "right" },
                { label: t("portfolioPage.table.livePrice"), align: "right" },
                { label: t("portfolioPage.table.change24h"), align: "right" },
                { label: t("portfolioPage.table.invested"), align: "right" },
                { label: t("portfolioPage.table.liveValue"), align: "right" },
                { label: t("portfolioPage.table.unrealizedPnl"), align: "right" },
              ].map((h) => (
                <th
                  key={h.label}
                  className={`pf-th${h.align === "right" ? " pf-th-r" : ""}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.symbol} className="pf-row pf-open-row">
                <td className="pf-td">
                  <span className="pf-sym pf-sym-sky">{p.symbol}</span>
                </td>
                <td className="pf-td pf-td-r pf-num">{fmtQty(p.net_qty)}</td>
                <td className="pf-td pf-td-r pf-num pf-muted">
                  {fmtUsd(p.avg_buy_price)}
                </td>
                <td className="pf-td pf-td-r pf-num pf-bright">
                  {fmtUsd(p.live_price)}
                </td>
                <td className="pf-td pf-td-r">
                  <ChangeBadge pct={p.live_change_24h_pct} />
                </td>
                <td className="pf-td pf-td-r pf-num pf-muted">
                  {fmtUsd(p.total_invested)}
                </td>
                <td className="pf-td pf-td-r pf-num pf-bright">
                  {fmtUsd(p.live_value)}
                </td>
                <td className="pf-td pf-td-r">
                  <PnlBadge
                    value={p.live_unrealized_pnl}
                    sub={fmtPct(p.live_unrealized_pnl_pct)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
