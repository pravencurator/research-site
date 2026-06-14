import { NextResponse } from "next/server";
import yahooFinance from "@/lib/data-sources/yahoo-finance";

interface WatchlistEntry {
  symbol: string;
  name: string;
  sector: string;
  description: string;
}

interface NewHighStock {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  currentPrice: number;
  high52Week: number;
  low52Week: number;
  changePercent: number;
  marketCapB: number; // 조원 (KRW / 1e12)
  isBreakthrough: boolean; // true if currentPrice > high52Week
  proximityPct: number; // (currentPrice / high52Week - 1) * 100
}

const KOREAN_WATCHLIST: WatchlistEntry[] = [
  {
    symbol: "005930.KS",
    name: "삼성전자",
    sector: "반도체",
    description:
      "글로벌 1위 메모리 반도체·스마트폰 제조사. D램·낸드 시장 점유율 1위.\n파운드리 GAA 공정 전환과 HBM3E 공급이 2026년 핵심 변수.",
  },
  {
    symbol: "000660.KS",
    name: "SK하이닉스",
    sector: "반도체",
    description:
      "HBM 시장 선도 기업으로 AI 인프라 수요 직접 수혜주. HBM3E 양산 선두.\n엔비디아 독점 공급 지위와 HBM4 16단 개발로 기술 격차 확대 중.",
  },
  {
    symbol: "042700.KS",
    name: "한미반도체",
    sector: "반도체",
    description:
      "HBM 핵심 장비 TC본더 독점 공급사. 세계 유일의 고성능 TC본더 메이커.\n AI 가속기 수요 확대로 수주 잔고 역대 최고 수준 지속.",
  },
  {
    symbol: "322000.KS",
    name: "피에스케이홀딩스",
    sector: "반도체",
    description:
      "반도체 PR 스트립·애싱 장비 글로벌 1위. 고객사 삼성·SK·TSMC 다변화.\n3D 낸드 적층수 증가와 GAA 전환 수혜로 장비 교체 수요 구조적 확대.",
  },
  {
    symbol: "009150.KS",
    name: "삼성전기",
    sector: "반도체",
    description:
      "MLCC·패키지기판 글로벌 상위권 제조사. AI 서버·전장용 고용량 MLCC 수혜.\n FC-BGA 기판 증설로 AI 서버 수요 대응 능력 강화.",
  },
  {
    symbol: "012450.KS",
    name: "한화에어로스페이스",
    sector: "방산",
    description:
      "K-방산 수출 핵심 기업. K9 자주포·레드백 IFV 해외 수주 모멘텀 지속.\n방산·항공엔진·우주 사업 포트폴리오로 장기 성장 궤도 진입.",
  },
  {
    symbol: "047810.KS",
    name: "한국항공우주",
    sector: "방산",
    description:
      "국산 전투기 KF-21·경공격기 FA-50 양산·수출 주도 기업.\n방위비 증액 기조 및 글로벌 재무장 흐름 속 수주 파이프라인 확대.",
  },
  {
    symbol: "005380.KS",
    name: "현대차",
    sector: "자동차",
    description:
      "글로벌 3위 완성차 그룹. EV·FCEV·SDV 전환 속도 업계 선두권.\n아이오닉6·제네시스 전동화 라인업 확대로 프리미엄 브랜드 가치 상승.",
  },
  {
    symbol: "000270.KS",
    name: "기아",
    sector: "자동차",
    description:
      "현대차 그룹 계열 글로벌 완성차. EV6·EV9 중심 전동화 전략 가속.\n목적기반모빌리티(PBV) 사업 본격화로 신성장 동력 확보 단계.",
  },
  {
    symbol: "373220.KS",
    name: "LG에너지솔루션",
    sector: "2차전지",
    description:
      "글로벌 배터리 시장 점유율 2위. 원통형·파우치·각형 풀라인업 보유.\n북미 IRA 수혜와 ESS·EV 배터리 수주 잔고 100조원 상회.",
  },
  {
    symbol: "006400.KS",
    name: "삼성SDI",
    sector: "2차전지",
    description:
      "프리미엄 배터리 전문 기업. 젠5 원통형 배터리·전고체 배터리 개발 선도.\n스텔란티스 JV 등 북미 생산 거점 구축으로 IRA 수혜 가시화.",
  },
  {
    symbol: "207940.KS",
    name: "삼성바이오로직스",
    sector: "바이오",
    description:
      "글로벌 CDMO 시장 점유율 상위권. 4·5공장 풀가동으로 수주 확대 국면.\n항체의약품·ADC 위탁 생산 역량 강화로 바이오 위탁 제조 독보적 지위.",
  },
  {
    symbol: "068270.KS",
    name: "셀트리온",
    sector: "바이오",
    description:
      "항체 바이오시밀러 글로벌 선도 기업. 짐펜트라 미국 직판 전략 본격화.\n파이프라인 다각화와 합병 시너지로 글로벌 바이오 플레이어 도약.",
  },
  {
    symbol: "035420.KS",
    name: "NAVER",
    sector: "IT/플랫폼",
    description:
      "국내 1위 검색·커머스·콘텐츠 플랫폼. 하이퍼클로바X 기반 AI 서비스 선도.\n웹툰·제페토 글로벌 확장과 클라우드 사업 성장으로 수익 다변화.",
  },
  {
    symbol: "035720.KS",
    name: "카카오",
    sector: "IT/플랫폼",
    description:
      "국민 메신저 카카오톡 기반 슈퍼앱 생태계. 카카오페이·모빌리티 성장세.\n콘텐츠·엔터·AI 서비스 확장으로 플랫폼 가치 재평가 국면.",
  },
  {
    symbol: "055550.KS",
    name: "신한지주",
    sector: "금융",
    description:
      "국내 4대 금융지주 중 글로벌 네트워크 최강. 베트남·인도네시아 비중 확대.\n자본 효율 경영과 주주환원 정책 강화로 코리아 디스카운트 해소 수혜.",
  },
  {
    symbol: "105560.KS",
    name: "KB금융",
    sector: "금융",
    description:
      "국내 최대 은행 기반 종합 금융지주. 자산관리·보험·증권 계열사 시너지 극대화.\n고배당·자사주 매입 병행 주주환원으로 기관 장기 보유 매력 증대.",
  },
  {
    symbol: "051910.KS",
    name: "LG화학",
    sector: "화학/소재",
    description:
      "석유화학·첨단소재·신약 포트폴리오 보유 대형 화학사. LG에너지솔루션 최대주주.\n양극재·OLED 소재 사업 성장으로 화학업 사이클 극복 기대.",
  },
  {
    symbol: "028260.KS",
    name: "삼성물산",
    sector: "화학/소재",
    description:
      "삼성 그룹 지배구조 핵심 지주 역할. 건설·상사·패션·리조트 사업 운영.\n삼성전자 지분 가치 부각 시 순자산가치(NAV) 할인 축소 수혜.",
  },
  {
    symbol: "010950.KS",
    name: "S-Oil",
    sector: "화학/소재",
    description:
      "사우디 아람코 자회사. 정유·석유화학 통합 복합 설비 국내 최고 수준.\n샤힌 프로젝트 완공 시 고부가 화학 비중 확대로 마진 구조 개선 기대.",
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchQuote(entry: WatchlistEntry): Promise<NewHighStock | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(entry.symbol);
    if (!result) return null;

    const currentPrice: number = result.regularMarketPrice ?? 0;
    const high52Week: number = result.fiftyTwoWeekHigh ?? 0;
    const low52Week: number = result.fiftyTwoWeekLow ?? 0;
    const changePercent: number = result.regularMarketChangePercent ?? 0;
    const rawMarketCap: number = result.marketCap ?? 0;

    if (currentPrice <= 0 || high52Week <= 0) return null;

    const proximityPct = (currentPrice / high52Week - 1) * 100;

    // Filter: within 2% of 52-week high or exceeded it
    if (currentPrice < high52Week * 0.98) return null;

    return {
      symbol: entry.symbol,
      name: entry.name,
      sector: entry.sector,
      description: entry.description,
      currentPrice,
      high52Week,
      low52Week,
      changePercent,
      marketCapB: rawMarketCap / 1e12,
      isBreakthrough: currentPrice > high52Week,
      proximityPct,
    };
  } catch (error) {
    console.warn(`Failed to fetch quote for ${entry.symbol}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    const timeoutMs = 12000;
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    const promises = KOREAN_WATCHLIST.map((entry) =>
      Promise.race([fetchQuote(entry), timeoutPromise])
    );

    const settled = await Promise.allSettled(promises);

    const stocks: NewHighStock[] = settled
      .filter(
        (r): r is PromiseFulfilledResult<NewHighStock | null> =>
          r.status === "fulfilled" && r.value !== null
      )
      .map((r) => r.value as NewHighStock)
      .sort((a, b) => b.proximityPct - a.proximityPct);

    return NextResponse.json(
      {
        success: true,
        data: stocks,
        timestamp: new Date().toISOString(),
        count: stocks.length,
        note: stocks.length === 0 ? "현재 신고가 근접 종목 없음" : undefined,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("new-highs route error:", error);
    // Never return 500 — degrade gracefully
    return NextResponse.json(
      {
        success: true,
        data: [],
        note: "데이터 로딩 실패",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  }
}
