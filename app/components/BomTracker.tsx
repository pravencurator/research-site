"use client";

import { useEffect, useRef, useState } from "react";
import { hierarchy, treemap, select, interpolateRgb } from "d3";

interface BOMSegment {
  name: string;
  industry: string;
  bom: number; // BOM %
  progress: number; // 진행률 %
  ps: number; // P/S ratio
}

interface GenerationData {
  name: string;
  segments: BOMSegment[];
}

const BOM_DATA: GenerationData[] = [
  {
    name: "NVL72",
    segments: [
      {
        name: "NVIDIA Logic",
        industry: "NVIDIA",
        bom: 45,
        progress: 92,
        ps: 8.5,
      },
      { name: "HBM3", industry: "HBM", bom: 25, progress: 68, ps: 3.2 },
      { name: "CoWoS", industry: "CoWoS", bom: 20, progress: 55, ps: 2.8 },
      { name: "광학", industry: "광", bom: 5, progress: 45, ps: 1.5 },
      { name: "냉각", industry: "냉각", bom: 5, progress: 78, ps: 2.1 },
    ],
  },
  {
    name: "NVL144",
    segments: [
      {
        name: "NVIDIA Logic",
        industry: "NVIDIA",
        bom: 38,
        progress: 78,
        ps: 7.2,
      },
      { name: "HBM3E", industry: "HBM", bom: 30, progress: 52, ps: 4.1 },
      { name: "CoWoS-XE", industry: "CoWoS", bom: 18, progress: 38, ps: 3.5 },
      { name: "광학", industry: "광", bom: 7, progress: 28, ps: 2.2 },
      { name: "냉각", industry: "냉각", bom: 7, progress: 62, ps: 2.8 },
    ],
  },
  {
    name: "Vera Rubin",
    segments: [
      {
        name: "NVIDIA Logic",
        industry: "NVIDIA",
        bom: 35,
        progress: 42,
        ps: 6.8,
      },
      {
        name: "HBM4 (prototype)",
        industry: "HBM",
        bom: 32,
        progress: 18,
        ps: 2.9,
      },
      {
        name: "CoWoS-Ultra",
        industry: "CoWoS",
        bom: 20,
        progress: 15,
        ps: 4.2,
      },
      { name: "광학", industry: "광", bom: 8, progress: 8, ps: 2.8 },
      { name: "냉각", industry: "냉각", bom: 5, progress: 35, ps: 3.1 },
    ],
  },
];

function getScoreColor(progress: number, ps: number): string {
  // 진행률 낮음 & P/S 낮음 = 초록 (재평가 룸)
  // 진행률 높음 & P/S 높음 = 빨강 (이미 가격 반영)
  const score = (progress + ps / 10) / 2; // 0~100 범위로 정규화

  if (progress < 40 && ps < 3.5) {
    return "#10b981"; // 초록 - 재평가 기회
  }

  if (score < 30) return "#10b981";
  if (score < 50) return "#f59e0b";
  if (score < 70) return "#f87171";
  return "#ef4444";
}

export default function BomTracker() {
  const [selectedGen, setSelectedGen] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentGen = BOM_DATA[selectedGen];

  useEffect(() => {
    if (!svgRef.current || !currentGen) return;

    drawTreemap();
  }, [selectedGen]);

  const drawTreemap = () => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 데이터 계층 구조
    const hierarchyData = {
      name: currentGen.name,
      children: currentGen.segments.map((seg) => ({
        name: seg.name,
        value: seg.bom,
        progress: seg.progress,
        ps: seg.ps,
        industry: seg.industry,
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root: any = hierarchy(hierarchyData as any)
      .sum((d: any) => d.value)
      .sort((a: any, b: any) => (b.value as number) - (a.value as number));

    const treemapLayout = treemap<any>()
      .size([width, height])
      .paddingTop(2)
      .paddingRight(2)
      .paddingBottom(2)
      .paddingLeft(2);

    treemapLayout(root);

    select(svgRef.current).selectAll("*").remove();

    const svg = select(svgRef.current);

    const nodes = svg
      .selectAll(".node")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    // 배경 사각형
    nodes
      .append("rect")
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("fill", (d: any) =>
        getScoreColor(d.data.progress, d.data.ps)
      )
      .attr("stroke", "#30363d")
      .attr("stroke-width", 1);

    // 텍스트
    const textGroup = nodes
      .append("g")
      .attr("class", "text-group")
      .attr("pointer-events", "none");

    textGroup
      .append("text")
      .attr("x", 4)
      .attr("y", 16)
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#e6edf3")
      .attr("text-anchor", "start")
      .text((d: any) => d.data.name)
      .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)");

    textGroup
      .append("text")
      .attr("x", 4)
      .attr("y", 32)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#8b949e")
      .attr("text-anchor", "start")
      .text((d: any) => `BOM: ${d.data.value}%`)
      .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)");

    textGroup
      .append("text")
      .attr("x", 4)
      .attr("y", 46)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#8b949e")
      .attr("text-anchor", "start")
      .text((d: any) => `진행: ${d.data.progress}%`)
      .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)");

    textGroup
      .append("text")
      .attr("x", 4)
      .attr("y", 60)
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#8b949e")
      .attr("text-anchor", "start")
      .text((d: any) => `P/S: ${d.data.ps.toFixed(1)}x`)
      .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">AI 칩셋 BOM 진행률 추적</h2>
        <p className="text-sm text-dark-muted">
          GPU 세대별 부품 진행률 & P/S 비교. 초록=재평가 기회, 빨강=이미 반영됨
        </p>
      </div>

      {/* Generation Tabs */}
      <div className="flex gap-2">
        {BOM_DATA.map((gen, idx) => (
          <button
            key={gen.name}
            onClick={() => setSelectedGen(idx)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              selectedGen === idx
                ? "bg-indigo-primary text-white"
                : "bg-dark-surface text-dark-fg hover:bg-dark-border"
            }`}
          >
            {gen.name}
          </button>
        ))}
      </div>

      {/* Treemap */}
      <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ height: "500px", background: "#0d1117" }}
        ></svg>
      </div>

      {/* Details Table */}
      <div className="bg-dark-surface border border-dark-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-dark-border bg-dark-bg">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-dark-fg">
                산업
              </th>
              <th className="px-4 py-3 text-right font-semibold text-dark-fg">
                BOM %
              </th>
              <th className="px-4 py-3 text-right font-semibold text-dark-fg">
                진행률
              </th>
              <th className="px-4 py-3 text-right font-semibold text-dark-fg">
                P/S
              </th>
              <th className="px-4 py-3 text-center font-semibold text-dark-fg">
                신호
              </th>
            </tr>
          </thead>
          <tbody>
            {currentGen.segments.map((seg, idx) => {
              const color = getScoreColor(seg.progress, seg.ps);
              return (
                <tr
                  key={idx}
                  className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-4 py-3 text-dark-fg">{seg.name}</td>
                  <td className="px-4 py-3 text-right text-dark-fg font-mono">
                    {seg.bom}%
                  </td>
                  <td className="px-4 py-3 text-right text-dark-fg">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-dark-border rounded overflow-hidden">
                        <div
                          className="h-full bg-indigo-primary transition-all"
                          style={{ width: `${seg.progress}%` }}
                        ></div>
                      </div>
                      <span className="font-mono w-8 text-right">
                        {seg.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-dark-fg font-mono">
                    {seg.ps.toFixed(1)}x
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div
                      className="w-3 h-3 rounded-full mx-auto"
                      style={{ backgroundColor: color }}
                    ></div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-dark-surface/50 border border-dark-border rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-status-up"></div>
          <span className="text-dark-muted">낮은 진행률 & 낮은 P/S</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <span className="text-dark-muted">중간 평가</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-dark-muted">높은 평가</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-status-down"></div>
          <span className="text-dark-muted">매우 높은 P/S</span>
        </div>
      </div>
    </div>
  );
}
