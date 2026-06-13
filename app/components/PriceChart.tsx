"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  SeriesDataItemTypeMap,
} from "lightweight-charts";

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleData {
  time: SeriesDataItemTypeMap["Candlestick"]["time"];
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: SeriesDataItemTypeMap["Histogram"]["time"];
  value: number;
  color: string;
}

interface MAData {
  time: SeriesDataItemTypeMap["Line"]["time"];
  value: number;
}

interface PriceChartProps {
  ticker: string;
  name: string;
  exchange: string;
}

export default function PriceChart({
  ticker,
  name,
  exchange,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [period, setPeriod] = useState<"1M" | "3M" | "6M" | "1Y" | "3Y">(
    "1Y"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalData[]>([]);
  const [priceInfo, setPriceInfo] = useState({
    current: 0,
    change: 0,
    changePercent: 0,
  });

  // 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/stock/${ticker}?period=${period}`);
        if (!response.ok) {
          throw new Error("Failed to fetch stock data");
        }

        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error || "Unknown error");
        }

        setData(json.data);

        // 가격 정보 계산
        if (json.data.length > 0) {
          const currentData = json.data[json.data.length - 1];
          const previousData = json.data[0];
          const change = currentData.close - previousData.close;
          const changePercent = (change / previousData.close) * 100;

          setPriceInfo({
            current: currentData.close,
            change,
            changePercent,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker, period]);

  // 차트 초기화 및 렌더링
  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // 기존 차트 제거
    if (chartRef.current) {
      chartRef.current.remove();
    }

    // 차트 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chart: any = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#e6edf3",
        fontFamily: '"Noto Sans KR", sans-serif',
      },
      width: containerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: "#30363d",
      },
      grid: {
        horzLines: { color: "#1e2530" },
        vertLines: { color: "#1e2530" },
      },
    });

    chartRef.current = chart;

    // 캔들스틱 시리즈
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    // OHLC 데이터 변환
    const candleData: CandleData[] = data.map((item) => ({
      time: item.date as SeriesDataItemTypeMap["Candlestick"]["time"],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    candleSeries.setData(candleData);

    // 거래량 바 (오버레이)
    const volumeSeries = chart.addHistogramSeries({
      color: "rgba(79, 70, 229, 0.3)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    const volumeData: VolumeData[] = data.map((item) => ({
      time: item.date as SeriesDataItemTypeMap["Histogram"]["time"],
      value: item.volume,
      color:
        item.close >= item.open
          ? "rgba(16, 185, 129, 0.2)"
          : "rgba(239, 68, 68, 0.2)",
    }));

    volumeSeries.setData(volumeData);

    // 이동평균선 계산 및 추가
    const ma20 = calculateMA(data, 20);
    const ma60 = calculateMA(data, 60);
    const ma120 = calculateMA(data, 120);

    // MA20
    if (ma20.length > 0) {
      const ma20Series = chart.addLineSeries({
        color: "#fbbf24",
        lineWidth: 1,
        priceScaleId: "right",
      });
      ma20Series.setData(ma20);
    }

    // MA60
    if (ma60.length > 0) {
      const ma60Series = chart.addLineSeries({
        color: "#818cf8",
        lineWidth: 1,
        priceScaleId: "right",
      });
      ma60Series.setData(ma60);
    }

    // MA120
    if (ma120.length > 0) {
      const ma120Series = chart.addLineSeries({
        color: "#f87171",
        lineWidth: 1,
        priceScaleId: "right",
      });
      ma120Series.setData(ma120);
    }

    // 시간 스케일 자동 조정
    chart.timeScale().fitContent();

    // 윈도우 리사이즈 처리
    const handleResize = () => {
      if (
        containerRef.current &&
        chartRef.current &&
        containerRef.current.clientWidth > 0
      ) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  const calculateMA = (data: HistoricalData[], period: number): MAData[] => {
    const result: MAData[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, item) => acc + item.close, 0);

      result.push({
        time: data[i].date as SeriesDataItemTypeMap["Line"]["time"],
        value: sum / period,
      });
    }

    return result;
  };

  return (
    <div className="bg-dark-bg text-dark-fg rounded-lg border border-dark-border overflow-hidden">
      {/* Header */}
      <div className="bg-dark-surface border-b border-dark-border p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span>{name}</span>
              <span className="text-sm text-dark-muted">({ticker})</span>
            </h3>
            <p className="text-xs text-dark-muted">{exchange}</p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">
              {priceInfo.current.toLocaleString("ko-KR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              className={`text-sm font-semibold ${
                priceInfo.change >= 0 ? "text-status-up" : "text-status-down"
              }`}
            >
              <span>{priceInfo.change >= 0 ? "▲" : "▼"}</span>
              <span className="ml-1">
                {Math.abs(priceInfo.change).toLocaleString("ko-KR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="ml-1">
                ({priceInfo.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["1M", "3M", "6M", "1Y", "3Y"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                period === p
                  ? "bg-indigo-primary text-white"
                  : "bg-dark-bg text-dark-muted hover:bg-dark-surface hover:text-dark-fg"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center h-96 bg-dark-surface rounded">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-indigo-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-dark-muted">차트 로딩 중...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-96 bg-dark-surface rounded border border-status-down/30">
            <div className="text-center">
              <p className="text-status-down mb-2">⚠️ 데이터 로딩 실패</p>
              <p className="text-sm text-dark-muted">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div
            ref={containerRef}
            className="w-full"
            style={{ minHeight: "500px" }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="bg-dark-surface border-t border-dark-border px-4 py-3 flex flex-wrap gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
          <span className="text-dark-muted">MA20 (20일 이동평균)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-400 rounded-sm"></div>
          <span className="text-dark-muted">MA60 (60일 이동평균)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
          <span className="text-dark-muted">MA120 (120일 이동평균)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span className="text-dark-muted">상승</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
          <span className="text-dark-muted">하락</span>
        </div>
      </div>
    </div>
  );
}
