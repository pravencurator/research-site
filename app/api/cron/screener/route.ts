/**
 * app/api/cron/screener/route.ts
 *
 * 평일 장마감 후 15:40 KST (06:40 UTC) Vercel Cron이 호출하는 엔드포인트.
 * 신고가 갱신/근접 종목을 수집해 data/screener-snapshot.json에 저장.
 *
 * 인증: Authorization: Bearer $CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import yahooFinance from "@/lib/data-sources/yahoo-finance";

// ─────────────────────────────────────────────
// Watchlist — 코스피/코스닥 주요 종목
// krx-universe.json이 존재하면 병합하여 커버리지를 확장
// ─────────────────────────────────────────────

const BASE_WATCHLIST = [
  // 반도체
  { symbol: "005930.KS", name: "삼성전자",       sector: "반도체",      market: "KOSPI" as const },
  { symbol: "000660.KS", name: "SK하이닉스",     sector: "반도체",      market: "KOSPI" as const },
  { symbol: "009150.KS", name: "삼성전기",       sector: "반도체",      market: "KOSPI" as const },
  { symbol: "042700.KS", name: "한미반도체",     sector: "반도체",      market: "KOSPI" as const },
  { symbol: "322000.KS", name: "피에스케이홀딩스", sector: "반도체",    market: "KOSPI" as const },
  { symbol: "066970.KS", name: "LG이노텍",       sector: "반도체",      market: "KOSPI" as const },
  { symbol: "000990.KS", name: "DB하이텍",       sector: "반도체",      market: "KOSPI" as const },
  // IT/플랫폼
  { symbol: "035420.KS", name: "NAVER",          sector: "IT/플랫폼",   market: "KOSPI" as const },
  { symbol: "035720.KS", name: "카카오",          sector: "IT/플랫폼",   market: "KOSPI" as const },
  { symbol: "259960.KS", name: "크래프톤",        sector: "IT/플랫폼",   market: "KOSPI" as const },
  { symbol: "352820.KS", name: "하이브",          sector: "IT/플랫폼",   market: "KOSPI" as const },
  // 2차전지
  { symbol: "373220.KS", name: "LG에너지솔루션", sector: "2차전지",      market: "KOSPI" as const },
  { symbol: "006400.KS", name: "삼성SDI",        sector: "2차전지",      market: "KOSPI" as const },
  { symbol: "247540.KS", name: "에코프로비엠",   sector: "2차전지",      market: "KOSDAQ" as const },
  { symbol: "086520.KS", name: "에코프로",       sector: "2차전지",      market: "KOSPI" as const },
  { symbol: "003670.KS", name: "포스코퓨처엠",  sector: "2차전지",      market: "KOSPI" as const },
  { symbol: "011790.KS", name: "SKC",            sector: "2차전지",      market: "KOSPI" as const },
  // 방산
  { symbol: "012450.KS", name: "한화에어로스페이스", sector: "방산",    market: "KOSPI" as const },
  { symbol: "047810.KS", name: "한국항공우주",   sector: "방산",          market: "KOSPI" as const },
  { symbol: "079550.KS", name: "LIG넥스원",      sector: "방산",          market: "KOSPI" as const },
  { symbol: "064350.KS", name: "현대로템",       sector: "방산",          market: "KOSPI" as const },
  // 자동차
  { symbol: "005380.KS", name: "현대차",         sector: "자동차",        market: "KOSPI" as const },
  { symbol: "000270.KS", name: "기아",           sector: "자동차",        market: "KOSPI" as const },
  { symbol: "012330.KS", name: "현대모비스",     sector: "자동차",        market: "KOSPI" as const },
  // 바이오
  { symbol: "207940.KS", name: "삼성바이오로직스", sector: "바이오",     market: "KOSPI" as const },
  { symbol: "068270.KS", name: "셀트리온",       sector: "바이오",        market: "KOSPI" as const },
  { symbol: "000100.KS", name: "유한양행",       sector: "바이오",        market: "KOSPI" as const },
  { symbol: "090430.KS", name: "아모레퍼시픽",  sector: "바이오",        market: "KOSPI" as const },
  // 금융
  { symbol: "105560.KS", name: "KB금융",        sector: "금융",           market: "KOSPI" as const },
  { symbol: "055550.KS", name: "신한지주",      sector: "금융",           market: "KOSPI" as const },
  { symbol: "086790.KS", name: "하나금융지주",  sector: "금융",           market: "KOSPI" as const },
  { symbol: "071050.KS", name: "한국금융지주",  sector: "금융",           market: "KOSPI" as const },
  { symbol: "016360.KS", name: "삼성증권",      sector: "금융",           market: "KOSPI" as const },
  // 철강/소재
  { symbol: "005490.KS", name: "POSCO홀딩스",  sector: "철강/소재",      market: "KOSPI" as const },
  { symbol: "051910.KS", name: "LG화학",        sector: "철강/소재",      market: "KOSPI" as const },
  { symbol: "010120.KS", name: "LS ELECTRIC",  sector: "철강/소재",      market: "KOSPI" as const },
  // 에너지
  { symbol: "010950.KS", name: "S-Oil",         sector: "에너지",         market: "KOSPI" as const },
  { symbol: "034020.KS", name: "두산에너빌리티", sector: "에너지",        market: "KOSPI" as const },
  // 조선/건설
  { symbol: "009540.KS", name: "HD한국조선해양", sector: "조선",          market: "KOSPI" as const },
  { symbol: "010140.KS", name: "삼성중공업",    sector: "조선",           market: "KOSPI" as const },
  { symbol: "042660.KS", name: "한화오션",      sector: "조선",           market: "KOSPI" as const },
  { symbol: "000720.KS", name: "현대건설",      sector: "건설",           market: "KOSPI" as const },
  // 소비재/지주
  { symbol: "033780.KS", name: "KT&G",          sector: "소비재",         market: "KOSPI" as const },
  { symbol: "034730.KS", name: "SK",            sector: "지주/기타",       market: "KOSPI" as const },
  { symbol: "028260.KS", name: "삼성물산",      sector: "지주/기타",       market: "KOSPI" as const },
  { symbol: "003490.KS", name: "대한항공",      sector: "지주/기타",       market: "KOSPI" as const },
  { symbol: "009540.KS", name: "HD한국조선해양", sector: "조선",          market: "KOSPI" as const },
  { symbol: "042670.KS", name: "두산밥캣",      sector: "지주/기타",       market: "KOSPI" as const },
];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

export interface ScreenerSnapshot {
  generatedAt: string;
  date: string;
  total: number;
  breakthroughs: number;
  stocks: ScreenerSnapshotStock[];
}

export interface ScreenerSnapshotStock {
  symbol: string;
  name: string;
  sector: string;
  market: "KOSPI" | "KOSDAQ";
  currentPrice: number;
  high52Week: number;
  low52Week: number;
  changePercent: number;
  /** 조원 */
  marketCapT: number;
  isBreakthrough: boolean;
  /** negative = below 52w high */
  proximityPct: number;
}

async function collectScreenerData(): Promise<ScreenerSnapshotStock[]> {
  // Load extended universe from krx-universe.json if available
  let watchlist = [...BASE_WATCHLIST];
  try {
    const uniPath = path.resolve(process.cwd(), "data", "krx-universe.json");
    if (fs.existsSync(uniPath)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uni: any = JSON.parse(fs.readFileSync(uniPath, "utf8"));
      if (Array.isArray(uni.stocks)) {
        const baseSyms = new Set(watchlist.map((w) => w.symbol.toUpperCase()));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extras = (uni.stocks as any[])
          .filter((s) => !baseSyms.has(`${s.ticker}.KS`.toUpperCase()))
          .slice(0, 300) // cap to avoid excessive API calls
          .map((s) => ({
            symbol: `${s.ticker}.KS`,
            name: s.name as string,
            sector: "기타",
            market: (s.market ?? "KOSPI") as "KOSPI" | "KOSDAQ",
          }));
        watchlist = [...watchlist, ...extras];
      }
    }
  } catch { /* ignore — proceed with base list */ }

  const settled = await Promise.allSettled(
    watchlist.map(async (item): Promise<ScreenerSnapshotStock | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = await withTimeout(yahooFinance.quote(item.symbol), 6000);
        if (!q) return null;

        const currentPrice: number = q.regularMarketPrice ?? 0;
        const high52Week: number = q.fiftyTwoWeekHigh ?? 0;
        const low52Week: number = q.fiftyTwoWeekLow ?? 0;
        const changePercent: number = q.regularMarketChangePercent ?? 0;
        const marketCap: number = q.marketCap ?? 0;

        if (currentPrice <= 0 || high52Week <= 0) return null;

        const proximityPct = (currentPrice / high52Week - 1) * 100;
        // Keep stocks within 10% of 52w high
        if (proximityPct < -10) return null;

        return {
          symbol: item.symbol,
          name: item.name,
          sector: item.sector,
          market: item.market,
          currentPrice,
          high52Week,
          low52Week,
          changePercent,
          marketCapT: Math.round((marketCap / 1e12) * 10) / 10,
          isBreakthrough: currentPrice >= high52Week * 0.9999,
          proximityPct: Math.round(proximityPct * 10) / 10,
        };
      } catch {
        return null;
      }
    })
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<ScreenerSnapshotStock | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is ScreenerSnapshotStock => v !== null)
    .sort((a, b) => b.proximityPct - a.proximityPct);
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("[screener-cron] 수집 시작:", new Date().toISOString());

    const stocks = await collectScreenerData();
    const breakthroughs = stocks.filter((s) => s.isBreakthrough).length;

    const snapshot: ScreenerSnapshot = {
      generatedAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      total: stocks.length,
      breakthroughs,
      stocks,
    };

    // Persist to file
    const outDir = path.resolve(process.cwd(), "data");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "screener-snapshot.json"),
      JSON.stringify(snapshot, null, 2),
      "utf8"
    );

    console.log(
      `[screener-cron] 완료: ${stocks.length}종목, 돌파 ${breakthroughs}건`
    );

    return NextResponse.json({
      success: true,
      generatedAt: snapshot.generatedAt,
      total: snapshot.total,
      breakthroughs: snapshot.breakthroughs,
    });
  } catch (error) {
    console.error("[screener-cron] 오류:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
