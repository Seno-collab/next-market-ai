import { useLocale } from "@/hooks/useLocale";
import type { LivePositionRow } from "@/types/portfolio";

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtQty = (n: number) => n.toFixed(8).replace(/\.?0+$/, "");
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function PnlBadge({ value, sub }: { value: number; sub?: string }) {
  const positive = value > 0;
  const negative = value < 0;
  const cls = positive
    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
    : negative
      ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
      : "bg-muted/50 text-muted-foreground";
  return (
    <span className={`inline-flex flex-col items-end rounded-md px-2.5 py-1 tabular-nums ${cls}`}>
      <span className="text-xs font-bold">{fmtUsd(value)}</span>
      {sub && <span className="text-[10px] opacity-80">{sub}</span>}
    </span>
  );
}

function ChangeBadge({ pct }: { pct: number }) {
  const positive = pct > 0;
  const negative = pct < 0;
  const cls = positive
    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
    : negative
      ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/25"
      : "bg-muted/40 text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${cls}`}>
      {positive ? "▲ " : negative ? "▼ " : ""}
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
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between bg-gradient-to-r from-sky-500/10 to-transparent px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
          </span>
          <h2 className="font-semibold text-foreground">
            {t("portfolioPage.openPositions")}
          </h2>
        </div>
        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400">
          {positions.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border/60 bg-muted/40">
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
                  className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${h.align === "right" ? "text-right" : "text-left"}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {positions.map((p) => (
              <tr key={p.symbol} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-bold tracking-wide text-sky-300">
                    {p.symbol}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-foreground">
                  {fmtQty(p.net_qty)}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-foreground/80">
                  {fmtUsd(p.avg_buy_price)}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-foreground">
                  {fmtUsd(p.live_price)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <ChangeBadge pct={p.live_change_24h_pct} />
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-foreground/80">
                  {fmtUsd(p.total_invested)}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-foreground">
                  {fmtUsd(p.live_value)}
                </td>
                <td className="px-4 py-3.5 text-right">
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
