import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "투자 테마 | AI Research Agent",
  description: "13개 핵심 투자 테마별 분석 — AI인프라, 반도체, 방산, 바이오 등",
};

interface Theme {
  id: string;
  title: string;
  description: string;
  conviction: number;
  stocks: { symbol: string; name: string }[];
  isHot?: boolean;
  sector: string;
  icon: string;
  thesis: string;
  risks: string[];
  catalysts: string[];
}

const THEMES: Theme[] = [
  {
    id: "ai-infra",
    title: "AI 인프라 밸류체인",
    description: "GPU→HBM→고급패키징→냉각까지 AI 서버 공급망 전체 레이어",
    conviction: 0.95,
    isHot: true,
    sector: "AI",
    icon: "⚡",
    stocks: [
      { symbol: "NVDA",      name: "엔비디아" },
      { symbol: "000660.KS", name: "SK하이닉스" },
      { symbol: "005930.KS", name: "삼성전자" },
      { symbol: "AVGO",      name: "브로드컴" },
      { symbol: "VRT",       name: "Vertiv" },
      { symbol: "SMCI",      name: "슈퍼마이크로" },
    ],
    thesis: "AI 데이터센터 투자가 2026-2028년 사이클 최고점을 향해 가고 있습니다. Blackwell B200 수요는 공급을 5:1 이상 초과하며, 이 병목은 밸류체인 전체에서 수익 기회를 만듭니다. 특히 HBM과 고급 패키징은 구조적 공급 부족 국면에 진입했습니다.",
    risks: ["데이터센터 투자 둔화", "미중 수출 규제 강화", "GPU 수율 이슈", "전력 인프라 병목"],
    catalysts: ["B200/GB200 NVL72 출하 가속", "HBM4 양산 확대", "대형 클라우드 CAPEX 가이던스 상향", "CoWoS 신규 캐파 추가"],
  },
  {
    id: "photonics",
    title: "광통신 혁명",
    description: "AI 데이터센터 간 초고속 광 인터커넥트 수요 폭발 — LPO/CPO 전환 가속",
    conviction: 0.95,
    isHot: true,
    sector: "AI",
    icon: "🔆",
    stocks: [
      { symbol: "AVGO",  name: "브로드컴" },
      { symbol: "MRVL",  name: "마벨" },
      { symbol: "COHR",  name: "코히런트" },
      { symbol: "LITE",  name: "라이트패스" },
    ],
    thesis: "800G/1.6T 광모듈 수요가 폭발적으로 증가하고 있습니다. CPO(Co-Packaged Optics) 전환이 가속화되면서 기존 광모듈 플레이어들의 수주가 급증하고 있으며, 2027년까지 연간 30% 이상의 시장 성장이 예상됩니다.",
    risks: ["CPO 채택 속도 지연", "경쟁 심화", "재고 조정 사이클"],
    catalysts: ["800G→1.6T 전환 가속", "하이퍼스케일러 광모듈 발주 증가", "CPO 상용화"],
  },
  {
    id: "dc-energy",
    title: "데이터센터 에너지",
    description: "AI 전력 폭증으로 수혜받는 발전·전력 인프라 밸류체인",
    conviction: 0.93,
    sector: "에너지",
    icon: "🔋",
    stocks: [
      { symbol: "GEV",     name: "GE Vernova" },
      { symbol: "CEG",     name: "Constellation Energy" },
      { symbol: "VRT",     name: "Vertiv" },
      { symbol: "SMCI",    name: "슈퍼마이크로" },
    ],
    thesis: "AI 데이터센터의 전력 소비가 2030년까지 현재 대비 3배 이상 증가할 것으로 예상됩니다. 원전 재가동, 가스 터빈, 전력 관리 솔루션 기업들이 직접 수혜를 받습니다.",
    risks: ["원전 재가동 일정 지연", "전력망 확충 속도", "규제 리스크"],
    catalysts: ["하이퍼스케일러 원전 PPA 체결", "데이터센터 신규 허가 가속", "전력관리 솔루션 수주"],
  },
  {
    id: "kr-semicon",
    title: "K-반도체 장비·소재",
    description: "HBM 및 첨단 패키징 확대 수혜 국내 장비·소재주",
    conviction: 0.90,
    isHot: true,
    sector: "반도체",
    icon: "🇰🇷",
    stocks: [
      { symbol: "322000.KS", name: "피에스케이홀딩스" },
      { symbol: "042700.KS", name: "한미반도체" },
      { symbol: "009150.KS", name: "삼성전기" },
      { symbol: "006400.KS", name: "삼성SDI" },
    ],
    thesis: "국내 반도체 장비주는 HBM 생산 확대와 첨단 패키징 투자 가속의 직접 수혜자입니다. 피에스케이홀딩스의 건식 식각·애싱 장비는 HBM 공정에서 불가결한 핵심 장비로, 수주 가시성이 높습니다.",
    risks: ["삼성전자 투자 지연", "공정 전환 속도", "경쟁 장비업체 추격"],
    catalysts: ["SK하이닉스 HBM4 투자 확대", "삼성전자 HBM3E 수율 개선", "신규 장비 수주 공시"],
  },
  {
    id: "memory",
    title: "메모리 슈퍼사이클",
    description: "DDR5·HBM4 수요 급증 + NAND 회복 + 공급 타이트 구조",
    conviction: 0.90,
    sector: "반도체",
    icon: "💾",
    stocks: [
      { symbol: "000660.KS", name: "SK하이닉스" },
      { symbol: "MU",        name: "마이크론" },
      { symbol: "005930.KS", name: "삼성전자" },
    ],
    thesis: "HBM 시장은 2026년 SK하이닉스, 마이크론, 삼성전자 3사 모두 공급이 수요를 따라가기 어려운 구조입니다. DRAM 계약가는 AI 서버향 DDR5 수요로 상승 지속이 예상됩니다.",
    risks: ["HBM 양산 수율 이슈", "중국 메모리 업체 부상", "AI 투자 사이클 둔화"],
    catalysts: ["HBM4 양산 확대", "DRAM 계약가 상향", "NAND 현물가 회복"],
  },
  {
    id: "kr-defense",
    title: "방산 & 우주항공",
    description: "나토 방위비 증대와 K-방산 수출 확대 모멘텀",
    conviction: 0.92,
    sector: "방산",
    icon: "🛡️",
    stocks: [
      { symbol: "LIG.KS", name: "LIG넥스원" },
      { symbol: "LMT",    name: "록히드마틴" },
      { symbol: "RTX",    name: "Raytheon" },
      { symbol: "BA",     name: "보잉" },
    ],
    thesis: "우크라이나 전쟁 이후 나토 국가들의 방위비 증대와 K-방산 수출 가속이 동시에 일어나고 있습니다. 한화에어로스페이스, LIG넥스원 등은 K2 전차, 폴란드 수출 계약 등으로 수주 사이클 최고점에 있습니다.",
    risks: ["지정학 긴장 완화", "방산 수출 규제", "환율 리스크"],
    catalysts: ["폴란드 추가 K2 수주", "나토 방위비 2% GDP 도달 국가 증가", "우주 방산 확대"],
  },
  {
    id: "macro",
    title: "금리 & 매크로 전략",
    description: "연준 금리 전환, 달러/원, 금·WTI 방향성 전략",
    conviction: 0.88,
    sector: "매크로",
    icon: "📊",
    stocks: [
      { symbol: "TLT",   name: "미국 장기채 ETF" },
      { symbol: "GLD",   name: "금 ETF" },
      { symbol: "KRW=X", name: "달러/원" },
      { symbol: "GC=F",  name: "금 선물" },
    ],
    thesis: "연준의 금리 인하 사이클과 글로벌 지정학 불확실성이 교차하는 환경에서 금과 장기채는 포트폴리오 헤지 역할을 합니다. 달러/원 환율은 국내 수출 기업의 실적에 직접 영향을 미칩니다.",
    risks: ["인플레이션 재가속", "연준 매파 전환", "미중 무역 갈등"],
    catalysts: ["연준 기준금리 인하 재개", "달러 약세 전환", "지정학 리스크 완화"],
  },
  {
    id: "semicon-equip",
    title: "반도체 장비 글로벌",
    description: "전공정 확대 및 HBM 패키징 투자 수혜 글로벌 장비주",
    conviction: 0.88,
    sector: "반도체",
    icon: "🏭",
    stocks: [
      { symbol: "AMAT",   name: "어플라이드머터리얼즈" },
      { symbol: "LRCX",   name: "램리서치" },
      { symbol: "8035.T", name: "도쿄일렉트론" },
      { symbol: "6857.T", name: "어드밴테스트" },
      { symbol: "KLAC",   name: "KLA" },
    ],
    thesis: "글로벌 반도체 설비 투자(CAPEX) 사이클이 2025-2026년 정점을 향해 상승 중입니다. AMAT, LRCX는 EUV 공정 확대와 HBM 패키징 투자의 직접 수혜자입니다.",
    risks: ["반도체 설비 투자 둔화", "미중 수출 규제", "고객사 CAPEX 조정"],
    catalysts: ["TSMC 선진 패키징 CAPEX 확대", "삼성/SK 투자 재개", "2nm 공정 전환"],
  },
  {
    id: "kbio",
    title: "K-바이오 & 신약",
    description: "글로벌 기술수출 성과 + GLP-1 신약 파이프라인",
    conviction: 0.85,
    sector: "바이오",
    icon: "🧬",
    stocks: [
      { symbol: "207940.KS", name: "삼성바이오로직스" },
      { symbol: "068270.KS", name: "셀트리온" },
      { symbol: "LLY",       name: "일라이릴리" },
      { symbol: "NVO",       name: "노보노디스크" },
    ],
    thesis: "삼성바이오로직스의 CMO 수주 증가와 셀트리온의 바이오시밀러 수출 확대가 K-바이오 성장을 견인합니다. 글로벌 GLP-1 비만 치료제 시장은 2030년까지 $100B+ 시장으로 성장이 예상됩니다.",
    risks: ["임상시험 실패", "규제 리스크", "특허 분쟁"],
    catalysts: ["신약 허가 승인", "CMO 대형 수주", "GLP-1 파이프라인 진척"],
  },
  {
    id: "ev-battery",
    title: "EV & 배터리",
    description: "EV 침투율 가속화 수혜 배터리 및 소재 기업",
    conviction: 0.85,
    sector: "EV",
    icon: "🔌",
    stocks: [
      { symbol: "373220.KS", name: "LG에너지솔루션" },
      { symbol: "006400.KS", name: "삼성SDI" },
      { symbol: "TSLA",      name: "테슬라" },
      { symbol: "RIVN",      name: "리비안" },
    ],
    thesis: "글로벌 EV 침투율이 2030년 30%를 향해 가속화되는 환경에서 국내 배터리 기업들의 수주 증가가 기대됩니다. 4680 셀 상용화와 고체전지 개발이 차기 모멘텀이 될 것입니다.",
    risks: ["EV 수요 둔화", "중국 배터리 경쟁", "원자재 가격 변동"],
    catalysts: ["IRA 세액공제 확대", "고체전지 상용화", "EV 신차 출시"],
  },
  {
    id: "banks",
    title: "미국 대형 금융",
    description: "금리 정상화 수혜 및 자본시장 활성화 기대",
    conviction: 0.78,
    sector: "금융",
    icon: "🏦",
    stocks: [
      { symbol: "JPM", name: "JP모건" },
      { symbol: "GS",  name: "골드만삭스" },
      { symbol: "MS",  name: "모건스탠리" },
      { symbol: "BAC", name: "뱅크오브아메리카" },
    ],
    thesis: "M&A 시장 회복과 IPO 활성화로 IB 수익이 반등하고 있습니다. 순이자마진(NIM) 방어와 대출 증가가 순익 성장을 지지합니다.",
    risks: ["경기 침체 우려", "대출 부실화", "금리 급격 인하"],
    catalysts: ["M&A 시장 회복", "IPO 활성화", "자본시장 거래 증가"],
  },
  {
    id: "crypto",
    title: "크립토 & 인프라",
    description: "비트코인 ETF 기관화 및 DeFi 실물자산 토큰화",
    conviction: 0.78,
    sector: "크립토",
    icon: "₿",
    stocks: [
      { symbol: "COIN",    name: "코인베이스" },
      { symbol: "MSTR",   name: "마이크로스트래티지" },
      { symbol: "BTC-USD", name: "비트코인" },
      { symbol: "ETH-USD", name: "이더리움" },
    ],
    thesis: "비트코인 현물 ETF 승인 이후 기관 자금 유입이 가속화되고 있습니다. RWA(실물자산 토큰화) 시장이 부상하며 DeFi와 전통 금융의 통합이 진행 중입니다.",
    risks: ["규제 강화", "시장 변동성", "해킹 및 보안 리스크"],
    catalysts: ["이더리움 현물 ETF", "비트코인 반감기 효과", "기관 채택 확대"],
  },
  {
    id: "energy",
    title: "글로벌 에너지",
    description: "지정학 리스크와 에너지 전환 사이의 메이저 에너지주",
    conviction: 0.72,
    sector: "에너지",
    icon: "🛢️",
    stocks: [
      { symbol: "XOM", name: "엑손모빌" },
      { symbol: "CVX", name: "셰브론" },
      { symbol: "COP", name: "코노코필립스" },
      { symbol: "SLB", name: "슐룸베르저" },
    ],
    thesis: "지정학 리스크로 에너지 공급 불확실성이 높은 환경에서 대형 에너지주는 배당+자사주 매입으로 주주환원을 강화하고 있습니다. LNG 수출 확대가 중장기 모멘텀입니다.",
    risks: ["원유 가격 하락", "에너지 전환 가속", "ESG 규제"],
    catalysts: ["중동 공급 차질", "LNG 수요 증가", "에너지 전환 투자"],
  },
];

export default function ThemesPage() {
  const hotThemes = THEMES.filter((t) => t.isHot);
  const otherThemes = THEMES.filter((t) => !t.isHot);

  return (
    <div className="bg-dark-bg text-dark-fg min-h-screen">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">투자 테마 유니버스</h1>
              <p className="text-sm text-dark-muted">
                AI가 분석한 13개 핵심 투자 테마 — Conviction 점수 기반 포트폴리오 구성
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-primary">131</div>
              <div className="text-xs text-dark-muted">커버리지 종목</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* HOT 테마 */}
        {hotThemes.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              🔥 핵심 모멘텀 테마
              <span className="text-sm font-normal text-dark-muted">Conviction 0.90+</span>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {hotThemes.map((theme) => (
                <ThemeCard key={theme.id} theme={theme} featured />
              ))}
            </div>
          </div>
        )}

        {/* 나머지 테마 */}
        <div>
          <h2 className="text-xl font-bold mb-6">전체 테마</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {otherThemes.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ theme, featured = false }: { theme: Theme; featured?: boolean }) {
  return (
    <div
      id={theme.id}
      className={`bg-dark-surface border rounded-xl p-6 ${
        featured
          ? "border-amber-500/30 hover:border-amber-500/50"
          : "border-dark-border hover:border-indigo-primary/30"
      } transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{theme.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{theme.title}</h3>
              {theme.isHot && (
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded font-semibold">
                  HOT
                </span>
              )}
            </div>
            <div className="text-xs text-dark-muted mt-0.5">{theme.sector}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-indigo-primary">
            {(theme.conviction * 100).toFixed(0)}
          </div>
          <div className="text-xs text-dark-muted">Conviction</div>
        </div>
      </div>

      {/* Conviction Bar */}
      <div className="h-1.5 bg-dark-border rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-indigo-primary to-amber-400 rounded-full"
          style={{ width: `${theme.conviction * 100}%` }}
        />
      </div>

      <p className="text-sm text-dark-muted mb-4 leading-relaxed">{theme.description}</p>

      {/* Thesis (Featured만) */}
      {featured && (
        <div className="bg-dark-bg border border-dark-border rounded-lg p-4 mb-4 text-xs text-dark-muted leading-relaxed">
          {theme.thesis}
        </div>
      )}

      {/* Stocks */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {theme.stocks.map((s) => (
          <span
            key={s.symbol}
            className="text-xs px-2 py-1 bg-dark-bg border border-dark-border rounded-full font-mono text-indigo-primary hover:border-indigo-primary/50 transition-colors cursor-pointer"
            title={s.name}
          >
            {s.symbol.replace(".KS", "").replace(".T", "")}
          </span>
        ))}
      </div>

      {/* Catalysts & Risks (Featured만) */}
      {featured && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-status-up font-semibold mb-1.5">▲ 촉매</div>
            <ul className="space-y-1 text-dark-muted">
              {theme.catalysts.slice(0, 3).map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-status-down font-semibold mb-1.5">▼ 리스크</div>
            <ul className="space-y-1 text-dark-muted">
              {theme.risks.slice(0, 3).map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Related Reports Link */}
      <div className="mt-4 pt-4 border-t border-dark-border">
        <Link
          href={`/reports?sector=${encodeURIComponent(theme.sector)}`}
          className="text-xs text-indigo-primary hover:text-indigo-hover font-semibold"
        >
          관련 리포트 보기 →
        </Link>
      </div>
    </div>
  );
}
