import { useLocale } from "@/hooks/useLocale";
import type { LivePositionRow } from "@/types/portfolio";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtQty = (n: number) => n.toFixed(8).replace(/\.?0+$/, "");

function PnlBadge({ value }: { value: number }) {
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
    </span>
  );
}

interface Props {
  positions: LivePositionRow[];
}

export function ClosedPositionsTable({ positions }: Props) {
  const { t } = useLocale();
  if (positions.length === 0) return null;

  return (
    <section className="pf-table-section">
      <div className="pf-section-hd pf-closed-hd">
        <div className="pf-section-hd-left">
          <span className="pf-closed-dot" />
          <h2 className="pf-section-title">{t("portfolioPage.closedPositions")}</h2>
        </div>
        <span className="pf-count-badge pf-count-amber">{positions.length}</span>
      </div>

      <div className="pf-table-scroll">
        <table className="pf-table">
          <thead>
            <tr className="pf-thead-row">
              {[
                { label: t("portfolioPage.table.symbol"), align: "left" },
                { label: t("portfolioPage.table.buyQty"), align: "right" },
                { label: t("portfolioPage.table.sellQty"), align: "right" },
                { label: t("portfolioPage.table.avgBuy"), align: "right" },
                { label: t("portfolioPage.table.realizedPnl"), align: "right" },
                { label: t("portfolioPage.table.fees"), align: "right" },
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
              <tr key={p.symbol} className="pf-row pf-closed-row">
                <td className="pf-td">
                  <span className="pf-sym pf-sym-amber">{p.symbol}</span>
                </td>
                <td className="pf-td pf-td-r pf-num pf-muted">
                  {fmtQty(p.total_buy_qty)}
                </td>
                <td className="pf-td pf-td-r pf-num pf-muted">
                  {fmtQty(p.total_sell_qty)}
                </td>
                <td className="pf-td pf-td-r pf-num pf-muted">
                  {fmtUsd(p.avg_buy_price)}
                </td>
                <td className="pf-td pf-td-r">
                  <PnlBadge value={p.realized_pnl} />
                </td>
                <td className="pf-td pf-td-r pf-num pf-muted">
                  {fmtUsd(p.total_fees)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
