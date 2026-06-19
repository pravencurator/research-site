"use client";

import { useEffect, useState, useCallback } from "react";
import type { NewsCluster } from "@/lib/news-clusters";
import type { BriefingAnalysis } from "@/app/api/news/briefing/route";

interface BriefingData {
  success: boolean;
  date: string;
  clusters: NewsCluster[];
  analysis: BriefingAnalysis | null;
  generatedAt: string;
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex gap-2">
        <div className="h-6 w-28 bg-dark-border rounded-full" />
        <div className="h-6 w-24 bg-dark-border rounded-full" />
        <div className="h-6 w-32 bg-dark-border rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-dark-border rounded w-full" />
        <div className="h-4 bg-dark-border rounded w-5/6" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-dark-border rounded w-full" />
        <div className="h-4 bg-dark-border rounded w-4/5" />
        <div className="h-4 bg-dark-border rounded w-3/4" />
      </div>
      <div className="h-4 bg-dark-border rounded w-2/3" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Cluster badge row
// ─────────────────────────────────────────────

function ClusterBadge({ cluster }: { cluster: NewsCluster }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-primary/30 bg-indigo-primary/10 text-xs font-semibold text-indigo-primary">
      <span>{cluster.icon}</span>
      {cluster.label}
      <span className="text-dark-muted font-normal">×{cluster.items.length}</span>
    </span>
  );
}

// ─────────────────────────────────────────────
// Main widget
// ─────────────────────────────────────────────

export default function TodaysRealMessageWidget() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch("/api/news/briefing");
      if (!res.ok) return;
      const json: BriefingData = await res.json();
      if (json.success) setData(json);
    } catch {
      // silent — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
    // Refresh every 30 minutes
    const id = setInterval(fetchBriefing, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchBriefing]);

  // Don't render anything if loading finished and there's nothing to show
  if (!loading && (!data || data.clusters.length === 0)) return null;

  return (
    <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border bg-dark-bg/60">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
          <h3 className="font-bold text-sm text-dark-fg">오늘의 진짜 메시지</h3>
          <span className="text-xs text-dark-muted font-mono border border-dark-border px-1.5 py-0.5 rounded">
            Cross-Asset Beta Cascade
          </span>
        </div>
        {data && (
          <span className="text-xs text-dark-muted">
            {new Date(data.generatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">
        {loading ? (
          <Skeleton />
        ) : data ? (
          <>
            {/* Detected clusters */}
            <div>
              <p className="text-xs text-dark-muted mb-2 font-semibold uppercase tracking-wide">감지된 클러스터</p>
              <div className="flex flex-wrap gap-2">
                {data.clusters.map((c) => (
                  <ClusterBadge key={c.tag} cluster={c} />
                ))}
              </div>
            </div>

            {/* Claude analysis */}
            {data.analysis ? (
              <div className="space-y-4">
                {/* Headline summary */}
                <div className="bg-dark-bg rounded-lg p-4 border border-dark-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-bold text-dark-muted uppercase tracking-wide">📋 헤드라인 요약</span>
                  </div>
                  <p className="text-sm text-dark-fg leading-relaxed">{data.analysis.headlineSummary}</p>
                </div>

                {/* Real message */}
                <div className="bg-indigo-primary/5 rounded-lg p-4 border border-indigo-primary/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-bold text-indigo-primary uppercase tracking-wide">🔍 진짜 메시지</span>
                    <span className="text-xs text-dark-muted">Beta Cascade 분석</span>
                  </div>
                  <p className="text-sm text-dark-fg leading-relaxed">{data.analysis.realMessage}</p>
                </div>

                {/* Conclusion */}
                <div className="bg-amber-500/5 rounded-lg p-4 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">⚡ 결론</span>
                  </div>
                  <p className="text-sm font-semibold text-dark-fg leading-relaxed">{data.analysis.conclusion}</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-dark-muted italic">
                분석 생성 중 (ANTHROPIC_API_KEY 설정 시 자동 활성화)
              </div>
            )}

            {/* Collapsible: clustered headlines */}
            <div>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-indigo-primary hover:text-indigo-hover flex items-center gap-1 transition-colors"
              >
                <span>{expanded ? "▲" : "▼"}</span>
                클러스터 헤드라인 {expanded ? "접기" : "펼치기"}
              </button>

              {expanded && (
                <div className="mt-3 space-y-4">
                  {data.clusters.map((cluster) => (
                    <div key={cluster.tag}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-dark-fg">
                          {cluster.icon} {cluster.label}
                        </span>
                        <span className="text-xs text-dark-muted">— {cluster.chain}</span>
                      </div>
                      <ul className="space-y-1.5 pl-3 border-l-2 border-indigo-primary/20">
                        {cluster.items.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <span
                              className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                                item.severity === "critical"
                                  ? "bg-red-500"
                                  : item.severity === "high"
                                  ? "bg-yellow-400"
                                  : "bg-green-500"
                              }`}
                            />
                            <div className="min-w-0">
                              <a
                                href={item.url}
                                className="text-xs text-dark-fg hover:text-indigo-primary transition-colors leading-snug line-clamp-1"
                              >
                                {item.title}
                              </a>
                              <span className="text-xs text-dark-muted">{item.source}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
