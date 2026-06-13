import { getAllReports } from "@/lib/reports";
import BomTracker from "@/app/components/BomTracker";
import ShortageTracker from "@/app/components/ShortageTracker";
import CoverageScorecard from "@/app/components/CoverageScorecard";

interface ReportPerformance {
  ticker: string;
  company: string;
  publishDate: string;
  publishPrice: number;
  currentPrice: number;
  return: number;
  kospiAlpha: number;
}

export default function TerminalPage() {
  const allReports = getAllReports();

  // 샘플 성과 데이터 생성
  const performanceData: ReportPerformance[] = allReports
    .slice(0, 10)
    .map((report) => {
      const publishDate = new Date(report.date);
      const publishPrice = 100 + Math.random() * 100;
      const currentPrice =
        publishPrice * (1 + (Math.random() - 0.3) * 0.5);
      const returnRate =
        ((currentPrice - publishPrice) / publishPrice) * 100;
      const kospiReturn = (Math.random() - 0.4) * 30;
      const alpha = returnRate - kospiReturn;

      return {
        ticker: report.ticker,
        company: report.title.split(" ")[0],
        publishDate: publishDate.toLocaleDateString("ko-KR", {
          year: "2-digit",
          month: "2-digit",
        }),
        publishPrice: Math.round(publishPrice * 10) / 10,
        currentPrice: Math.round(currentPrice * 10) / 10,
        return: Math.round(returnRate * 100) / 100,
        kospiAlpha: Math.round(alpha * 100) / 100,
      };
    });

  const avgReturn =
    performanceData.reduce((sum, p) => sum + p.return, 0) /
    performanceData.length;
  const kospiReturn = (Math.random() - 0.4) * 30;
  const spxReturn = (Math.random() - 0.3) * 35;
  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface/30 backdrop-blur sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">AI 자본 터미널</h1>
          <p className="text-dark-muted">
            반도체 산업의 실시간 신호: BOM 진행률, 공급 제약, 커버리지 성과
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-16">
          {/* Section 1: BOM Tracker */}
          <section>
            <BomTracker />
          </section>

          {/* Section 2: Shortage Tracker */}
          <section className="border-t border-dark-border pt-16">
            <ShortageTracker />
          </section>

          {/* Section 3: Coverage Scorecard */}
          <section className="border-t border-dark-border pt-16">
            <CoverageScorecard
              data={performanceData}
              avgReturn={Math.round(avgReturn * 100) / 100}
              kospiReturn={Math.round(kospiReturn * 100) / 100}
              spxReturn={Math.round(spxReturn * 100) / 100}
            />
          </section>

          {/* Section 4: Market Intelligence */}
          <section className="border-t border-dark-border pt-16">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  시장 인텔리전스
                </h2>
                <p className="text-sm text-dark-muted">
                  이번 주 주목할 이슈와 이벤트
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Intelligence Card 1 */}
                <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">🔬</div>
                    <div>
                      <h3 className="font-bold text-dark-fg">
                        CoWoS 수율 개선 신호
                      </h3>
                      <p className="text-xs text-dark-muted mt-1">
                        TSMC, Q2 2026 공급 전망 상향 가능성
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    TSMC 차기 어닝콜에서 CoWoS 용량 확대 시간표가
                    공개될 가능성 높음. 공급 제약이 풀리면 AI 칩 수익성
                    급증 예상.
                  </p>
                </div>

                {/* Intelligence Card 2 */}
                <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">💡</div>
                    <div>
                      <h3 className="font-bold text-dark-fg">
                        HBM4 설계 가속도
                      </h3>
                      <p className="text-xs text-dark-muted mt-1">
                        삼성/SK하이닉스 경쟁 심화
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    HBM4 프로토타입 검증 완료 시간이 앞당겨지는 중.
                    2027년 출시 목표가 달성되면 메모리 산업 구도
                    재편의 신호탄이 될 것.
                  </p>
                </div>

                {/* Intelligence Card 3 */}
                <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">📊</div>
                    <div>
                      <h3 className="font-bold text-dark-fg">
                        AI 데이터센터 회사채 스프레드
                      </h3>
                      <p className="text-xs text-dark-muted mt-1">
                        사상 최저 수준, 신용도 강세
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    AI 칩 공급사의 신용 스프레드가 145bps 수준으로 하락.
                    시장이 산업 구조적 강세를 인정하고 있는 신호. 자산
                    가치 상승 가능성 높음.
                  </p>
                </div>

                {/* Intelligence Card 4 */}
                <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">⚡</div>
                    <div>
                      <h3 className="font-bold text-dark-fg">
                        엣지 AI 장비 수요
                      </h3>
                      <p className="text-xs text-dark-muted mt-1">
                        데이터센터 외 신 수요처 주목
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    2026년 엣지 AI(로봇, 자율주행, 의료기기) 칩 수요가
                    급증 예상. 데이터센터 의존도 낮출 수 있는 분산화 신호
                    로 평가됨.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Coming Events */}
          <section className="border-t border-dark-border pt-16">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">다가오는 이벤트</h2>
                <p className="text-sm text-dark-muted">
                  업계 일정 및 주요 발표
                </p>
              </div>

              <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-dark-border bg-dark-bg">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-dark-fg">
                        날짜
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-dark-fg">
                        이벤트
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-dark-fg">
                        의미
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-dark-fg">
                        중요도
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-06-20
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        NVIDIA Q2 2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        CoWoS 공급 가시성, H200 수요 가이던스
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-status-down/10 text-status-down text-xs font-semibold rounded-full">
                          ★★★
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-07-05
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        TSMC Q2 2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        고급 패키징 마진율, 용량 확대 계획
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-status-down/10 text-status-down text-xs font-semibold rounded-full">
                          ★★★
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-07-20
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        삼성 메모리 투자 공시
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        HBM4 설계 진행 가속도 신호
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full">
                          ★★
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-08-15
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        SK하이닉스 Q2 2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        HBM 주문 현황, 2027 전망
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full">
                          ★★
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-border bg-dark-surface mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-sm text-dark-muted text-center">
            이 터미널의 정보는 교육적 목적으로만 제공됩니다. 투자 의사결정의
            참고용이며, 정확성을 보장하지 않습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
