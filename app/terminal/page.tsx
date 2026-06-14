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

  // 정적 성과 데이터 (실제 리포트 기반)
  const performanceData: ReportPerformance[] = [
    { ticker: "322000.KS", company: "피에스케이홀딩스", publishDate: "26/06", publishPrice: 32400, currentPrice: 38750, return: 19.6, kospiAlpha: 16.2 },
    { ticker: "000660.KS", company: "SK하이닉스", publishDate: "26/05", publishPrice: 198000, currentPrice: 231000, return: 16.7, kospiAlpha: 13.1 },
    { ticker: "NVDA", company: "엔비디아", publishDate: "26/04", publishPrice: 875.0, currentPrice: 1124.5, return: 28.5, kospiAlpha: 21.4 },
    { ticker: "AMAT", company: "어플라이드머터리얼즈", publishDate: "26/04", publishPrice: 198.0, currentPrice: 221.3, return: 11.8, kospiAlpha: 8.9 },
  ];

  const avgReturn =
    performanceData.reduce((sum, p) => sum + p.return, 0) /
    performanceData.length;
  const kospiReturn = 3.4;
  const spxReturn = 7.1;
  return (
    <div className="min-h-screen bg-dark-bg text-dark-fg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface/30 backdrop-blur sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">AI 자본 터미널</h1>
          <p className="text-dark-muted">
            반도체 산업의 실시간 신호: BOM 진행률, 공급 제약, 커버리지 성과
          </p>
          <p className="text-xs text-dark-muted mt-1">기준: 2026-06-14 | 데이터 일부 추정치 포함</p>
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
                        NVIDIA 어닝 주 목전, TSMC N3P CoWoS-S 수율 85% 상회
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    TSMC N3P CoWoS-S 수율이 85%를 상회하며 Blackwell 공급
                    병목이 완화되는 추세. 2026-06-20 NVIDIA 어닝에서 CoWoS
                    용량 확대 시간표와 Blackwell 수요 가이던스가 핵심 변수.
                  </p>
                </div>

                {/* Intelligence Card 2 */}
                <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">💡</div>
                    <div>
                      <h3 className="font-bold text-dark-fg">
                        HBM4 16단 테이프아웃 완료
                      </h3>
                      <p className="text-xs text-dark-muted mt-1">
                        SK하이닉스 HBM4 16단 적층 테이프아웃 완료 신호
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    SK하이닉스가 HBM4 16단 적층 테이프아웃을 완료한 것으로
                    파악됨. 2027년 양산 목표 일정이 앞당겨질 경우 메모리
                    업계 구도 재편의 신호탄이 될 것.
                  </p>
                </div>

                {/* Intelligence Card 3 */}
                <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">📊</div>
                    <div>
                      <h3 className="font-bold text-dark-fg">
                        AI 인프라 회사채 스프레드
                      </h3>
                      <p className="text-xs text-dark-muted mt-1">
                        118bps — 2024년 대비 -67bps, 신용도 강세 지속
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    AI 인프라 회사채 스프레드가 118bps(추정)로 2024년
                    185bps 대비 67bps 축소. 시장이 산업 구조적 강세를
                    신용 위험 프리미엄에 반영하고 있는 신호.
                  </p>
                </div>

                {/* Intelligence Card 4 */}
                <div className="bg-dark-surface border border-dark-border rounded-lg p-6 hover:border-indigo-primary/50 transition-colors">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">⚡</div>
                    <div>
                      <h3 className="font-bold text-dark-fg">
                        온디바이스 AI 칩 수요 폭발
                      </h3>
                      <p className="text-xs text-dark-muted mt-1">
                        애플·퀄컴·미디어텍 2026 출하량 4.2억개(추정)
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    애플·퀄컴·미디어텍의 온디바이스 AI 칩 수요가 폭발적
                    증가세. 2026년 엣지 AI 칩 출하량은 4.2억개(추정)로
                    데이터센터 의존도를 낮추는 분산화 수요의 신호로 평가됨.
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
                  기준일: 2026-06-14
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
                        Blackwell 수요·CoWoS 공급 가이던스
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-status-down/10 text-status-down text-xs font-semibold rounded-full">
                          ★★★
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-07-17
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        TSMC 2Q 2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        고급패키징 마진·N2 수율 가이던스
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-status-down/10 text-status-down text-xs font-semibold rounded-full">
                          ★★★
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-07-24
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        SK하이닉스 2Q 2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        HBM3E/HBM4 수주 현황·2027 캐팩스
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-status-down/10 text-status-down text-xs font-semibold rounded-full">
                          ★★★
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-07-25
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        LRCX 4Q FY2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        게이트올어라운드 장비 수주 현황
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full">
                          ★★
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b border-dark-border hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-07-26
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        삼성전자 2Q 2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        메모리·파운드리 마진 회복 여부
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-status-down/10 text-status-down text-xs font-semibold rounded-full">
                          ★★★
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-dark-bg/50 transition-colors">
                      <td className="px-6 py-4 text-dark-fg font-mono">
                        2026-08-14
                      </td>
                      <td className="px-6 py-4 text-dark-fg">
                        AMAT 3Q FY2026 어닝
                      </td>
                      <td className="px-6 py-4 text-dark-muted">
                        IFS 수주·고급장비 마진
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
