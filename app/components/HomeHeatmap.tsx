"use client";

import dynamic from "next/dynamic";

const SectorHeatmap = dynamic(
  () => import("@/app/components/SectorHeatmap"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-dark-surface border border-dark-border rounded-lg p-8 text-center h-96 flex items-center justify-center">
        <p className="text-dark-muted">히트맵 로딩 중...</p>
      </div>
    ),
  }
);

export default function HomeHeatmap() {
  return <SectorHeatmap />;
}
