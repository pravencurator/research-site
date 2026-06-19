/**
 * lib/screener-grouping.ts
 *
 * 신고가 갱신/근접 종목을 "미미의 신고가" 채널 포맷처럼 그룹핑.
 * - 13개 테마: 직접 ticker 매칭 → sector 폴백 → conviction 최고 테마 단일 배정
 * - 보조 버킷: 동전주(시총 500억↓) / 호실적 / 거래재개 / 개별섹터 / 기타
 */

// ─────────────────────────────────────────────
// Theme definitions  (mirrored from app/page.tsx + extended with KR tickers)
// ─────────────────────────────────────────────

export interface ThemeDef {
  id: string;
  title: string;
  conviction: number;
  icon: string;
  /** All known tickers belonging to this theme (YF format, uppercase) */
  stocks: string[];
  /** Sector-keyword fallback — if none of stocks match, try sector string */
  sectorKeywords?: string[];
}

export const THEME_DEFS: ThemeDef[] = [
  {
    id: "ai-infra",
    title: "AI 인프라 밸류체인",
    conviction: 0.95,
    icon: "⚡",
    stocks: ["NVDA", "000660.KS", "005930.KS", "AVGO", "VRT", "SMCI"],
    sectorKeywords: [],
  },
  {
    id: "photonics",
    title: "광통신 혁명",
    conviction: 0.95,
    icon: "🔆",
    stocks: ["AVGO", "MRVL", "COHR", "LITE"],
    sectorKeywords: [],
  },
  {
    id: "dc-energy",
    title: "데이터센터 에너지",
    conviction: 0.93,
    icon: "🔋",
    stocks: ["GEV", "CEG", "VRT", "010120.KS", "015760.KS", "034020.KS"],
    sectorKeywords: [],
  },
  {
    id: "kr-semicon",
    title: "K-반도체 장비·소재",
    conviction: 0.90,
    icon: "🇰🇷",
    stocks: [
      "322000.KS", "042700.KS", "009150.KS", "006400.KS",
      "066970.KS", "011790.KS", "000990.KS",
    ],
    sectorKeywords: ["반도체 장비", "반도체소재"],
  },
  {
    id: "memory",
    title: "메모리 슈퍼사이클",
    conviction: 0.90,
    icon: "💾",
    stocks: ["000660.KS", "MU", "005930.KS", "WDC"],
    sectorKeywords: ["메모리", "DRAM", "NAND"],
  },
  {
    id: "kr-defense",
    title: "방산 & 우주항공",
    conviction: 0.92,
    icon: "🛡️",
    stocks: [
      "012450.KS", "047810.KS", "079550.KS", "064350.KS",
      "LMT", "RTX", "BA", "NOC",
    ],
    sectorKeywords: ["방산", "항공우주", "방위"],
  },
  {
    id: "macro",
    title: "금리 & 매크로",
    conviction: 0.88,
    icon: "📊",
    stocks: ["TLT", "GLD", "GC=F"],
    sectorKeywords: [],
  },
  {
    id: "semicon-equip",
    title: "반도체 장비 글로벌",
    conviction: 0.88,
    icon: "🏭",
    stocks: ["AMAT", "LRCX", "KLAC", "8035.T", "6857.T"],
    sectorKeywords: [],
  },
  {
    id: "kbio",
    title: "K-바이오 & 신약",
    conviction: 0.85,
    icon: "🧬",
    stocks: [
      "207940.KS", "068270.KS", "000100.KS", "090430.KS",
      "006280.KS", "LLY", "NVO", "REGN",
    ],
    sectorKeywords: ["바이오", "제약", "헬스케어", "뷰티"],
  },
  {
    id: "ev-battery",
    title: "EV & 배터리",
    conviction: 0.85,
    icon: "🔌",
    stocks: [
      "373220.KS", "006400.KS", "247540.KS", "086520.KS",
      "003670.KS", "011790.KS", "005380.KS", "000270.KS",
      "012330.KS", "TSLA", "RIVN", "GM",
    ],
    sectorKeywords: ["2차전지", "배터리", "양극재", "음극재", "동박"],
  },
  {
    id: "banks",
    title: "금융 & 증권",
    conviction: 0.78,
    icon: "🏦",
    stocks: [
      "JPM", "GS", "MS", "BAC",
      "105560.KS", "055550.KS", "086790.KS", "316140.KS",
      "024110.KS", "032830.KS", "000810.KS", "071050.KS",
      "016360.KS", "006800.KS",
    ],
    sectorKeywords: ["금융", "은행", "보험", "증권"],
  },
  {
    id: "crypto",
    title: "크립토 & 인프라",
    conviction: 0.78,
    icon: "₿",
    stocks: ["COIN", "MSTR", "BTC-USD", "ETH-USD"],
    sectorKeywords: [],
  },
  {
    id: "energy",
    title: "글로벌 에너지",
    conviction: 0.72,
    icon: "🛢️",
    stocks: [
      "XOM", "CVX", "COP", "SLB",
      "010950.KS", "036460.KS", "009830.KS", "096770.KS",
    ],
    sectorKeywords: ["에너지", "정유", "가스", "원자력"],
  },
];

// ─────────────────────────────────────────────
// Auxiliary buckets
// ─────────────────────────────────────────────

export type AuxBucketId =
  | "동전주"
  | "호실적"
  | "거래재개"
  | "개별섹터"
  | "기타";

export interface AuxBucketDef {
  id: AuxBucketId;
  label: string;
  icon: string;
}

export const AUX_BUCKETS: AuxBucketDef[] = [
  { id: "동전주",   label: "동전주",   icon: "🪙" },
  { id: "호실적",   label: "호실적",   icon: "📈" },
  { id: "거래재개", label: "거래재개", icon: "🔄" },
  { id: "개별섹터", label: "개별섹터", icon: "🔎" },
  { id: "기타",     label: "기타",     icon: "📌" },
];

// ─────────────────────────────────────────────
// Input / output types
// ─────────────────────────────────────────────

export interface ScreenerStock {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  high52Week: number;
  low52Week: number;
  changePercent: number;
  /** 조원 */
  marketCapT: number;
  isBreakthrough: boolean;
  /** negative: distance below 52w high; 0 = exact high */
  proximityPct: number;
  /** optional flags injected by cron */
  isHosiljeok?: boolean;
  isGeoraeTepae?: boolean;
  market?: "KOSPI" | "KOSDAQ";
}

export interface GroupedStock extends ScreenerStock {
  groupId: string;
  groupLabel: string;
  groupIcon: string;
  isTheme: boolean;
  auxBucket?: AuxBucketId;
}

export interface ScreenerGroup {
  id: string;
  label: string;
  icon: string;
  conviction?: number;
  isTheme: boolean;
  stocks: GroupedStock[];
}

// ─────────────────────────────────────────────
// Build ticker → best theme index
// ─────────────────────────────────────────────

function buildTickerIndex(): Map<string, { id: string; conviction: number }> {
  const idx = new Map<string, { id: string; conviction: number }>();
  for (const theme of THEME_DEFS) {
    for (const raw of theme.stocks) {
      const key = raw.toUpperCase();
      const existing = idx.get(key);
      if (!existing || theme.conviction > existing.conviction) {
        idx.set(key, { id: theme.id, conviction: theme.conviction });
      }
    }
  }
  return idx;
}

function findSectorTheme(sector: string): string | undefined {
  for (const theme of THEME_DEFS) {
    if (
      theme.sectorKeywords &&
      theme.sectorKeywords.some((kw) =>
        sector.toLowerCase().includes(kw.toLowerCase())
      )
    ) {
      return theme.id;
    }
  }
  return undefined;
}

// ─────────────────────────────────────────────
// Main grouping function
// ─────────────────────────────────────────────

export function groupStocks(
  stocks: ScreenerStock[],
  /** 동전주 threshold in 조원 (default 0.05 = 500억) */
  smallCapThresholdT = 0.05
): ScreenerGroup[] {
  const tickerIdx = buildTickerIndex();
  const buckets = new Map<string, GroupedStock[]>();

  const assign = (groupId: string, item: GroupedStock) => {
    if (!buckets.has(groupId)) buckets.set(groupId, []);
    buckets.get(groupId)!.push(item);
  };

  for (const stock of stocks) {
    const sym = stock.symbol.toUpperCase();

    // ── 1. 동전주 (시총 500억 이하)
    if (stock.marketCapT > 0 && stock.marketCapT <= smallCapThresholdT) {
      const theme = THEME_DEFS.find((t) => t.id === "기타") ?? null;
      assign("동전주", {
        ...stock, groupId: "동전주", groupLabel: "동전주",
        groupIcon: "🪙", isTheme: false, auxBucket: "동전주",
      });
      continue;
    }

    // ── 2. 명시적 ticker 매칭 (highest conviction theme wins)
    const tickerMatch = tickerIdx.get(sym);
    if (tickerMatch) {
      const theme = THEME_DEFS.find((t) => t.id === tickerMatch.id)!;
      assign(theme.id, {
        ...stock, groupId: theme.id, groupLabel: theme.title,
        groupIcon: theme.icon, isTheme: true,
      });
      continue;
    }

    // ── 3. Sector keyword fallback
    const sectorThemeId = findSectorTheme(stock.sector);
    if (sectorThemeId) {
      const theme = THEME_DEFS.find((t) => t.id === sectorThemeId)!;
      assign(theme.id, {
        ...stock, groupId: theme.id, groupLabel: theme.title,
        groupIcon: theme.icon, isTheme: true,
      });
      continue;
    }

    // ── 4. 호실적 / 거래재개 (from cron flags)
    if (stock.isHosiljeok) {
      assign("호실적", { ...stock, groupId: "호실적", groupLabel: "호실적", groupIcon: "📈", isTheme: false, auxBucket: "호실적" });
      continue;
    }
    if (stock.isGeoraeTepae) {
      assign("거래재개", { ...stock, groupId: "거래재개", groupLabel: "거래재개", groupIcon: "🔄", isTheme: false, auxBucket: "거래재개" });
      continue;
    }

    // ── 5. 개별섹터 — sector present but no theme match
    if (stock.sector && stock.sector !== "기타") {
      assign("개별섹터", { ...stock, groupId: "개별섹터", groupLabel: "개별섹터", groupIcon: "🔎", isTheme: false, auxBucket: "개별섹터" });
      continue;
    }

    // ── 6. 기타
    assign("기타", { ...stock, groupId: "기타", groupLabel: "기타", groupIcon: "📌", isTheme: false, auxBucket: "기타" });
  }

  const result: ScreenerGroup[] = [];

  // Theme groups first (conviction desc)
  for (const theme of THEME_DEFS) {
    const items = buckets.get(theme.id);
    if (items && items.length > 0) {
      result.push({ id: theme.id, label: theme.title, icon: theme.icon, conviction: theme.conviction, isTheme: true, stocks: items });
    }
  }
  // Aux buckets
  for (const aux of AUX_BUCKETS) {
    const items = buckets.get(aux.id);
    if (items && items.length > 0) {
      result.push({ id: aux.id, label: aux.label, icon: aux.icon, isTheme: false, stocks: items });
    }
  }

  return result;
}

// ─────────────────────────────────────────────
// Briefing text generator (Telegram "미미의 신고가" style)
// ─────────────────────────────────────────────

export function formatBriefing(groups: ScreenerGroup[], dateStr: string): string {
  const total = groups.reduce((s, g) => s + g.stocks.length, 0);
  const lines: string[] = [
    `📊 신고가 브리핑 | ${dateStr} | 총 ${total}종목`,
    "",
  ];
  for (const g of groups) {
    if (g.stocks.length === 0) continue;
    const names = g.stocks
      .map((s) => `${s.name}${s.isBreakthrough ? "★" : ""}`)
      .join(", ");
    lines.push(`(${g.label}) ${names}`);
  }
  return lines.join("\n");
}
