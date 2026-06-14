"use client";

import { useEffect, useState } from "react";

interface NewHighStock {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  currentPrice: number;
  high52Week: number;
  low52Week: number;
  changePercent: number;
  marketCapT: number;
  isBreakthrough: boolean;
  proximityPct: number;
}

interface ApiResponse {
  success: boolean;
  data: NewHighStock[];
  note?: string;
  timestamp?: string;
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 p-4 border-b border-dark-border animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-dark-border rounded w-1/3" />
        <div className="h-3 bg-dark-border rounded w-2/3" />
        <div className="h-3 bg-dark-border rounded w-1/2" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-4 bg-dark-border rounded w-20" />
        <div className="h-3 bg-dark-border rounded w-16" />
      </div>
    </div>
  );
}

function SectorBadge({ sector }: { sector: string }) {
  const colorMap: Record<string, string> = {
    반도체: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "2차전지": "bg-green-500/15 text-green-400 border-green-500/30",
    바이오: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    방산: "bg-red-500/15 text-red-400 border-red-500/30",
    "IT/플랫폼": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    자동차: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    금융: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    "화학/소재": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  };
  const cls =
    colorMap[sector] ?? "bg-dark-border/50 text-dark-muted border-dark-border";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}
    >
      {sector}
    </span>
  );
}

function HighBadge({
  isBreakthrough,
  proximityPct,
}: {
  isBreakthrough: boolean;
  proximityPct: number;
}) {
  if (isBreakthrough) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
        🚀 신고가 돌파
      </span>
    );
  }
  if (proximityPct >= -2 && proximityPct < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
        ⚡ 신고가 근접
      </span>
    );
  }
  return null;
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("ko-KR") + "원";
  }
  return price.toFixed(2);
}

function formatMarketCap(capB: number): string {
  if (capB <= 0) return "-";
  if (capB >= 1) return capB.toFixed(1) + "조";
  return (capB * 1000).toFixed(0) + "억";
}

export default function NewHighsWidget() {
  const [stocks, setStocks] = useState<NewHighStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | undefined>(undefined);
  const [timestamp, setTimestamp] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/market/new-highs");
        if (!res.ok) throw new Error("fetch failed");
        const json: ApiResponse = await res.json();
        if (!cancelled) {
          setStocks((json.data ?? []).slice(0, 10));
          setNote(json.note);
          setTimestamp(json.timestamp);
        }
      } catch {
        if (!cancelled) {
          setNote("데이터 로딩 실패");
          setStocks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
      {/* Widget header */}
      <div className="px-6 py-4 border-b border-dark-border bg-dark-bg/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-dark-fg text-sm">
            52주 신고가 추적
          </h3>
          <p className="text-xs text-dark-muted mt-0.5">
            현재가 ≥ 52주 고가 × 98% 기준
          </p>
        </div>
        {timestamp && (
          <span className="text-xs text-dark-muted font-mono">
            {new Date(timestamp).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-dark-muted text-sm">
            {note ?? "현재 신고가 근접 종목 없음"}
          </p>
        </div>
      ) : (
        <div>
          {stocks.map((stock, idx) => {
            const descLines = stock.description.split("\n");
            const isPositive = stock.changePercent >= 0;
            return (
              <div
                key={stock.symbol}
                className={`px-6 py-4 flex items-start gap-4 hover:bg-dark-bg/40 transition-colors ${
                  idx < stocks.length - 1 ? "border-b border-dark-border" : ""
                }`}
              >
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="font-semibold text-dark-fg text-sm">
                      {stock.name}
                    </span>
                    <span className="text-xs text-dark-muted font-mono">
                      {stock.symbol.replace(".KS", "")}
                    </span>
                    <SectorBadge sector={stock.sector} />
                    <HighBadge
                      isBreakthrough={stock.isBreakthrough}
                      proximityPct={stock.proximityPct}
                    />
                  </div>
                  <p className="text-xs text-dark-muted leading-relaxed line-clamp-2">
                    {descLines[0]}
                  </p>
                  {descLines[1] && (
                    <p className="text-xs text-dark-muted leading-relaxed mt-0.5">
                      {descLines[1]}
                    </p>
                  )}
                </div>

                {/* Right: price data */}
                <div className="text-right shrink-0 space-y-1">
                  <div className="font-mono text-sm font-semibold text-dark-fg">
                    {formatPrice(stock.currentPrice)}
                  </div>
                  <div
                    className={`text-xs font-mono font-medium ${
                      isPositive ? "text-status-up" : "text-status-down"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {stock.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-dark-muted">
                    52W 고가: {formatPrice(stock.high52Week)}
                  </div>
                  {stock.marketCapT > 0 && (
                    <div className="text-xs text-dark-muted">
                      시총 {formatMarketCap(stock.marketCapT)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
