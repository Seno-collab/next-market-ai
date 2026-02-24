"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi, SeriesType, UTCTimestamp } from "lightweight-charts";

type CandleBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type Props = {
  candles: CandleBar[];
  isDark: boolean;
  height?: number;
  /** Live candle tick from WS — applied via series.update() (no full data reload). */
  liveBar?: CandleBar | null;
};

export default function TradingChart({ candles, isDark, height = 420, liveBar }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  // Track latest liveBar via ref so the candles-effect can re-apply it after setData.
  const liveBarRef = useRef<CandleBar | null>(null);

  // ── Create / recreate chart when theme or height changes ──────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bg = isDark ? "#0d1117" : "#ffffff";
    const text = isDark ? "#94a3b8" : "#262626";
    const grid = isDark ? "#161b27" : "#f0f0f0";
    const border = isDark ? "#1e2a3a" : "#d9d9d9";

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: text,
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: border },
      timeScale: {
        borderColor: border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, height]);

  // ── Load historical candles (setData) — only on symbol/period change ──────
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const chartData = candles.map((c) => ({ ...c, time: c.time as UTCTimestamp }));
    seriesRef.current.setData(chartData);

    // Re-apply the live bar if it is at or after the last historical candle.
    // This prevents a gap when historical data is refreshed mid-session.
    const live = liveBarRef.current;
    if (live && seriesRef.current) {
      const last = chartData.at(-1);
      if (!last || live.time >= last.time) {
        try {
          seriesRef.current.update({ ...live, time: live.time as UTCTimestamp });
        } catch {
          // Bar earlier than current — ignore.
        }
      }
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // ── Live candle tick — series.update() only, no full reload ───────────────
  useEffect(() => {
    liveBarRef.current = liveBar ?? null;
    if (!liveBar || !seriesRef.current) return;
    try {
      seriesRef.current.update({ ...liveBar, time: liveBar.time as UTCTimestamp });
    } catch {
      // Ignore if bar time is before the current last bar (shouldn't happen normally).
    }
  }, [liveBar]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
