"use client";

import dynamic from "next/dynamic";

interface Heading {
  id: string;
  title: string;
  number: number;
}

interface ReportSidebarProps {
  ticker: string;
  exchange: string;
  companyName: string;
  tags: string[];
  publishDate: string;
  difficulty: string;
  headings?: Heading[];
}

const PriceChart = dynamic(() => import("@/app/components/PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="bg-dark-surface border border-dark-border rounded-lg p-6 text-center h-96 flex items-center justify-center">
      <p className="text-dark-muted">차트 로딩 중...</p>
    </div>
  ),
});

export default function ReportSidebar({
  ticker,
  exchange,
  companyName,
  tags,
  publishDate,
  difficulty,
  headings = [],
}: ReportSidebarProps) {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-32 space-y-6">
        {/* Price Chart */}
        <div>
          <h3 className="text-sm font-semibold text-dark-muted mb-4">
            주가 차트
          </h3>
          <div className="rounded-lg overflow-hidden border border-dark-border">
            <PriceChart
              ticker={`${ticker}.${exchange}`}
              name={companyName}
              exchange={exchange === "KS" ? "KOSPI" : "NASDAQ"}
            />
          </div>
        </div>

        {/* Report Meta */}
        <div className="bg-dark-surface border border-dark-border rounded-lg p-4 text-xs text-dark-muted space-y-3">
          <div>
            <h4 className="font-semibold text-dark-fg mb-2">주요 태그</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-dark-bg px-2 py-1 rounded border border-dark-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-dark-border">
            <p>
              <strong>작성일:</strong> {publishDate}
            </p>
            <p className="mt-1">
              <strong>난이도:</strong> {difficulty}
            </p>
          </div>
        </div>

        {/* Table of Contents */}
        {headings.length > 0 && (
          <div className="bg-dark-surface border border-dark-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-dark-fg mb-4">
              목차
            </h3>
            <nav className="space-y-2">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className="text-xs text-dark-muted hover:text-indigo-primary transition-colors block pl-0 hover:pl-1"
                >
                  {heading.number}. {heading.title}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
