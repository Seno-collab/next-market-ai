"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownOutlined, ArrowUpOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Card, Col, Row, Segmented, Spin, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTheme } from "@/hooks/useTheme";
import { tradingApi, candleToChart, tradeSide } from "@/lib/api/trading";
import type { Ticker, Trade, PriceLevel } from "@/types/trading";
import SymbolSearch from "@/features/trading/components/SymbolSearch";

const TradingChart = dynamic(() => import("@/features/trading/components/TradingChart"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spin size="large" />
    </div>
  ),
});

const { Text, Title } = Typography;

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;

type Interval = (typeof INTERVALS)[number];

type CandleBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

const POLL_MS: Record<Interval, number> = {
  "1m": 10_000,
  "5m": 20_000,
  "15m": 30_000,
  "1h": 60_000,
  "4h": 120_000,
  "1d": 300_000,
};

export default function TradingPage() {
  const { isDark } = useTheme();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setSelectedInterval] = useState<Interval>("1h");
  const [candles, setCandles] = useState<CandleBar[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [bids, setBids] = useState<PriceLevel[]>([]);
  const [asks, setAsks] = useState<PriceLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const [chartHeight, setChartHeight] = useState(420);

  useEffect(() => {
    function updateHeight() {
      const w = window.innerWidth;
      setChartHeight(w < 480 ? 220 : w < 768 ? 280 : 420);
    }
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const fetchAll = useCallback(
    async (sig: AbortSignal) => {
      try {
        const [rawCandles, tickerData, tradesData, orderBook] = await Promise.all([
          tradingApi.getOHLCV(symbol, interval, 100, sig),
          tradingApi.getTicker(symbol, sig),
          tradingApi.getTrades(symbol, 20, sig),
          tradingApi.getOrderBook(symbol, 10, sig),
        ]);
        setCandles(rawCandles.map(candleToChart));
        setTicker(tickerData);
        setTrades(tradesData);
        setBids(orderBook.bids.slice(0, 10));
        setAsks(orderBook.asks.slice(0, 10));
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      } finally {
        setLoading(false);
      }
    },
    [symbol, interval],
  );

  useEffect(() => {
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    void fetchAll(ctrl.signal);

    const ms = POLL_MS[interval];
    const id = setInterval(() => void fetchAll(ctrl.signal), ms);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [fetchAll, interval]);

  const priceChange = ticker ? parseFloat(ticker.price_change_percent) : 0;
  const isUp = priceChange >= 0;

  const tradeColumns: ColumnsType<Trade> = [
    {
      title: "Price",
      dataIndex: "price",
      render: (v: string, row: Trade) => (
        <Text style={{ color: tradeSide(row.is_buyer_maker) === "BUY" ? "#26a69a" : "#ef5350" }}>
          {parseFloat(v).toFixed(2)}
        </Text>
      ),
    },
    {
      title: "Qty",
      dataIndex: "qty",
      render: (v: string) => parseFloat(v).toFixed(4),
    },
    {
      title: "Side",
      render: (_: unknown, row: Trade) => {
        const side = tradeSide(row.is_buyer_maker);
        return <Text style={{ color: side === "BUY" ? "#26a69a" : "#ef5350" }}>{side}</Text>;
      },
    },
  ];

  const askColumns: ColumnsType<PriceLevel> = [
    {
      title: "Price",
      dataIndex: "price",
      render: (v: string) => <Text style={{ color: "#ef5350" }}>{parseFloat(v).toFixed(2)}</Text>,
    },
    { title: "Qty", dataIndex: "quantity", render: (v: string) => parseFloat(v).toFixed(4) },
  ];

  const bidColumns: ColumnsType<PriceLevel> = [
    {
      title: "Price",
      dataIndex: "price",
      render: (v: string) => <Text style={{ color: "#26a69a" }}>{parseFloat(v).toFixed(2)}</Text>,
    },
    { title: "Qty", dataIndex: "quantity", render: (v: string) => parseFloat(v).toFixed(4) },
  ];

  return (
    <div className="trading-page-shell">
      {/* Header row */}
      <div className="trading-header-row">
        <div className="trading-header-left">
          <SymbolSearch value={symbol} onChange={setSymbol} />
          <div className="trading-interval-scroll">
            <Segmented
              options={INTERVALS.map((i) => ({ label: i.toUpperCase(), value: i }))}
              value={interval}
              onChange={(v) => setSelectedInterval(v as Interval)}
            />
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              const ctrl = new AbortController();
              setLoading(true);
              void fetchAll(ctrl.signal);
            }}
          >
            Refresh
          </Button>
        </div>
        {ticker && (
          <div className="trading-ticker-stats">
            <Title level={3} style={{ margin: 0, whiteSpace: "nowrap" }}>
              {parseFloat(ticker.last_price).toLocaleString()}
            </Title>
            <Text style={{ color: isUp ? "#26a69a" : "#ef5350", fontSize: 15, whiteSpace: "nowrap" }}>
              {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{" "}
              {priceChange > 0 ? "+" : ""}
              {priceChange.toFixed(2)}%
            </Text>
            <Text type="secondary" className="trading-stat-hide-xs">
              Vol {parseFloat(ticker.volume).toLocaleString()}
            </Text>
            <Text type="secondary" className="trading-stat-hide-sm">
              H {parseFloat(ticker.high_price).toFixed(2)} / L {parseFloat(ticker.low_price).toFixed(2)}
            </Text>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card>
          <Text type="danger">Failed to load: {error}</Text>
        </Card>
      )}

      {/* Chart */}
      <Card styles={{ body: { padding: 0 } }}>
        {loading && candles.length === 0 ? (
          <div style={{ height: chartHeight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spin size="large" />
          </div>
        ) : (
          <TradingChart candles={candles} isDark={isDark} height={chartHeight} />
        )}
      </Card>

      {/* Order book + recent trades */}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card title="Asks (Sell)" size="small">
            <Table<PriceLevel>
              dataSource={[...asks].reverse()}
              columns={askColumns}
              rowKey="price"
              pagination={false}
              size="small"
              showHeader={false}
            />
          </Card>
          <Card title="Bids (Buy)" size="small" style={{ marginTop: 8 }}>
            <Table<PriceLevel>
              dataSource={bids}
              columns={bidColumns}
              rowKey="price"
              pagination={false}
              size="small"
              showHeader={false}
            />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card title="Recent Trades" size="small">
            <Table<Trade>
              dataSource={trades}
              columns={tradeColumns}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ y: 320 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
