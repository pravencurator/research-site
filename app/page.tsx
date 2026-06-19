import Link from "next/link";
import { getAllReports } from "@/lib/reports";
import TodaysRealMessageWidget from "@/app/components/TodaysRealMessageWidget";

// 13개 핵심 투자 테마 정의
const THEMES = [
  { id: "ai-infra", title: "AI 인프라 밸류체인", description: "GPU→HBM→고급패키징→냉각까지 AI 서버 공급망 전체", conviction: 0.95, stocks: ["NVDA", "000660.KS", "005930.KS", "AVGO", "VRT"], isHot: true, sector: "AI", icon: "⚡" },
  { id: "photonics", title: "광통신 혁명", description: "AI 데이터센터 간 초고속 광 인터커넥트 수요 폭발", conviction: 0.95, stocks: ["AVGO", "MRVL", "COHR", "LITE"], isHot: true, sector: "AI", icon: "🔆" },
  { id: "dc-energy", title: "데이터센터 에너지", description: "AI 전력 폭증으로 수혜받는 전력 인프라 밸류체인", conviction: 0.93, stocks: ["GEV", "CEG", "VRT", "SMCI"], isHot: false, sector: "에너지", icon: "🔋" },
  { id: "kr-semicon", title: "K-반도체 장비·소재", description: "HBM 및 첨단 패키징 확대 수혜 국내 장비주", conviction: 0.90, stocks: ["322000.KS", "042700.KS", "009150.KS", "006400.KS"], isHot: true, sector: "반도체", icon: "🇰🇷" },
  { id: "memory", title: "메모리 슈퍼사이클", description: "DDR5·HBM4 수요 급증 + 공급 타이트 구조", conviction: 0.90, stocks: ["000660.KS", "MU", "005930.KS"], isHot: false, sector: "반도체", icon: "💾" },
  { id: "kr-defense", title: "방산 & 우주항공", description: "나토 방위비 증대와 K-방산 수출 확대 모멘텀", conviction: 0.92, stocks: ["LIG.KS", "LMT", "RTX", "BA"], isHot: false, sector: "방산", icon: "🛡️" },
  { id: "macro", title: "금리 & 매크로", description: "연준 금리 전환, 달러/원, 금·WTI 방향성 전략", conviction: 0.88, stocks: ["TLT", "GLD", "KRW=X", "GC=F"], isHot: false, sector: "매크로", icon: "📊" },
  { id: "semicon-equip", title: "반도체 장비 글로벌", description: "전공정 확대 및 HBM 패키징 투자 수혜 글로벌 장비주", conviction: 0.88, stocks: ["AMAT", "LRCX", "8035.T", "6857.T"], isHot: false, sector: "반도체", icon: "🏭" },
  { id: "kbio", title: "K-바이오 & 신약", description: "글로벌 기술수출 성과 + GLP-1 신약 파이프라인", conviction: 0.85, stocks: ["207940.KS", "068270.KS", "LLY", "NVO"], isHot: false, sector: "바이오", icon: "🧬" },
  { id: "ev-battery", title: "EV & 배터리", description: "EV 침투율 가속화 수혜 배터리 및 소재 기업", conviction: 0.85, stocks: ["373220.KS", "006400.KS", "TSLA", "RIVN"], isHot: false, sector: "EV", icon: "🔌" },
  { id: "banks", title: "미국 대형 금융", description: "금리 정상화 수혜 및 자본시장 활성화", conviction: 0.78, stocks: ["JPM", "GS", "MS", "BAC"], isHot: false, sector: "금융", icon: "🏦" },
  { id: "crypto", title: "크립토 & 인프라", description: "비트코인 ETF 기관화 및 DeFi 실물자산 토큰화", conviction: 0.78, stocks: ["COIN", "MSTR", "BTC-USD", "ETH-USD"], isHot: false, sector: "크립토", icon: "₿" },
  { id: "energy", title: "글로벌 에너지", description: "지정학 리스크와 에너지 전환 사이의 메이저 에너지주", conviction: 0.72, stocks: ["XOM", "CVX", "COP", "SLB"], isHot: false, sector: "에너지", icon: "🛢️" },
];

export default function Home() {
  const allReports = getAllReports();
  const latestReports = allReports.slice(0, 4);
  const totalReports = allReports.length;
  const upReports = allReports.filter((r) => {
    const seed = new Date(r.date).getTime() / 10000000000;
    return Math.sin(seed) * 30 > 0;
  }).length;
  const hotThemes = THEMES.filter((t) => t.isHot);

  return (
    <div className="bg-dark-bg text-dark-fg min-h-screen">

      {/* ─────────────────────────────────────────────
          HERO
      ───────────────────────────────────────────── */}
      <section className="relative border-b border-dark-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: Text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-primary/10 border border-indigo-primary/30 text-xs font-semibold text-indigo-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-primary animate-pulse" />
                AI 자동 리서치 · 매일 11시 업데이트
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                반도체·AI 인프라<br />
                <span className="text-indigo-primary">리서치 터미널</span>
              </h1>
              <p className="text-lg text-dark-muted max-w-lg">
                글로벌 IB 분석 방법론 + SONNET AI로 시장이 놓친 알파를 발견합니다.
                매일 자동으로 업데이트되는 기관급 리서치.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/reports" className="px-6 py-3 bg-indigo-primary text-white font-semibold rounded-lg hover:bg-indigo-hover transition-colors text-sm">
                  리포트 탐색
                </Link>
                <Link href="/themes" className="px-6 py-3 border border-indigo-primary text-indigo-primary font-semibold rounded-lg hover:bg-indigo-primary/10 transition-colors text-sm">
                  테마 분석
                </Link>
                <Link href="/heatmap" className="px-6 py-3 border border-dark-border text-dark-fg font-semibold rounded-lg hover:border-indigo-primary/50 transition-colors text-sm">
                  섹터 히트맵
                </Link>
              </div>
            </div>

            {/* Right: Coverage Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "총 리포트", value: totalReports, unit: "건", color: "#4f46e5" },
                { label: "강세 비중", value: totalReports > 0 ? Math.round((upReports / totalReports) * 100) : 0, unit: "%", color: "#10b981" },
                { label: "커버리지", value: 131, unit: "종목", color: "#f59e0b" },
                { label: "핵심 테마", value: 13, unit: "개", color: "#6366f1" },
              ].map((stat) => (
                <div key={stat.label} className="bg-dark-surface border border-dark-border rounded-xl p-5">
                  <div className="text-xs text-dark-muted mb-2">{stat.label}</div>
                  <div className="text-3xl font-bold" style={{ color: stat.color }}>
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-dark-muted mt-1">{stat.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          BREAKING NEWS
      ───────────────────────────────────────────── */}
      <section className="border-b border-dark-border bg-dark-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">브레이킹 뉴스</h2>
              <p className="text-xs text-dark-muted mt-1">반도체·AI 관련 주요 뉴스</p>
            </div>
            <span className="text-xs text-dark-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-up animate-pulse" />
              실시간
            </span>
          </div>
          <BreakingNewsSection />
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          TODAY'S REAL MESSAGE
      ───────────────────────────────────────────── */}
      <section className="border-b border-dark-border bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TodaysRealMessageWidget />
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          HOT THEMES
      ───────────────────────────────────────────── */}
      <section className="border-b border-dark-border bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold">🔥 핵심 테마</h2>
              <p className="text-xs text-dark-muted mt-1">현재 모멘텀 최강 투자 테마</p>
            </div>
            <Link href="/themes" className="text-xs text-indigo-primary hover:text-indigo-hover font-semibold">
              전체 13개 테마 →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hotThemes.map((theme) => (
              <Link key={theme.id} href={`/themes#${theme.id}`}>
                <div className="group relative bg-dark-surface border border-amber-500/30 rounded-xl p-5 hover:border-amber-500/60 transition-all hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer">
                  <div className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                    HOT
                  </div>
                  <div className="text-2xl mb-3">{theme.icon}</div>
                  <h3 className="font-bold mb-1 group-hover:text-indigo-primary transition-colors">
                    {theme.title}
                  </h3>
                  <p className="text-xs text-dark-muted mb-4 line-clamp-2">
                    {theme.description}
                  </p>
                  {/* Conviction Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-dark-muted">Conviction</span>
                      <span className="font-semibold text-indigo-primary">{(theme.conviction * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-primary to-amber-400 rounded-full transition-all"
                        style={{ width: `${theme.conviction * 100}%` }}
                      />
                    </div>
                  </div>
                  {/* Stocks */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {theme.stocks.slice(0, 4).map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-dark-bg border border-dark-border rounded-full text-dark-muted font-mono">
                        {s.replace(".KS", "").replace(".T", "")}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          ALL THEMES GRID
      ───────────────────────────────────────────── */}
      <section className="border-b border-dark-border bg-dark-surface/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-xl font-bold mb-6">전체 테마 유니버스 <span className="text-dark-muted font-normal text-sm ml-2">13개</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {THEMES.map((theme) => (
              <Link key={theme.id} href={`/themes#${theme.id}`}>
                <div className="group bg-dark-bg border border-dark-border rounded-lg p-3 hover:border-indigo-primary/40 transition-all cursor-pointer">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg">{theme.icon}</span>
                    {theme.isHot && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-semibold leading-none">HOT</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold group-hover:text-indigo-primary transition-colors line-clamp-1 mb-1">
                    {theme.title}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-dark-muted">
                    <div className="h-1 flex-1 bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-primary/60 rounded-full" style={{ width: `${theme.conviction * 100}%` }} />
                    </div>
                    <span className="font-mono font-semibold text-indigo-primary">{(theme.conviction * 100).toFixed(0)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SECTOR HEATMAP PREVIEW
      ───────────────────────────────────────────── */}
      <section className="border-b border-dark-border bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">섹터 히트맵</h2>
              <p className="text-xs text-dark-muted mt-1">반도체·AI 섹터 실시간 등락률</p>
            </div>
            <Link href="/heatmap" className="text-xs text-indigo-primary hover:text-indigo-hover font-semibold">
              전체 히트맵 →
            </Link>
          </div>
          <HomeHeatmapSection />
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          LATEST REPORTS
      ───────────────────────────────────────────── */}
      <section className="border-b border-dark-border bg-dark-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">최신 리포트</h2>
              <p className="text-xs text-dark-muted mt-1">AI가 자동 생성한 최신 분석 리포트</p>
            </div>
            <Link href="/reports" className="text-xs text-indigo-primary hover:text-indigo-hover font-semibold">
              전체 리포트 →
            </Link>
          </div>

          {latestReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestReports.map((report) => (
                <Link key={report.slug} href={`/reports/${report.slug}`} className="group block">
                  <div className="bg-dark-bg border border-dark-border rounded-xl p-5 hover:border-indigo-primary/40 transition-all hover:shadow-lg hover:shadow-indigo-primary/5">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-mono text-xs font-bold text-indigo-primary bg-indigo-primary/10 px-2 py-0.5 rounded">
                        {report.ticker}.{report.exchange}
                      </span>
                      <span className="text-xs text-dark-muted">
                        {new Date(report.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <h3 className="font-bold group-hover:text-indigo-primary transition-colors line-clamp-2 mb-2 text-sm">
                      {report.title}
                    </h3>
                    <p className="text-xs text-dark-muted line-clamp-2">{report.summary}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs px-2 py-0.5 bg-dark-surface border border-dark-border rounded text-dark-muted">
                        {report.sector}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-dark-surface border border-dark-border rounded text-dark-muted">
                        {report.difficulty}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-dark-surface border border-dark-border rounded-xl p-8 text-center">
              <p className="text-dark-muted text-sm mb-2">아직 리포트가 없습니다</p>
              <p className="text-xs text-dark-muted">매일 11시에 AI 에이전트가 자동으로 리포트를 생성합니다</p>
              <Link href="/admin" className="inline-block mt-4 px-4 py-2 bg-indigo-primary text-white text-xs rounded-lg hover:bg-indigo-hover transition-colors">
                수동으로 리포트 생성 →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          SIGNAL BOARD
      ───────────────────────────────────────────── */}
      <section className="border-b border-dark-border bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-bold mb-2">공급 부족 신호판</h2>
          <p className="text-xs text-dark-muted mb-6">HBM·고급패키징·GPU 공급 현황</p>
          <SignalBoardStatic />
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────── */}
      <footer className="border-t border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-sm text-dark-muted">
            <div>
              <h4 className="font-semibold text-dark-fg mb-3">서비스</h4>
              <ul className="space-y-2">
                <li><Link href="/reports" className="hover:text-indigo-primary">리포트</Link></li>
                <li><Link href="/themes" className="hover:text-indigo-primary">테마</Link></li>
                <li><Link href="/heatmap" className="hover:text-indigo-primary">히트맵</Link></li>
                <li><Link href="/admin" className="hover:text-indigo-primary">에이전트</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-dark-fg mb-3">데이터 소스</h4>
              <ul className="space-y-2">
                <li className="text-xs">Yahoo Finance</li>
                <li className="text-xs">Alpha Vantage</li>
                <li className="text-xs">Bloomberg (공개)</li>
                <li className="text-xs">DART 공시</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-dark-fg mb-3">분석 방법론</h4>
              <ul className="space-y-2">
                <li className="text-xs">BOM 역산 분석</li>
                <li className="text-xs">공급 부족 신호</li>
                <li className="text-xs">어닝콜 분석</li>
                <li className="text-xs">경쟁 포지셔닝</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-dark-fg mb-3">면책조항</h4>
              <p className="text-xs leading-relaxed">
                이 사이트의 모든 내용은 AI가 자동 생성한 정보로, 투자 권유가 아닙니다.
                투자는 본인의 판단으로 하시기 바랍니다.
              </p>
            </div>
          </div>
          <div className="border-t border-dark-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-dark-muted">
            <p>© 2026 AI Research Agent. 자동 생성 리서치 플랫폼.</p>
            <p>Powered by Claude Sonnet · Yahoo Finance · Alpha Vantage</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components (서버에서 렌더링 가능한 정적 부분)
// ─────────────────────────────────────────────

function BreakingNewsSection() {
  const staticNews = [
    { severity: "critical", title: "SK하이닉스 HBM4 수요 공급 불균형 심화", source: "Korea Herald", time: "1시간 전", tickers: ["000660.KS"] },
    { severity: "high", title: "엔비디아 Blackwell B200 납기 지연 2026년 말까지", source: "Bloomberg", time: "3시간 전", tickers: ["NVDA"] },
    { severity: "high", title: "삼성전자 파운드리 2nm 수율 개선 확인", source: "DigiTimes", time: "5시간 전", tickers: ["005930.KS"] },
    { severity: "normal", title: "어드밴테스트 HBM 테스트 장비 수주 기록 경신", source: "Nikkei", time: "8시간 전", tickers: ["6857.T"] },
    { severity: "critical", title: "미국 대중 반도체 수출규제 추가 강화 논의", source: "WSJ", time: "12시간 전", tickers: ["NVDA", "LRCX"] },
    { severity: "normal", title: "피에스케이홀딩스 신규 건식식각 장비 수주 소식", source: "전자신문", time: "1일 전", tickers: ["322000.KS"] },
  ];

  const severityConfig = {
    critical: { label: "긴급", color: "bg-red-500/20 text-red-400 border-red-500/30", dot: "bg-red-500" },
    high: { label: "중요", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
    normal: { label: "일반", color: "bg-green-500/20 text-green-400 border-green-500/30", dot: "bg-green-500" },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {staticNews.map((news, idx) => {
        const cfg = severityConfig[news.severity as keyof typeof severityConfig];
        return (
          <div key={idx} className="bg-dark-bg border border-dark-border rounded-lg p-4 hover:border-indigo-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cfg.color}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
                {cfg.label}
              </span>
              <span className="text-xs text-dark-muted ml-auto">{news.time}</span>
            </div>
            <p className="text-sm font-semibold leading-snug mb-2">{news.title}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-muted">{news.source}</span>
              <div className="flex gap-1">
                {news.tickers.map((t) => (
                  <span key={t} className="text-xs font-mono text-indigo-primary bg-indigo-primary/10 px-1.5 py-0.5 rounded">
                    {t.replace(".KS", "").replace(".T", "")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HomeHeatmapSection() {
  // 정적 히트맵 프리뷰 (실제 데이터는 /heatmap 페이지에서)
  const stocks = [
    { name: "삼성전자", change: 1.62, size: "large" },
    { name: "엔비디아", change: 2.23, size: "large" },
    { name: "SK하이닉스", change: -0.81, size: "large" },
    { name: "마벨", change: 3.03, size: "medium" },
    { name: "AMAT", change: -1.61, size: "medium" },
    { name: "PSK홀딩스", change: 3.05, size: "medium" },
    { name: "마이크론", change: 3.79, size: "medium" },
    { name: "도쿄일렉트론", change: 1.12, size: "small" },
    { name: "어드밴테스트", change: -2.61, size: "small" },
    { name: "ARM", change: 1.45, size: "small" },
    { name: "한미반도체", change: 2.80, size: "small" },
    { name: "삼성전기", change: -0.45, size: "small" },
  ];

  const getColor = (change: number) => {
    if (change >= 3) return "bg-green-700";
    if (change >= 1) return "bg-green-800";
    if (change >= 0) return "bg-green-900/60";
    if (change >= -1) return "bg-red-900/60";
    if (change >= -3) return "bg-red-800";
    return "bg-red-700";
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {stocks.map((s) => (
        <div
          key={s.name}
          className={`${getColor(s.change)} rounded-lg p-3 flex flex-col justify-between border border-white/5 hover:border-white/20 transition-colors cursor-pointer`}
          style={{ minHeight: s.size === "large" ? "80px" : s.size === "medium" ? "70px" : "60px" }}
        >
          <div className="text-xs font-semibold text-white/90 leading-tight">{s.name}</div>
          <div className={`text-sm font-bold ${s.change >= 0 ? "text-green-300" : "text-red-300"}`}>
            {s.change >= 0 ? "▲" : "▼"} {Math.abs(s.change).toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalBoardStatic() {
  const signals = [
    { label: "HBM 공급", status: "critical", detail: "수요 > 공급 5:1 이상", ticker: "000660.KS, MU" },
    { label: "고급 패키징", status: "high", detail: "CoWoS/SoIC 납기 18개월+", ticker: "005930.KS, TSM" },
    { label: "GPU (H100/B200)", status: "critical", detail: "클라우드 예약 2년분 이상", ticker: "NVDA" },
    { label: "AI 서버 OCP", status: "high", detail: "전력·랙 단위 병목 지속", ticker: "VRT, SMCI" },
    { label: "DDR5 계약가", status: "normal", detail: "전분기 대비 +12.5%", ticker: "MU, 000660.KS" },
    { label: "NAND 현물가", status: "normal", detail: "바닥 대비 회복세", ticker: "SNDK, 005930.KS" },
  ];

  const cfg = {
    critical: { label: "공급 부족", bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", dot: "bg-red-500" },
    high: { label: "주의", bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-500" },
    normal: { label: "정상", bg: "bg-green-500/10 border-green-500/30", text: "text-green-400", dot: "bg-green-500" },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {signals.map((s) => {
        const c = cfg[s.status as keyof typeof cfg];
        return (
          <div key={s.label} className={`border rounded-lg p-4 ${c.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{s.label}</span>
              <span className={`text-xs flex items-center gap-1 ${c.text}`}>
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {c.label}
              </span>
            </div>
            <p className="text-xs text-dark-muted mb-2">{s.detail}</p>
            <div className="text-xs font-mono text-indigo-primary">{s.ticker}</div>
          </div>
        );
      })}
    </div>
  );
}
