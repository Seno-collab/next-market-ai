import { useLocale } from "@/hooks/useLocale";
import { Grid, Table } from "antd";
import type { TableColumnsType } from "antd";
import type { LivePositionRow } from "@/types/portfolio";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtQty = (n: number) => n.toFixed(8).replace(/\.?0+$/, "");
const { useBreakpoint } = Grid;

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

type ClosedPositionTableRow = LivePositionRow & { key: string };

export function ClosedPositionsTable({ positions }: Props) {
  const { t } = useLocale();
  const screens = useBreakpoint();
  if (positions.length === 0) return null;

  const dataSource: ClosedPositionTableRow[] = positions.map((position) => ({
    ...position,
    key: position.symbol,
  }));
  const columns: TableColumnsType<ClosedPositionTableRow> = [
    {
      title: t("portfolioPage.table.symbol"),
      dataIndex: "symbol",
      key: "symbol",
      render: (symbol: string) => <span className="pf-sym pf-sym-amber">{symbol}</span>,
    },
    {
      title: t("portfolioPage.table.buyQty"),
      dataIndex: "total_buy_qty",
      key: "total_buy_qty",
      align: "right",
      responsive: ["sm"],
      render: (value: number) => <span className="pf-num pf-muted">{fmtQty(value)}</span>,
    },
    {
      title: t("portfolioPage.table.sellQty"),
      dataIndex: "total_sell_qty",
      key: "total_sell_qty",
      align: "right",
      responsive: ["md"],
      render: (value: number) => <span className="pf-num pf-muted">{fmtQty(value)}</span>,
    },
    {
      title: t("portfolioPage.table.avgBuy"),
      dataIndex: "avg_buy_price",
      key: "avg_buy_price",
      align: "right",
      responsive: ["md"],
      render: (value: number) => <span className="pf-num pf-muted">{fmtUsd(value)}</span>,
    },
    {
      title: screens.sm ? t("portfolioPage.table.realizedPnl") : "P&L",
      key: "realized_pnl",
      align: "right",
      render: (_, row) => <PnlBadge value={row.realized_pnl} />,
    },
    {
      title: t("portfolioPage.table.fees"),
      dataIndex: "total_fees",
      key: "total_fees",
      align: "right",
      responsive: ["lg"],
      render: (value: number) => <span className="pf-num pf-muted">{fmtUsd(value)}</span>,
    },
  ];

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
        <Table<ClosedPositionTableRow>
          columns={columns}
          dataSource={dataSource}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
          className="pf-ant-table pf-ant-closed-table"
        />
      </div>
    </section>
  );
}
