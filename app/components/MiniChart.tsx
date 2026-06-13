"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  SeriesDataItemTypeMap,
  IChartApi,
} from "lightweight-charts";

interface MiniChartProps {
  ticker: string;
  name: string;
  exchange: string;
}

export default function MiniChart({ ticker, name, exchange }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [priceInfo, setPriceInfo] = useState({
    current: 0,
    change: 0,
    changePercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/stock/${ticker}?period=3M`);
        const json = await response.json();

        if (json.success && json.data.length > 0) {
          const currentData = json.data[json.data.length - 1];
          const previousData = json.data[0];
          const change = currentData.close - previousData.close;
          const changePercent = (change / previousData.close) * 100;

          setPriceInfo({
            current: currentData.close,
            change,
            changePercent,
          });

          drawMiniChart(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch mini chart data:", error);
        // 샘플 차트 그리기
        drawMiniChart(generateSampleData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ticker]);

  const drawMiniChart = (data: any[]) => {
    if (!containerRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart: any = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#161b22" },
        textColor: "#e6edf3",
      },
      width: containerRef.current.clientWidth,
      height: 120,
      timeScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: false,
      },
      rightPriceScale: {
        visible: false,
      },
      grid: {
        horzLines: { visible: false },
        vertLines: { visible: false },
      },
    });

    chartRef.current = chart;

    // 캔들스틱 시리즈
    const isPositive =
      data[data.length - 1].close >= data[0].open;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const candleData = data.map((item) => ({
      time: item.date as SeriesDataItemTypeMap["Candlestick"]["time"],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candleSeries.setData(candleData);
    chart.timeScale().fitContent();
  };

  const generateSampleData = () => {
    const data = [];
    let basePrice = 100;

    for (let i = 0; i < 60; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (60 - i));

      const change = (Math.random() - 0.48) * 5;
      const open = basePrice + change;
      const close = open + (Math.random() - 0.5) * 3;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;

      data.push({
        date: date.toISOString().split("T")[0],
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.floor(Math.random() * 10000000 + 5000000),
      });

      basePrice = close;
    }

    // 가격 정보 설정
    const currentData = data[data.length - 1];
    const previousData = data[0];
    const change = currentData.close - previousData.open;
    const changePercent = (change / previousData.open) * 100;

    setPriceInfo({
      current: currentData.close,
      change,
      changePercent,
    });

    return data;
  };

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-indigo-primary/50 transition-colors">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-dark-fg">{name}</h4>
        <p className="text-xs text-dark-muted">{ticker}.{exchange}</p>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="mb-3"
        style={{ minHeight: "120px" }}
      />

      {/* Price Info */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-lg font-bold text-dark-fg">
            {priceInfo.current.toLocaleString("ko-KR", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <p
            className="text-xs font-semibold"
            style={{
              color:
                priceInfo.change >= 0 ? "#10b981" : "#ef4444",
            }}
          >
            {priceInfo.change >= 0 ? "▲" : "▼"}
            {Math.abs(priceInfo.changePercent).toFixed(2)}%
          </p>
        </div>
        <div className="text-xs text-dark-muted text-right">
          <p>3개월</p>
        </div>
      </div>
    </div>
  );
}
