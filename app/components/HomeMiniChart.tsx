"use client";

import dynamic from "next/dynamic";

interface HomeMiniChartProps {
  ticker: string;
  name: string;
  exchange: string;
}

const MiniChart = dynamic(
  () => import("@/app/components/MiniChart"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-dark-surface border border-dark-border rounded-lg p-4 h-64 flex items-center justify-center">
        <p className="text-xs text-dark-muted">차트 로딩 중...</p>
      </div>
    ),
  }
);

export default function HomeMiniChart({
  ticker,
  name,
  exchange,
}: HomeMiniChartProps) {
  return (
    <MiniChart ticker={ticker} name={name} exchange={exchange} />
  );
}
