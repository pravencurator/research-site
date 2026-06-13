"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

interface CoverageChartClientProps {
  avgReturn: number;
  kospiReturn: number;
  spxReturn: number;
}

export default function CoverageChartClient({
  avgReturn,
  kospiReturn,
  spxReturn,
}: CoverageChartClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
      height: 300,
      timeScale: { visible: false },
    });

    chartRef.current = chart;

    // 더미 시계열 데이터
    const seriesData = [
      { time: "2026-01", value: 100 },
      { time: "2026-02", value: 102 + avgReturn * 0.1 },
      { time: "2026-03", value: 105 + avgReturn * 0.2 },
      { time: "2026-04", value: 108 + avgReturn * 0.3 },
      { time: "2026-05", value: 110 + avgReturn * 0.4 },
      { time: "2026-06", value: 100 + avgReturn },
    ];

    const kospiData = seriesData.map((d) => ({
      time: d.time,
      value: 100 + (kospiReturn * (parseInt(d.time.split("-")[1]) - 1)) / 5,
    }));

    const spxData = seriesData.map((d) => ({
      time: d.time,
      value: 100 + (spxReturn * (parseInt(d.time.split("-")[1]) - 1)) / 5,
    }));

    const coverageSeries = chart.addLineSeries({
      color: "#4f46e5",
      lineWidth: 2,
    });

    const kospiSeries = chart.addLineSeries({
      color: "#6ee7b7",
      lineWidth: 1,
    });

    const spxSeries = chart.addLineSeries({
      color: "#f472b6",
      lineWidth: 1,
    });

    coverageSeries.setData(seriesData as any);
    kospiSeries.setData(kospiData as any);
    spxSeries.setData(spxData as any);

    chart.timeScale().fitContent();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [avgReturn, kospiReturn, spxReturn]);

  return <div ref={containerRef} className="w-full" style={{ minHeight: "300px" }} />;
}
