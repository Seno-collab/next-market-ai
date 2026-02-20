import type { Metadata } from "next";
import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  AreaChartOutlined,
  ClockCircleOutlined,
  FireOutlined,
  RadarChartOutlined,
} from "@ant-design/icons";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Coin Market Observatory",
  description:
    "UI research prototype for a crypto market observability application with watchlist, alerts, and sector heat signals.",
};

type Trend = "up" | "down";
type Severity = "high" | "medium" | "low";

type KpiCard = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: Trend;
};

type WatchRow = {
  symbol: string;
  name: string;
  price: string;
  change24h: number;
  change7d: number;
  volume: string;
  signal: string;
};

type SectorHeat = {
  sector: string;
  share: string;
  move: number;
  note: string;
};

type AlertItem = {
  time: string;
  title: string;
  detail: string;
  severity: Severity;
};

const KPI_CARDS: KpiCard[] = [
  {
    id: "market-cap",
    label: "Total Market Cap",
    value: "$2.43T",
    delta: "+2.1% vs 24h",
    trend: "up",
  },
  {
    id: "dominance",
    label: "BTC Dominance",
    value: "57.2%",
    delta: "+0.6% weekly",
    trend: "up",
  },
  {
    id: "volume",
    label: "24h Spot Volume",
    value: "$138.9B",
    delta: "-4.8% vs 24h",
    trend: "down",
  },
  {
    id: "open-interest",
    label: "Futures Open Interest",
    value: "$91.4B",
    delta: "+3.3% vs 24h",
    trend: "up",
  },
];

const WATCHLIST: WatchRow[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: "$97,420",
    change24h: 2.44,
    change7d: 6.12,
    volume: "$46.1B",
    signal: "Momentum intact",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: "$4,010",
    change24h: 1.76,
    change7d: 4.35,
    volume: "$22.5B",
    signal: "L2 driven bid",
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: "$235",
    change24h: -0.84,
    change7d: 9.28,
    volume: "$8.3B",
    signal: "High beta risk",
  },
  {
    symbol: "XRP",
    name: "XRP",
    price: "$1.12",
    change24h: 0.91,
    change7d: -1.87,
    volume: "$4.1B",
    signal: "Range rotation",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    price: "$31.45",
    change24h: 3.14,
    change7d: 12.9,
    volume: "$1.4B",
    signal: "Oracle breakout",
  },
];

const SECTOR_HEAT: SectorHeat[] = [
  { sector: "Layer 1", share: "34%", move: 2.8, note: "Stable risk-on demand" },
  { sector: "AI Tokens", share: "11%", move: 8.4, note: "Speculative expansion" },
  { sector: "DeFi", share: "15%", move: 1.9, note: "Volume-led recovery" },
  { sector: "Memecoins", share: "8%", move: -3.6, note: "Mean reversion pressure" },
  { sector: "RWA", share: "6%", move: 4.1, note: "Institutional narrative" },
];

const ALERT_FEED: AlertItem[] = [
  {
    time: "08:12 UTC",
    title: "Funding rate spike on BTC perpetuals",
    detail: "Funding reached 0.041%, above your caution threshold.",
    severity: "high",
  },
  {
    time: "08:45 UTC",
    title: "ETH spot inflow acceleration",
    detail: "Exchange net inflow switched positive for the first time in 6 hours.",
    severity: "medium",
  },
  {
    time: "09:02 UTC",
    title: "SOL liquidation wall approaching",
    detail: "High leverage cluster detected around $239 - $242.",
    severity: "high",
  },
  {
    time: "09:34 UTC",
    title: "RWA basket trend confirmation",
    detail: "3-session momentum crossed above medium-term baseline.",
    severity: "low",
  },
];

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getMeterWidth(move: number) {
  return `${Math.min(Math.abs(move) * 12, 100)}%`;
}

export default function MarketObservatoryPage() {
  return (
    <main className={styles.page}>
      <div className={styles.orbA} />
      <div className={styles.orbB} />
      <div className={styles.noise} />

      <section className={`${styles.hero} ${styles.reveal} ${styles.revealOne}`}>
        <p className={styles.badge}>UI RESEARCH PROTOTYPE</p>
        <h1 className={styles.title}>Coin Market Observatory</h1>
        <p className={styles.subtitle}>
          A command center layout for monitoring market structure, sector rotation, and risk events in one screen.
        </p>
        <div className={styles.heroMeta}>
          <span>
            <ClockCircleOutlined /> Refresh cadence: 5s
          </span>
          <span>
            <RadarChartOutlined /> 18 signals tracked
          </span>
          <span>
            <AlertOutlined /> 4 active alerts
          </span>
        </div>
      </section>

      <section className={`${styles.kpiGrid} ${styles.reveal} ${styles.revealTwo}`}>
        {KPI_CARDS.map((card) => (
          <article key={card.id} className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiLabel}>{card.label}</span>
              <AreaChartOutlined className={styles.kpiIcon} />
            </div>
            <p className={styles.kpiValue}>{card.value}</p>
            <p className={`${styles.kpiDelta} ${card.trend === "up" ? styles.up : styles.down}`}>
              {card.trend === "up" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {card.delta}
            </p>
          </article>
        ))}
      </section>

      <section className={`${styles.gridMain} ${styles.reveal} ${styles.revealThree}`}>
        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>Top Coin Watchlist</h2>
            <span className={styles.panelTag}>Live ranking</span>
          </header>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Price</th>
                  <th>24h</th>
                  <th>7d</th>
                  <th>Volume</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {WATCHLIST.map((row) => (
                  <tr key={row.symbol}>
                    <td>
                      <div className={styles.coinCell}>
                        <span className={styles.coinBadge}>{row.symbol}</span>
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td>{row.price}</td>
                    <td className={row.change24h >= 0 ? styles.up : styles.down}>{formatPercent(row.change24h)}</td>
                    <td className={row.change7d >= 0 ? styles.up : styles.down}>{formatPercent(row.change7d)}</td>
                    <td>{row.volume}</td>
                    <td>{row.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>Sector Heat</h2>
            <span className={styles.panelTag}>Narrative flow</span>
          </header>
          <div className={styles.sectorList}>
            {SECTOR_HEAT.map((item) => (
              <div key={item.sector} className={styles.sectorCard}>
                <div className={styles.sectorTop}>
                  <strong>{item.sector}</strong>
                  <span>{item.share}</span>
                </div>
                <div className={styles.sectorBar}>
                  <span
                    className={`${styles.sectorFill} ${item.move >= 0 ? styles.sectorUp : styles.sectorDown}`}
                    style={{ width: getMeterWidth(item.move) }}
                  />
                </div>
                <div className={styles.sectorBottom}>
                  <span className={item.move >= 0 ? styles.up : styles.down}>{formatPercent(item.move)}</span>
                  <small>{item.note}</small>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={`${styles.gridBottom} ${styles.reveal} ${styles.revealFour}`}>
        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>Event Timeline</h2>
            <span className={styles.panelTag}>Risk alerts</span>
          </header>
          <div className={styles.alertFeed}>
            {ALERT_FEED.map((item) => (
              <div key={`${item.time}-${item.title}`} className={styles.alertRow}>
                <span className={`${styles.alertDot} ${styles[`severity${item.severity}`]}`} />
                <div className={styles.alertBody}>
                  <div className={styles.alertHead}>
                    <strong>{item.title}</strong>
                    <span>{item.time}</span>
                  </div>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>UI Direction Notes</h2>
            <span className={styles.panelTag}>Research output</span>
          </header>
          <div className={styles.noteList}>
            <div>
              <FireOutlined />
              <p>Priority hierarchy: metric cards first, watchlist second, event feed always visible.</p>
            </div>
            <div>
              <FireOutlined />
              <p>Color logic: green/red reserved for movement, cyan and amber for structural context.</p>
            </div>
            <div>
              <FireOutlined />
              <p>Interaction model: fast scan on desktop, stacked cards with horizontal table scroll on mobile.</p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
