import { useLocale } from "@/hooks/useLocale";
import { Grid, Table } from "antd";
import type { TableColumnsType } from "antd";
import type { LivePositionRow } from "@/types/portfolio";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtQty = (n: number) => n.toFixed(8).replace(/\.?0+$/, "");
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const { useBreakpoint } = Grid;

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

type OpenPositionTableRow = LivePositionRow & { key: string };

export function OpenPositionsTable({ positions }: Props) {
  const { t } = useLocale();
  const screens = useBreakpoint();
  if (positions.length === 0) return null;

  const dataSource: OpenPositionTableRow[] = positions.map((position) => ({
    ...position,
    key: position.symbol,
  }));
  const columns: TableColumnsType<OpenPositionTableRow> = [
    {
      title: t("portfolioPage.table.symbol"),
      dataIndex: "symbol",
      key: "symbol",
      render: (symbol: string) => <span className="pf-sym pf-sym-sky">{symbol}</span>,
    },
    {
      title: t("portfolioPage.table.netQty"),
      dataIndex: "net_qty",
      key: "net_qty",
      align: "right",
      responsive: ["sm"],
      render: (value: number) => <span className="pf-num">{fmtQty(value)}</span>,
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
      title: t("portfolioPage.table.livePrice"),
      dataIndex: "live_price",
      key: "live_price",
      align: "right",
      render: (value: number) => <span className="pf-num pf-bright">{fmtUsd(value)}</span>,
    },
    {
      title: screens.sm ? t("portfolioPage.table.change24h") : "24h",
      dataIndex: "live_change_24h_pct",
      key: "live_change_24h_pct",
      align: "right",
      render: (value: number) => <ChangeBadge pct={value} />,
    },
    {
      title: t("portfolioPage.table.invested"),
      dataIndex: "total_invested",
      key: "total_invested",
      align: "right",
      responsive: ["lg"],
      render: (value: number) => <span className="pf-num pf-muted">{fmtUsd(value)}</span>,
    },
    {
      title: t("portfolioPage.table.liveValue"),
      dataIndex: "live_value",
      key: "live_value",
      align: "right",
      responsive: ["md"],
      render: (value: number) => <span className="pf-num pf-bright">{fmtUsd(value)}</span>,
    },
    {
      title: t("portfolioPage.table.unrealizedPnl"),
      key: "live_unrealized_pnl",
      align: "right",
      render: (_, row) => (
        <PnlBadge
          value={row.live_unrealized_pnl}
          sub={fmtPct(row.live_unrealized_pnl_pct)}
        />
      ),
    },
  ];

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
        <Table<OpenPositionTableRow>
          columns={columns}
          dataSource={dataSource}
          rowKey="key"
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
          className="pf-ant-table pf-ant-open-table"
        />
      </div>
    </section>
  );
}
