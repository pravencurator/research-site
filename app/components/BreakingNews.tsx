"use client";

import { useEffect, useState, useCallback } from "react";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  severity: "Critical" | "High" | "Normal";
  source: string;
  publishedAt: string;
  url: string;
  tags: string[];
}

function severityConfig(severity: NewsItem["severity"]) {
  switch (severity) {
    case "Critical":
      return {
        dot: "bg-red-500",
        badge: "bg-red-500/15 text-red-400 border border-red-500/30",
        label: "Critical",
        icon: "🔴",
        borderLeft: "border-l-red-500",
      };
    case "High":
      return {
        dot: "bg-yellow-400",
        badge: "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30",
        label: "High",
        icon: "🟡",
        borderLeft: "border-l-yellow-400",
      };
    default:
      return {
        dot: "bg-green-500",
        badge: "bg-green-500/15 text-green-400 border border-green-500/30",
        label: "Normal",
        icon: "🟢",
        borderLeft: "border-l-green-500",
      };
  }
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const diff = now - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function NewsCardSkeleton() {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg p-4 border-l-4 border-l-dark-border animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-16 h-5 bg-dark-border rounded mt-0.5 shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-dark-border rounded w-3/4"></div>
          <div className="h-3 bg-dark-border rounded w-full"></div>
          <div className="h-3 bg-dark-border rounded w-2/3"></div>
          <div className="flex gap-2 mt-2">
            <div className="h-4 w-16 bg-dark-border rounded"></div>
            <div className="h-4 w-16 bg-dark-border rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const cfg = severityConfig(item.severity);

  return (
    <a
      href={item.url}
      className={`block bg-dark-surface border border-dark-border rounded-lg p-4 border-l-4 ${cfg.borderLeft} hover:border-indigo-primary/40 hover:bg-dark-surface/80 transition-all group`}
    >
      <div className="flex items-start gap-3">
        {/* Severity Badge */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${cfg.badge}`}>
          {cfg.icon} {cfg.label}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-sm font-semibold text-dark-fg group-hover:text-indigo-primary transition-colors leading-snug mb-1">
            {item.title}
          </h3>

          {/* Summary */}
          <p className="text-xs text-dark-muted leading-relaxed line-clamp-2 mb-2">
            {item.summary}
          </p>

          {/* Tags & Meta */}
          <div className="flex flex-wrap items-center gap-2">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs font-mono px-1.5 py-0.5 bg-indigo-primary/10 text-indigo-primary rounded"
              >
                {tag}
              </span>
            ))}
            <span className="text-xs text-dark-border ml-auto shrink-0">
              {item.source} · {formatRelativeTime(item.publishedAt)}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

export default function BreakingNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setNews(json.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "뉴스를 불러오는 데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-fg flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            브레이킹 뉴스
          </h2>
          <p className="text-xs text-dark-muted mt-0.5">
            {lastUpdated
              ? `${lastUpdated.toLocaleTimeString("ko-KR")} 기준`
              : "로딩 중..."}
            <span className="ml-2 text-dark-border">• 5분 자동 갱신</span>
          </p>
        </div>
        <button
          onClick={fetchNews}
          className="text-xs text-indigo-primary hover:text-indigo-hover px-2 py-1 border border-indigo-primary/30 rounded hover:border-indigo-primary/60 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={fetchNews}
            className="ml-auto text-xs underline hover:no-underline"
          >
            재시도
          </button>
        </div>
      )}

      {/* News List */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <NewsCardSkeleton key={i} />)
          : news.map((item) => <NewsCard key={item.id} item={item} />)
        }
      </div>

      {/* Empty State */}
      {!loading && !error && news.length === 0 && (
        <div className="text-center py-12 text-dark-muted">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">현재 주요 뉴스가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
