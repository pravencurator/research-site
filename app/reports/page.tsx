import Link from "next/link";
import { getAllReports, getDifficultyColor, getDifficultyBgColor, getReportPerformance } from "@/lib/reports";

const SECTORS = ["전체", "반도체", "장비", "메모리", "소재", "에너지"];

export default function ReportsPage() {
  const allReports = getAllReports();
  const selectedSector = "전체";

  const filteredReports =
    selectedSector === "전체"
      ? allReports
      : allReports.filter((r) => r.sector === selectedSector);

  // 커버리지 성적표 계산 (샘플)
  const totalReports = allReports.length;
  const upReports = allReports.filter(
    (r) => getReportPerformance(r.ticker, r.date).status === "상승"
  ).length;
  const downReports = totalReports - upReports;
  const winRate = ((upReports / totalReports) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">투자 리포트</h1>
          <p className="text-dark-muted">AI 인프라와 반도체 시장의 깊이 있는 분석</p>
        </div>
      </div>

      {/* Coverage Performance Banner */}
      <div className="border-b border-dark-border bg-dark-surface/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-primary">
                {totalReports}
              </div>
              <div className="text-xs text-dark-muted">총 리포트</div>
            </div>
            <div>
              <div
                className="text-2xl font-bold"
                style={{ color: "#10b981" }}
              >
                {upReports}
              </div>
              <div className="text-xs text-dark-muted">강세 평가</div>
            </div>
            <div>
              <div
                className="text-2xl font-bold"
                style={{ color: "#ef4444" }}
              >
                {downReports}
              </div>
              <div className="text-xs text-dark-muted">약세 평가</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-primary">
                {winRate}%
              </div>
              <div className="text-xs text-dark-muted">강세 비중</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Sector Filter Tabs */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {SECTORS.map((sector) => (
            <div
              key={sector}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                selectedSector === sector
                  ? "bg-indigo-primary text-white"
                  : "bg-dark-surface text-dark-fg"
              }`}
            >
              {sector}
              {sector !== "전체" && (
                <span className="ml-2 text-xs opacity-70">
                  ({allReports.filter((r) => r.sector === sector).length})
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Reports Grid */}
        {filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const performance = getReportPerformance(report.ticker, report.date);
              const publishDate = new Date(report.date);
              const formattedDate = publishDate.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              return (
                <Link
                  key={report.slug}
                  href={`/reports/${report.slug}`}
                  className="group"
                >
                  <div className="h-full bg-dark-surface border border-dark-border rounded-lg overflow-hidden hover:border-indigo-primary/50 hover:shadow-lg hover:shadow-indigo-primary/10 transition-all">
                    {/* Card Header with Performance */}
                    <div className="border-b border-dark-border p-4">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-base leading-tight group-hover:text-indigo-primary transition-colors line-clamp-3">
                            {report.title}
                          </h3>
                        </div>
                        <div
                          className={`${getDifficultyBgColor(report.difficulty)} text-xs font-semibold px-2 py-1 rounded whitespace-nowrap flex-shrink-0`}
                          style={{
                            color: getDifficultyColor(report.difficulty),
                          }}
                        >
                          {report.difficulty}
                        </div>
                      </div>

                      {/* Ticker and Performance */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-mono font-bold text-indigo-primary">
                          {report.ticker}.{report.exchange}
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color:
                              performance.status === "상승"
                                ? "#10b981"
                                : performance.status === "하락"
                                  ? "#ef4444"
                                  : "#8b949e",
                          }}
                        >
                          {performance.status}:{" "}
                          {performance.return > 0 ? "+" : ""}
                          {performance.return.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-4">
                      {/* Summary */}
                      <p className="text-sm text-dark-muted leading-relaxed line-clamp-2">
                        {report.summary}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-dark-muted">
                        <span>{report.sector}</span>
                        <span>{formattedDate}</span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {report.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="bg-dark-bg border border-dark-border text-xs px-2 py-1 rounded text-dark-muted hover:border-indigo-primary/50 transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                        {report.tags.length > 3 && (
                          <span className="text-xs text-dark-muted py-1">
                            +{report.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-dark-border px-4 py-3 bg-dark-bg/50">
                      <span className="text-xs text-indigo-primary font-semibold group-hover:underline">
                        리포트 보기 →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-dark-muted mb-2">리포트가 없습니다.</p>
            <Link
              href="/reports"
              className="text-indigo-primary hover:text-indigo-hover font-semibold text-sm"
            >
              새로고침
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
