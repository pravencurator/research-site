"use client";

import { useEffect, useRef, useState } from "react";
import { hierarchy, treemap, select, interpolateRgb } from "d3";

interface HeatmapData {
  symbol: string;
  name: string;
  sector: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
}

interface ApiResponse {
  success: boolean;
  data: HeatmapData[];
  timestamp: string;
  error?: string;
  message?: string;
}

export default function SectorHeatmap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // 필터링 상태
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"change" | "marketCap">("change");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/market/heatmap");

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const json: ApiResponse = await res.json();

        if (!json.success || !json.data) {
          throw new Error(json.message || "Failed to fetch data");
        }

        setData(json.data);
        setLastUpdate(new Date(json.timestamp).toLocaleTimeString("ko-KR"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        // 샘플 데이터로 폴백
        setSampleData();
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 5분마다 자동 새로고침
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 필터링된 데이터 계산
  const getFilteredData = () => {
    let filtered = [...data];

    // 섹터 필터
    if (selectedSectors.length > 0) {
      filtered = filtered.filter((item) => selectedSectors.includes(item.sector));
    }

    // 지역 필터
    if (selectedRegions.length > 0) {
      filtered = filtered.filter((item) => selectedRegions.includes(item.region));
    }

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === "change") {
        return b.changePercent - a.changePercent;
      } else {
        return b.marketCap - a.marketCap;
      }
    });

    return filtered;
  };

  const filteredData = getFilteredData();
  const allSectors = Array.from(new Set(data.map((item) => item.sector)));
  const allRegions = Array.from(new Set(data.map((item) => item.region)));

  const toggleSector = (sector: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector]
    );
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  useEffect(() => {
    if (!filteredData.length || !svgRef.current) return;

    drawTreemap();
  }, [filteredData]);

  const setSampleData = () => {
    const sampleData: HeatmapData[] = [
      {
        symbol: "005930.KS",
        name: "삼성전자",
        sector: "반도체",
        region: "한국",
        price: 75000,
        change: 1200,
        changePercent: 1.62,
        marketCap: 450000000000,
      },
      {
        symbol: "NVDA",
        name: "엔비디아",
        sector: "AI칩",
        region: "미국",
        price: 147,
        change: 3.2,
        changePercent: 2.23,
        marketCap: 3600000000000,
      },
      {
        symbol: "000660.KS",
        name: "SK하이닉스",
        sector: "반도체",
        region: "한국",
        price: 185000,
        change: -1500,
        changePercent: -0.81,
        marketCap: 220000000000,
      },
      {
        symbol: "MRVL",
        name: "마벨",
        sector: "AI칩",
        region: "미국",
        price: 85,
        change: 2.5,
        changePercent: 3.03,
        marketCap: 180000000000,
      },
      {
        symbol: "AMAT",
        name: "어플라이드 머터리얼즈",
        sector: "반도체장비",
        region: "미국",
        price: 275,
        change: -4.5,
        changePercent: -1.61,
        marketCap: 310000000000,
      },
      {
        symbol: "322000.KS",
        name: "피에스케이홀딩스",
        sector: "반도체",
        region: "한국",
        price: 95000,
        change: 2800,
        changePercent: 3.05,
        marketCap: 95000000000,
      },
      {
        symbol: "MU",
        name: "마이크론",
        sector: "메모리",
        region: "미국",
        price: 115,
        change: 4.2,
        changePercent: 3.79,
        marketCap: 130000000000,
      },
      {
        symbol: "6857.T",
        name: "어드밴테스트",
        sector: "반도체장비",
        region: "일본",
        price: 78500,
        change: -2100,
        changePercent: -2.61,
        marketCap: 85000000000,
      },
    ];
    setData(sampleData);
  };

  const drawTreemap = () => {
    if (!svgRef.current || !filteredData.length) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 데이터 계층 구조 생성
    const hierarchyData = {
      name: "Market",
      children: filteredData.map((item) => ({
        name: item.name,
        value: Math.max(item.marketCap, 1000000000), // 최소값 보장
        changePercent: item.changePercent,
        symbol: item.symbol,
        sector: item.sector,
        region: item.region,
        price: item.price,
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const root: any = hierarchy(hierarchyData as any)
      .sum((d: any) => d.value)
      .sort((a: any, b: any) => (b.value as number) - (a.value as number));

    // 트리맵 레이아웃
    const treemapLayout = treemap<any>()
      .size([width, height])
      .paddingTop(0)
      .paddingRight(2)
      .paddingBottom(2)
      .paddingLeft(2);

    treemapLayout(root);

    // SVG 초기화
    select(svgRef.current).selectAll("*").remove();

    const svg = select(svgRef.current);

    // 노드 생성
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
      .attr("fill", (d: any) => getColor(d.data.changePercent))
      .attr("stroke", "#30363d")
      .attr("stroke-width", 1)
      .on("mouseenter", function (mouseEvent: MouseEvent, d: any) {
        select(this).attr("stroke-width", 2).attr("stroke", "#4f46e5").attr("opacity", 0.8);

        // 툴팁 표시
        const tooltipText = `
${d.data.name} (${d.data.symbol})
등락률: ${d.data.changePercent.toFixed(2)}%
시가총액: ${formatMarketCap(d.data.value)}`;

        select("body")
          .append("div")
          .attr("class", "d3-tooltip")
          .style("position", "fixed")
          .style("background", "#161b22")
          .style("border", "1px solid #30363d")
          .style("color", "#e6edf3")
          .style("padding", "8px 12px")
          .style("border-radius", "6px")
          .style("font-size", "12px")
          .style("font-weight", "500")
          .style("pointer-events", "none")
          .style("z-index", "9999")
          .style("opacity", "0")
          .html(tooltipText)
          .style("left", mouseEvent.pageX + 10 + "px")
          .style("top", mouseEvent.pageY - 10 + "px");
      })
      .on("mousemove", function (mouseEvent: MouseEvent) {
        select(".d3-tooltip")
          .style("left", mouseEvent.pageX + 10 + "px")
          .style("top", mouseEvent.pageY - 10 + "px");
      })
      .on("mouseleave", function () {
        select(this).attr("stroke-width", 1).attr("stroke", "#30363d").attr("opacity", 1);
        select(".d3-tooltip").remove();
      });

    // 텍스트 그룹
    const textGroup = nodes
      .append("g")
      .attr("class", "text-group")
      .attr("pointer-events", "none");

    // 종목명
    textGroup
      .append("text")
      .attr("class", "ticker-name")
      .attr("x", 6)
      .attr("y", 20)
      .attr("font-size", "13px")
      .attr("font-weight", "600")
      .attr("fill", "#e6edf3")
      .attr("text-anchor", "start")
      .text((d: any) => d.data.symbol.replace(".KS", "").replace(".T", ""))
      .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)");

    // 종목명 (한글)
    textGroup
      .append("text")
      .attr("class", "ticker-label")
      .attr("x", 6)
      .attr("y", 38)
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#8b949e")
      .attr("text-anchor", "start")
      .text((d: any) => d.data.name)
      .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)");

    // 등락률
    textGroup
      .append("text")
      .attr("class", "change-percent")
      .attr("x", 6)
      .attr("y", (d: any) => d.y1 - d.y0 - 8)
      .attr("font-size", "14px")
      .attr("font-weight", "700")
      .attr("fill", (d: any) => getTextColor(d.data.changePercent))
      .attr("text-anchor", "start")
      .text((d: any) => {
        const sign = d.data.changePercent >= 0 ? "+" : "";
        return `${sign}${d.data.changePercent.toFixed(2)}%`;
      })
      .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)");
  };

  const getColor = (changePercent: number): string => {
    // -3% 이하: 빨강, 0%: 흰색, +3% 이상: 초록
    if (changePercent <= -3) return "#da3633";
    if (changePercent >= 3) return "#1a7f17";

    if (changePercent >= 0) {
      // 0%~3%: 흰색→초록
      const ratio = changePercent / 3;
      return interpolateRgb("#2d3236", "#1a7f17")(ratio);
    } else {
      // -3%~0%: 빨강→흰색
      const ratio = (changePercent + 3) / 3;
      return interpolateRgb("#da3633", "#2d3236")(ratio);
    }
  };

  const getTextColor = (changePercent: number): string => {
    return Math.abs(changePercent) > 1.5 ? "#ffffff" : "#e6edf3";
  };

  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value}`;
  };

  return (
    <div className="w-full bg-dark-bg text-dark-fg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface p-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">반도체·AI 섹터 히트맵</h2>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-dark-muted">
            <p>한국, 미국, 일본 주요 기업의 실시간 등락률</p>
            {lastUpdate && (
              <div className="text-xs">
                마지막 업데이트: <span className="text-indigo-primary font-mono">{lastUpdate}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-dark-border bg-dark-surface/50 px-6 py-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-6 text-sm">
            {/* Sectors */}
            <div className="flex-1">
              <label className="text-xs text-dark-muted font-semibold block mb-2">
                섹터
              </label>
              <div className="flex flex-wrap gap-2">
                {allSectors.map((sector) => (
                  <button
                    key={sector}
                    onClick={() => toggleSector(sector)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      selectedSectors.includes(sector)
                        ? "bg-indigo-primary text-white border-indigo-primary"
                        : "bg-dark-bg border-dark-border text-dark-fg hover:border-indigo-primary/50"
                    }`}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div className="flex-1">
              <label className="text-xs text-dark-muted font-semibold block mb-2">
                지역
              </label>
              <div className="flex flex-wrap gap-2">
                {allRegions.map((region) => (
                  <button
                    key={region}
                    onClick={() => toggleRegion(region)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      selectedRegions.includes(region)
                        ? "bg-indigo-primary text-white border-indigo-primary"
                        : "bg-dark-bg border-dark-border text-dark-fg hover:border-indigo-primary/50"
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="text-xs text-dark-muted font-semibold block mb-2">
                정렬
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy("change")}
                  className={`flex-1 px-3 py-1 rounded border text-xs font-medium transition-colors ${
                    sortBy === "change"
                      ? "bg-indigo-primary text-white border-indigo-primary"
                      : "bg-dark-bg border-dark-border text-dark-fg hover:border-indigo-primary/50"
                  }`}
                >
                  등락률순
                </button>
                <button
                  onClick={() => setSortBy("marketCap")}
                  className={`flex-1 px-3 py-1 rounded border text-xs font-medium transition-colors ${
                    sortBy === "marketCap"
                      ? "bg-indigo-primary text-white border-indigo-primary"
                      : "bg-dark-bg border-dark-border text-dark-fg hover:border-indigo-primary/50"
                  }`}
                >
                  시총순
                </button>
              </div>
            </div>
          </div>

          {/* Reset Filters */}
          {(selectedSectors.length > 0 || selectedRegions.length > 0) && (
            <button
              onClick={() => {
                setSelectedSectors([]);
                setSelectedRegions([]);
              }}
              className="text-xs text-indigo-primary hover:text-indigo-hover"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="border-b border-dark-border bg-dark-bg px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: "#da3633" }}
            ></div>
            <span>-3% 이상 하락</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: "#2d3236" }}
            ></div>
            <span>보합 (0%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded"
              style={{ backgroundColor: "#1a7f17" }}
            ></div>
            <span>+3% 이상 상승</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {loading && <LoadingSkeleton />}
          {error && !data.length && (
            <div className="bg-dark-surface border border-danger/30 rounded-lg p-6 text-center">
              <p className="text-danger mb-2">⚠️ 데이터 로딩 실패</p>
              <p className="text-sm text-dark-muted">{error}</p>
              <p className="text-xs text-dark-muted mt-2">샘플 데이터로 표시됩니다</p>
            </div>
          )}

          {filteredData.length > 0 ? (
            <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
              <svg
                ref={svgRef}
                className="w-full"
                style={{ height: "600px", background: "#0d1117" }}
              ></svg>
            </div>
          ) : data.length > 0 ? (
            <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center">
              <p className="text-dark-muted">선택한 필터에 해당하는 종목이 없습니다</p>
            </div>
          ) : null}

          {/* Stats */}
          {filteredData.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "상승",
                  value: filteredData.filter((d) => d.changePercent > 0).length,
                  color: "status-up",
                },
                {
                  label: "하락",
                  value: filteredData.filter((d) => d.changePercent < 0).length,
                  color: "status-down",
                },
                {
                  label: "평균 등락률",
                  value: `${(filteredData.reduce((sum, d) => sum + d.changePercent, 0) / filteredData.length).toFixed(2)}%`,
                  color: "indigo-primary",
                },
                {
                  label: "종목수",
                  value: filteredData.length,
                  color: "muted",
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className={`bg-dark-bg border border-dark-border rounded-lg p-4 text-center`}
                >
                  <div className="text-xs text-dark-muted mb-1">{stat.label}</div>
                  <div
                    className={`text-2xl font-bold text-${stat.color}`}
                    style={{
                      color:
                        stat.color === "status-up"
                          ? "#1a7f17"
                          : stat.color === "status-down"
                            ? "#da3633"
                            : "#4f46e5",
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
        <div className="animate-pulse bg-gradient-to-r from-dark-bg to-dark-surface" style={{ height: "600px" }} />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-dark-surface border border-dark-border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-dark-bg rounded mb-2"></div>
            <div className="h-8 bg-dark-bg rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
