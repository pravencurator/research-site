"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  groupStocks,
  THEME_DEFS,
  AUX_BUCKETS,
  type ScreenerStock,
  type ScreenerGroup,
} from "@/lib/screener-grouping";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ApiStock {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  high52Week: number;
  low52Week: number;
  changePercent: number;
  marketCapT: number;
  isBreakthrough: boolean;
  proximityPct: number;
}

type FilterMode = "전체" | "돌파" | "근접";
type MarketMode = "전체" | "KOSPI" | "KOSDAQ";
type SortKey = "proximity" | "change";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function fmt(n: number, dec = 2) {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtPrice(n: number) {
  return n.toLocaleString("ko-KR");
}

function fmtCap(t: number) {
  if (t >= 1) return `${fmt(t, 1)}조`;
  if (t > 0) return `${Math.round(t * 10000).toLocaleString()}억`;
  return "-";
}

function todayKST() {
  const d = new Date();
  return d.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-dark-surface rounded-xl border border-dark-border" />
      <div className="h-12 bg-dark-surface rounded-lg border border-dark-border" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-dark-surface rounded-lg border border-dark-border" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Briefing Card (Telegram 포스트 스타일)
// ─────────────────────────────────────────────

function BriefingCard({ groups, date }: { groups: ScreenerGroup[]; date: string }) {
  const total = groups.reduce((s, g) => s + g.stocks.length, 0);
  const breakthroughs = groups.flatMap((g) => g.stocks).filter((s) => s.isBreakthrough).length;

  return (
    <div className="bg-dark-surface border border-amber-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-transparent border-b border-amber-500/20 px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-black text-amber-400">📊</span>
            <h2 className="font-bold text-dark-fg">오늘의 신고가 브리핑</h2>
          </div>
          <p className="text-xs text-dark-muted">{date}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-black text-amber-400">{total}</div>
          <div className="text-xs text-dark-muted">종목</div>
          {breakthroughs > 0 && (
            <div className="text-xs text-green-400 mt-0.5">★{breakthroughs} 돌파</div>
          )}
        </div>
      </div>

      {/* Telegram-style body */}
      <div className="px-5 py-4 space-y-1.5 font-mono text-sm">
        {groups.length === 0 ? (
          <p className="text-dark-muted text-xs">신고가 근접 종목이 없습니다.</p>
        ) : (
          groups.map((g) => {
            if (g.stocks.length === 0) return null;
            const names = g.stocks
              .map((s) => `${s.name}${s.isBreakthrough ? "★" : ""}`)
              .join(", ");
            return (
              <p key={g.id} className="leading-relaxed text-dark-fg">
                <span className="text-dark-muted">({g.icon} {g.label})</span>{" "}
                {names}
              </p>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Filter Bar
// ─────────────────────────────────────────────

function ToggleGroup<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-dark-bg border border-dark-border rounded-lg p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            value === o.value
              ? "bg-indigo-primary text-white"
              : "text-dark-muted hover:text-dark-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Desktop Table Row
// ─────────────────────────────────────────────

function TableRow({ stock }: { stock: ScreenerStock & { groupLabel: string; groupIcon: string } }) {
  const proximityColor =
    stock.proximityPct >= 0
      ? "text-green-400"
      : stock.proximityPct >= -2
      ? "text-amber-400"
      : "text-dark-muted";

  const changeColor =
    stock.changePercent >= 0 ? "text-green-400" : "text-red-400";

  return (
    <tr className="border-b border-dark-border hover:bg-dark-surface/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {stock.isBreakthrough && (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold">★돌파</span>
          )}
          <div>
            <div className="font-semibold text-sm text-dark-fg">{stock.name}</div>
            <div className="text-xs text-dark-muted font-mono">{stock.symbol.replace(".KS", "")}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-mono text-sm">{fmtPrice(stock.currentPrice)}원</div>
      </td>
      <td className="px-4 py-3 text-right text-xs text-dark-muted font-mono">
        {fmtPrice(stock.high52Week)}원
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`font-mono font-bold text-sm ${proximityColor}`}>
          {stock.proximityPct >= 0 ? "+" : ""}{fmt(stock.proximityPct)}%
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`font-mono text-sm ${changeColor}`}>
          {stock.changePercent >= 0 ? "▲" : "▼"}{Math.abs(stock.changePercent).toFixed(2)}%
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs text-dark-muted">
        {fmtCap(stock.marketCapT)}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-primary/10 border border-indigo-primary/20 text-xs text-indigo-primary">
          {stock.groupIcon} {stock.groupLabel}
        </span>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Mobile Card
// ─────────────────────────────────────────────

function MobileCard({ stock }: { stock: ScreenerStock & { groupLabel: string; groupIcon: string } }) {
  const proximityColor =
    stock.proximityPct >= 0
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : stock.proximityPct >= -2
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-dark-muted border-dark-border bg-dark-bg";

  const changeColor = stock.changePercent >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-indigo-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {stock.isBreakthrough && (
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-1 py-0.5 rounded font-bold">★</span>
            )}
            <span className="font-bold text-dark-fg">{stock.name}</span>
          </div>
          <span className="text-xs font-mono text-dark-muted">{stock.symbol.replace(".KS", "")}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${proximityColor}`}>
          {stock.proximityPct >= 0 ? "+" : ""}{fmt(stock.proximityPct)}%
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-dark-muted mb-0.5">현재가</div>
          <div className="font-mono font-semibold">{fmtPrice(stock.currentPrice)}</div>
        </div>
        <div>
          <div className="text-dark-muted mb-0.5">52주고가</div>
          <div className="font-mono text-dark-muted">{fmtPrice(stock.high52Week)}</div>
        </div>
        <div>
          <div className="text-dark-muted mb-0.5">등락률</div>
          <div className={`font-mono font-semibold ${changeColor}`}>
            {stock.changePercent >= 0 ? "▲" : "▼"}{Math.abs(stock.changePercent).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-dark-muted">{fmtCap(stock.marketCapT)}</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-primary/10 border border-indigo-primary/20 text-xs text-indigo-primary">
          {stock.groupIcon} {stock.groupLabel}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function ScreenerPage() {
  const [rawStocks, setRawStocks] = useState<ApiStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterMode, setFilterMode] = useState<FilterMode>("전체");
  const [proximityThreshold, setProximityThreshold] = useState(5);
  const [marketMode, setMarketMode] = useState<MarketMode>("전체");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("proximity");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/market/new-highs", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Expand proximity filter — fetch all that are within 10% to have enough data
        setRawStocks(json.data);
        setLastFetched(new Date());
        setError(null);
      } else throw new Error("Invalid response");
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로딩 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Group all stocks (for briefing card, unfiltered)
  const allGroups = useMemo(
    () => groupStocks(rawStocks as ScreenerStock[]),
    [rawStocks]
  );

  // ── Apply filters
  const filteredStocks = useMemo(() => {
    let result = [...rawStocks] as ScreenerStock[];

    // Type filter
    if (filterMode === "돌파") {
      result = result.filter((s) => s.isBreakthrough);
    } else if (filterMode === "근접") {
      result = result.filter((s) => s.proximityPct >= -(proximityThreshold));
    }

    // Market filter (KOSPI/KOSDAQ distinction TBD from krx-universe)
    // For now, all watchlist stocks are KOSPI
    if (marketMode === "KOSDAQ") {
      result = []; // KOSDAQ data requires fetch-krx + cron
    }

    return result;
  }, [rawStocks, filterMode, proximityThreshold, marketMode]);

  // ── Group filtered stocks
  const filteredGroups = useMemo(
    () => groupStocks(filteredStocks),
    [filteredStocks]
  );

  // ── Apply group filter
  const displayGroups = useMemo(() => {
    if (selectedGroups.size === 0) return filteredGroups;
    return filteredGroups.filter((g) => selectedGroups.has(g.id));
  }, [filteredGroups, selectedGroups]);

  // ── Sort and flatten for table/card view
  const flatStocks = useMemo(() => {
    const all = displayGroups.flatMap((g) =>
      g.stocks.map((s) => ({ ...s, groupLabel: g.label, groupIcon: g.icon }))
    );
    if (sortKey === "proximity") {
      return [...all].sort((a, b) => b.proximityPct - a.proximityPct);
    }
    return [...all].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }, [displayGroups, sortKey]);

  const allGroupOptions = useMemo(() => {
    return [
      ...THEME_DEFS.map((t) => ({ id: t.id, label: t.title, icon: t.icon })),
      ...AUX_BUCKETS.map((b) => ({ id: b.id, label: b.label, icon: b.icon })),
    ];
  }, []);

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const date = todayKST();

  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              🚀 신고가 스크리너
            </h1>
            <p className="text-xs text-dark-muted mt-1">
              52주 신고가 갱신·근접 종목 실시간 모니터링
              {lastFetched && (
                <span className="ml-2">
                  · {lastFetched.toLocaleTimeString("ko-KR")} 기준
                </span>
              )}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="shrink-0 text-xs px-3 py-1.5 border border-indigo-primary/30 text-indigo-primary rounded-lg hover:border-indigo-primary/60 transition-colors"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-400 text-sm">
            ⚠️ {error}
          </div>
        ) : (
          <>
            {/* ── Briefing Card */}
            <BriefingCard groups={allGroups} date={date} />

            {/* ── Filter Bar */}
            <div className="bg-dark-surface border border-dark-border rounded-xl p-4 space-y-4">
              {/* Row 1: type + market + sort */}
              <div className="flex flex-wrap gap-3 items-center">
                <ToggleGroup
                  value={filterMode}
                  options={[
                    { label: "전체", value: "전체" },
                    { label: "신고가 돌파★", value: "돌파" },
                    { label: "신고가 근접", value: "근접" },
                  ]}
                  onChange={setFilterMode}
                />

                {filterMode === "근접" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-muted">근접범위</span>
                    <input
                      type="range"
                      min={1} max={20} step={1}
                      value={proximityThreshold}
                      onChange={(e) => setProximityThreshold(Number(e.target.value))}
                      className="w-24 accent-indigo-primary"
                    />
                    <span className="text-xs font-mono text-indigo-primary w-8">{proximityThreshold}%</span>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-dark-muted">정렬</span>
                  <ToggleGroup
                    value={sortKey}
                    options={[
                      { label: "거리순", value: "proximity" },
                      { label: "등락순", value: "change" },
                    ]}
                    onChange={setSortKey}
                  />
                </div>
              </div>

              {/* Row 2: market toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-muted shrink-0">시장</span>
                <ToggleGroup
                  value={marketMode}
                  options={[
                    { label: "전체", value: "전체" },
                    { label: "KOSPI", value: "KOSPI" },
                    { label: "KOSDAQ", value: "KOSDAQ" },
                  ]}
                  onChange={setMarketMode}
                />
                {marketMode === "KOSDAQ" && (
                  <span className="text-xs text-amber-400">※ KOSDAQ 데이터는 npm run fetch-krx 실행 후 활성화</span>
                )}
              </div>

              {/* Row 3: theme chips */}
              <div>
                <p className="text-xs text-dark-muted mb-2">
                  테마 필터 {selectedGroups.size > 0 && <span className="text-indigo-primary">({selectedGroups.size}개 선택)</span>}
                  {selectedGroups.size > 0 && (
                    <button onClick={() => setSelectedGroups(new Set())} className="ml-2 text-dark-border hover:text-dark-muted text-xs">초기화</button>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allGroupOptions.map((g) => {
                    const count = filteredGroups.find((fg) => fg.id === g.id)?.stocks.length ?? 0;
                    const active = selectedGroups.has(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGroup(g.id)}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                          active
                            ? "bg-indigo-primary text-white border-indigo-primary"
                            : count > 0
                            ? "border-dark-border text-dark-fg hover:border-indigo-primary/50"
                            : "border-dark-border/30 text-dark-muted/40 cursor-default"
                        }`}
                        disabled={count === 0}
                      >
                        {g.icon} {g.label}
                        {count > 0 && (
                          <span className={`font-bold ${active ? "text-white/80" : "text-indigo-primary"}`}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Result count */}
            <div className="flex items-center justify-between text-xs text-dark-muted">
              <span>{flatStocks.length}종목</span>
              <span className="text-dark-border">※ 가격은 Yahoo Finance 기준 · 30분 캐시</span>
            </div>

            {/* ── Desktop: Table */}
            <div className="hidden md:block">
              {flatStocks.length === 0 ? (
                <div className="bg-dark-surface border border-dark-border rounded-xl p-12 text-center text-dark-muted">
                  조건에 맞는 종목이 없습니다.
                </div>
              ) : (
                <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-border text-xs text-dark-muted bg-dark-bg/60">
                        <th className="px-4 py-3 text-left font-semibold">종목</th>
                        <th className="px-4 py-3 text-right font-semibold">현재가</th>
                        <th className="px-4 py-3 text-right font-semibold">52주 고가</th>
                        <th className="px-4 py-3 text-right font-semibold">
                          <button onClick={() => setSortKey("proximity")} className={`hover:text-indigo-primary transition-colors ${sortKey === "proximity" ? "text-indigo-primary" : ""}`}>
                            거리 {sortKey === "proximity" ? "▲" : ""}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          <button onClick={() => setSortKey("change")} className={`hover:text-indigo-primary transition-colors ${sortKey === "change" ? "text-indigo-primary" : ""}`}>
                            등락 {sortKey === "change" ? "▼" : ""}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">시총</th>
                        <th className="px-4 py-3 text-left font-semibold">테마</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatStocks.map((s) => (
                        <TableRow key={s.symbol} stock={s} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {flatStocks.length === 0 ? (
                <div className="bg-dark-surface border border-dark-border rounded-xl p-10 text-center text-dark-muted text-sm">
                  조건에 맞는 종목이 없습니다.
                </div>
              ) : (
                flatStocks.map((s) => <MobileCard key={s.symbol} stock={s} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
