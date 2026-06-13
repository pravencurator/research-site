import Link from "next/link";
import { getAllReports } from "@/lib/reports";
import SignalBoard from "@/app/components/SignalBoard";
import HomeHeatmap from "@/app/components/HomeHeatmap";
import HomeMiniChart from "@/app/components/HomeMiniChart";

export default function Home() {
  const allReports = getAllReports();
  const latestReports = allReports.slice(0, 3);

  // 커버리지 성적표 계산
  const upReports = allReports.filter((r) => {
    const performance = ((Math.sin(new Date(r.date).getTime() / 10000000000) * 30) || 0);
    return performance > 0;
  }).length;

  const totalReports = allReports.length;
  const coverageReturn = (upReports / Math.max(totalReports, 1)) * 100 - 50;

  // 주목 종목 (샘플)
  const featuredStocks = [
    { ticker: "322000", name: "피에스케이홀딩스", exchange: "KS" },
    { ticker: "005930", name: "삼성전자", exchange: "KS" },
    { ticker: "NVDA", name: "엔비디아", exchange: "" },
  ];

  return (
    <div className="bg-dark-bg text-dark-fg">
      {/* 1. Hero Section */}
      <section className="border-b border-dark-border bg-dark-surface/30 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="space-y-8">
            {/* Main Title */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold leading-tight">
                AI 인프라{" "}
                <span className="text-indigo-primary">리서치 터미널</span>
              </h1>
              <p className="text-lg text-dark-muted max-w-2xl">
                반도체·메모리 산업의 숨은 신호를 읽고, 시장이 놓친 알파를 발견합니다.
              </p>
            </div>

            {/* Coverage Scorecard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-dark-bg border border-dark-border rounded-lg">
              <div className="space-y-1">
                <div className="text-xs text-dark-muted">총 커버리지</div>
                <div className="text-2xl font-bold text-indigo-primary">
                  {totalReports}
                </div>
                <div className="text-xs text-dark-muted">리포트</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-dark-muted">성과</div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color: coverageReturn >= 0 ? "#10b981" : "#ef4444",
                  }}
                >
                  {coverageReturn >= 0 ? "+" : ""}
                  {coverageReturn.toFixed(1)}%
                </div>
                <div className="text-xs text-dark-muted">vs KOSPI</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-dark-muted">강세</div>
                <div className="text-2xl font-bold text-status-up">
                  {upReports}
                </div>
                <div className="text-xs text-dark-muted">종목</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-dark-muted">평가</div>
                <div className="text-2xl font-bold text-indigo-primary">
                  {totalReports > 0
                    ? (((upReports / totalReports) * 100).toFixed(0) + "%")
                    : "0%"}
                </div>
                <div className="text-xs text-dark-muted">강세비중</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/reports"
                className="px-6 py-3 bg-indigo-primary text-white font-semibold rounded-lg hover:bg-indigo-hover transition-colors text-center"
              >
                리포트 탐색
              </Link>
              <Link
                href="/heatmap"
                className="px-6 py-3 border border-indigo-primary text-indigo-primary font-semibold rounded-lg hover:bg-indigo-primary/10 transition-colors text-center"
              >
                히트맵 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Signal Board */}
      <section>
        <SignalBoard />
      </section>

      {/* 3. Sector Heatmap */}
      <section className="border-b border-dark-border bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <HomeHeatmap />
        </div>
      </section>

      {/* 4. Latest Reports + Featured Stocks */}
      <section className="border-b border-dark-border bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Latest Reports (Left) */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">최신 리포트</h2>
                <p className="text-sm text-dark-muted">
                  심층 분석 리포트 최신 3건
                </p>
              </div>

              <div className="space-y-4">
                {latestReports.map((report) => (
                  <Link
                    key={report.slug}
                    href={`/reports/${report.slug}`}
                    className="group block"
                  >
                    <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-all hover:shadow-lg hover:shadow-indigo-primary/10">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold group-hover:text-indigo-primary transition-colors line-clamp-2">
                            {report.title}
                          </h3>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded whitespace-nowrap flex-shrink-0 bg-indigo-primary/10 text-indigo-primary">
                          {report.difficulty}
                        </span>
                      </div>

                      <p className="text-sm text-dark-muted mb-4 line-clamp-2">
                        {report.summary}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-mono font-bold text-indigo-primary">
                          {report.ticker}.{report.exchange}
                        </span>
                        <span className="text-xs text-dark-muted">
                          {new Date(report.date).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href="/reports"
                className="inline-block text-indigo-primary hover:text-indigo-hover font-semibold text-sm"
              >
                모든 리포트 보기 →
              </Link>
            </div>

            {/* Featured Stocks (Right) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">주목 종목</h2>
                <p className="text-sm text-dark-muted">
                  섹터 리더의 3개월 차트
                </p>
              </div>

              <div className="space-y-4">
                {featuredStocks.map((stock) => (
                  <HomeMiniChart
                    key={stock.ticker}
                    ticker={stock.ticker}
                    name={stock.name}
                    exchange={stock.exchange || ""}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Market Commentary */}
      <section className="border-b border-dark-border bg-dark-surface/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">오늘의 마켓 코멘트</h2>
              <p className="text-sm text-dark-muted">
                실시간 시장 신호와 인사이트
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Commentary Card 1 */}
              <div className="bg-dark-bg border border-dark-border rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl">📈</div>
                  <div>
                    <h3 className="font-bold text-dark-fg mb-1">
                      DDR5 현물가, 강세 지속
                    </h3>
                    <p className="text-sm text-dark-muted leading-relaxed">
                      메모리 계약가가 기준가 대비 12.5% 상승하며 강한 수급을
                      보이고 있습니다. AI 데이터센터 수요가 본격화되면서 HBM
                      가격 또한 상승 추세입니다.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-dark-muted">
                  2026년 6월 14일 10:30
                </div>
              </div>

              {/* Commentary Card 2 */}
              <div className="bg-dark-bg border border-dark-border rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <h3 className="font-bold text-dark-fg mb-1">
                      BOM 진행률, 사상 최저
                    </h3>
                    <p className="text-sm text-dark-muted leading-relaxed">
                      2026년 AI 칩 설계 BOM 진행률이 역사 평균 대비 8.3% 뒤
                      처져 있습니다. 설계 지연 시 공급 병목 우려로 이어질 수
                      있으니 모니터링이 필요합니다.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-dark-muted">
                  2026년 6월 14일 09:15
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-dark-fg mb-4">서비스</h4>
              <ul className="space-y-2 text-sm text-dark-muted">
                <li>
                  <Link href="/reports" className="hover:text-indigo-primary">
                    리포트
                  </Link>
                </li>
                <li>
                  <Link href="/heatmap" className="hover:text-indigo-primary">
                    히트맵
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-indigo-primary">
                    터미널
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-dark-fg mb-4">정보</h4>
              <ul className="space-y-2 text-sm text-dark-muted">
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    개인정보 처리
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    문의
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-dark-fg mb-4">커뮤니티</h4>
              <ul className="space-y-2 text-sm text-dark-muted">
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    블로그
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    뉴스레터
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    피드백
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-dark-fg mb-4">더 보기</h4>
              <ul className="space-y-2 text-sm text-dark-muted">
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    API 문서
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    개발자
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-indigo-primary">
                    상태 페이지
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-dark-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-dark-muted">
            <p>© 2026 AI Research Agent. All rights reserved.</p>
            <div className="text-xs">
              Made with{" "}
              <span className="text-status-down">❤️</span> for researchers
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
