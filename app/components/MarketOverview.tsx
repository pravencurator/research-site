"use client";

import { useEffect, useState, useCallback } from "react";

interface TickerItem {
  symbol: string;
  label: string;
  value: number;
  change: number;
  changePercent: number;
  type: "index" | "fx" | "stock";
}

const FALLBACK: TickerItem[] = [
  { symbol: "^KS11", label: "코스피", value: 2745.32, change: 12.5, changePercent: 0.46, type: "index" },
  { symbol: "^KQ11", label: "코스닥", value: 912.45, change: -3.2, changePercent: -0.35, type: "index" },
  { symbol: "^GSPC", label: "S&P500", value: 5832.04, change: -8.3, changePercent: -0.14, type: "index" },
  { symbol: "^IXIC", label: "NASDAQ", value: 18925.68, change: 45.2, changePercent: 0.24, type: "index" },
  { symbol: "KRW=X", label: "USD/KRW", value: 1298.45, change: -2.1, changePercent: -0.16, type: "fx" },
  { symbol: "NVDA", label: "엔비디아", value: 147.23, change: -1.2, changePercent: -0.81, type: "stock" },
  { symbol: "AMD", label: "AMD", value: 165.80, change: 2.3, changePercent: 1.41, type: "stock" },
  { symbol: "MRVL", label: "마벨", value: 98.45, change: 1.8, changePercent: 1.86, type: "stock" },
  { symbol: "MU", label: "마이크론", value: 112.30, change: -0.9, changePercent: -0.79, type: "stock" },
  { symbol: "AMAT", label: "AMAT", value: 198.65, change: 3.2, changePercent: 1.64, type: "stock" },
];

function SkeletonCard() {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg p-4 animate-pulse">
      <div className="h-3 w-16 bg-dark-border rounded mb-3"></div>
      <div className="h-6 w-24 bg-dark-border rounded mb-2"></div>
      <div className="h-3 w-12 bg-dark-border rounded"></div>
    </div>
  );
}

function TickerCard({ item }: { item: TickerItem }) {
  const isUp = item.changePercent >= 0;
  const upColor = "#10b981";
  const downColor = "#ef4444";
  const color = isUp ? upColor : downColor;

  const formatValue = (val: number, type: string) => {
    if (type === "fx") {
      return val.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (type === "index") {
      return val.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-indigo-primary/50 transition-all group cursor-default">
      <div className="text-xs text-dark-muted mb-1 group-hover:text-indigo-primary transition-colors font-mono">
        {item.label}
      </div>
      <div className="text-lg font-bold text-dark-fg mb-1">
        {formatValue(item.value, item.type)}
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color }}>
        <span>{isUp ? "▲" : "▼"}</span>
        <span>{Math.abs(item.changePercent).toFixed(2)}%</span>
        <span className="text-dark-muted font-normal">
          ({isUp ? "+" : ""}{item.change.toFixed(2)})
        </span>
      </div>
    </div>
  );
}

export default function MarketOverview() {
  const [data, setData] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/market/ticker", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
        setLastUpdated(new Date());
        setError(false);
      } else {
        throw new Error("bad response");
      }
    } catch {
      setData(FALLBACK);
      setError(true);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const indices = data.filter((d) => d.type === "index" || d.type === "fx");
  const stocks = data.filter((d) => d.type === "stock");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-fg">마켓 오버뷰</h2>
          <p className="text-xs text-dark-muted mt-0.5">
            {error && <span className="text-yellow-500 mr-2">샘플 데이터</span>}
            {lastUpdated ? `${lastUpdated.toLocaleTimeString("ko-KR")} 기준` : "로딩 중..."}
            <span className="ml-2 text-dark-border">• 30초 자동 갱신</span>
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs text-indigo-primary hover:text-indigo-hover px-2 py-1 border border-indigo-primary/30 rounded hover:border-indigo-primary/60 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Index & FX Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {indices.map((item) => (
            <TickerCard key={item.symbol} item={item} />
          ))}
        </div>
      )}

      {/* AI Chip Stocks */}
      <div>
        <div className="text-xs text-dark-muted mb-2 font-semibold uppercase tracking-wide">
          주요 AI칩 / 반도체
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stocks.map((item) => (
              <TickerCard key={item.symbol} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
