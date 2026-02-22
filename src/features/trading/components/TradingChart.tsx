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
};

export default function TradingChart({ candles, isDark, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  // Create chart once (or recreate when theme changes)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bg = isDark ? "#141414" : "#ffffff";
    const text = isDark ? "#d9d9d9" : "#262626";
    const grid = isDark ? "#1f1f1f" : "#f0f0f0";
    const border = isDark ? "#303030" : "#d9d9d9";

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

  // Update candle data separately (no chart recreation)
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;
    const chartData = candles.map((c) => ({ ...c, time: c.time as UTCTimestamp }));
    seriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
