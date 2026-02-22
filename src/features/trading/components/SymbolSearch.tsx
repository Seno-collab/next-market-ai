"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDownOutlined, SearchOutlined } from "@ant-design/icons";
import { Input, Modal, Tabs, Typography } from "antd";
import type { InputRef } from "antd";

const { Text } = Typography;

type SymbolEntry = { symbol: string; base: string; quote: string };

function makeEntries(symbols: string[], quote: string): SymbolEntry[] {
  return symbols.map((s) => ({
    symbol: s,
    base: s.slice(0, s.length - quote.length),
    quote,
  }));
}

const USDT_LIST = makeEntries(
  [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT",
    "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT", "UNIUSDT", "ATOMUSDT",
    "LTCUSDT", "NEARUSDT", "MATICUSDT", "ARBUSDT", "OPUSDT", "INJUSDT",
    "SUIUSDT", "APTUSDT", "FILUSDT", "SANDUSDT", "MANAUSDT", "SHIBUSDT",
    "PEPEUSDT", "WIFUSDT", "TONUSDT", "TRXUSDT", "HBARUSDT", "FETUSDT",
  ],
  "USDT",
);

const BTC_LIST = makeEntries(
  ["ETHBTC", "BNBBTC", "XRPBTC", "LTCBTC", "SOLBTC", "LINKBTC", "ADABTC"],
  "BTC",
);

const ETH_LIST = makeEntries(
  ["BNBETH", "LINKETH", "UNIETH", "DOTETH", "SOLETH"],
  "ETH",
);

const ALL_BY_TAB: Record<string, SymbolEntry[]> = {
  USDT: USDT_LIST,
  BTC: BTC_LIST,
  ETH: ETH_LIST,
};

type Props = {
  value: string;
  onChange: (symbol: string) => void;
};

function formatDisplay(symbol: string): { base: string; quote: string } {
  for (const q of ["USDT", "BTC", "ETH", "BNB"]) {
    if (symbol.endsWith(q)) return { base: symbol.slice(0, -q.length), quote: q };
  }
  return { base: symbol, quote: "" };
}

export default function SymbolSearch({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("USDT");
  const inputRef = useRef<InputRef>(null);

  const { base, quote } = formatDisplay(value);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus?.(), 100);
    }
  }, [open]);

  const pool = query.trim()
    ? Object.values(ALL_BY_TAB)
        .flat()
        .filter((e) => e.symbol.includes(query.toUpperCase()))
    : (ALL_BY_TAB[tab] ?? []);

  function select(symbol: string) {
    onChange(symbol);
    setOpen(false);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{base}</span>
        <span style={{ fontSize: 14, opacity: 0.5, lineHeight: 1 }}>{quote ? `/${quote}` : ""}</span>
        <CaretDownOutlined style={{ fontSize: 12, opacity: 0.6 }} />
      </button>

      {/* Search modal */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        title={null}
        width={480}
        styles={{ body: { padding: 0 } }}
        destroyOnHidden
      >
        {/* Search input */}
        <div style={{ padding: "16px 16px 0" }}>
          <Input
            ref={inputRef}
            prefix={<SearchOutlined />}
            placeholder="Search symbol (e.g. BTC, ETH...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            allowClear
            size="large"
            autoComplete="off"
          />
        </div>

        {/* Category tabs (hidden when searching) */}
        {!query.trim() && (
          <div style={{ padding: "0 16px" }}>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              size="small"
              items={Object.keys(ALL_BY_TAB).map((k) => ({ key: k, label: k }))}
            />
          </div>
        )}

        {/* Symbol list */}
        <div style={{ maxHeight: 400, overflowY: "auto", padding: "0 8px 12px" }}>
          {pool.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <Text type="secondary">No results for "{query}"</Text>
            </div>
          ) : (
            pool.map((entry) => (
              <SymbolRow
                key={entry.symbol}
                entry={entry}
                selected={entry.symbol === value}
                onClick={() => select(entry.symbol)}
              />
            ))
          )}
        </div>
      </Modal>
    </>
  );
}

function SymbolRow({
  entry,
  selected,
  onClick,
}: {
  entry: SymbolEntry;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "10px 8px",
        background: selected ? "rgba(38,166,154,0.12)" : "transparent",
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        gap: 12,
        textAlign: "left",
      }}
    >
      {/* Coin initials badge */}
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(128,128,128,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          color: selected ? "#26a69a" : undefined,
        }}
      >
        {entry.base.slice(0, 3)}
      </span>

      <span style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{entry.base}</span>
        <span style={{ fontSize: 12, opacity: 0.5 }}>/{entry.quote}</span>
      </span>

      {selected && (
        <span style={{ fontSize: 12, color: "#26a69a", fontWeight: 600 }}>✓</span>
      )}
    </button>
  );
}
