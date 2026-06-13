import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

interface HeatmapData {
  symbol: string;
  name: string;
  sector: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
}

const STOCKS = [
  // 한국 반도체
  { symbol: "005930.KS", name: "삼성전자", sector: "반도체", region: "한국" },
  { symbol: "000660.KS", name: "SK하이닉스", sector: "반도체", region: "한국" },
  { symbol: "322000.KS", name: "피에스케이홀딩스", sector: "반도체", region: "한국" },
  { symbol: "009150.KS", name: "삼성전기", sector: "반도체", region: "한국" },
  { symbol: "042700.KS", name: "한미반도체", sector: "반도체", region: "한국" },
  { symbol: "007660.KS", name: "ISU Petasys", sector: "반도체", region: "한국" },

  // 미국 반도체/AI
  { symbol: "NVDA", name: "엔비디아", sector: "AI칩", region: "미국" },
  { symbol: "MRVL", name: "마벨", sector: "AI칩", region: "미국" },
  { symbol: "AMAT", name: "어플라이드 머터리얼즈", sector: "반도체장비", region: "미국" },
  { symbol: "LRCX", name: "라르코", sector: "반도체장비", region: "미국" },
  { symbol: "SNDK", name: "샌디스크", sector: "메모리", region: "미국" },
  { symbol: "MU", name: "마이크론", sector: "메모리", region: "미국" },
  { symbol: "ARM", name: "암홀딩스", sector: "IP", region: "미국" },

  // 일본 반도체
  { symbol: "6857.T", name: "어드밴테스트", sector: "반도체장비", region: "일본" },
  { symbol: "8035.T", name: "도쿄일렉트론", sector: "반도체장비", region: "일본" },
  { symbol: "6976.T", name: "무라타제조", sector: "부품", region: "일본" },
];

async function fetchStockData(symbol: string): Promise<HeatmapData | null> {
  try {
    const stock = STOCKS.find((s) => s.symbol === symbol);
    if (!stock) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(symbol);

    if (!result) return null;

    const price = result.regularMarketPrice || 0;
    const change = result.regularMarketChange || 0;
    const changePercent = result.regularMarketChangePercent || 0;
    const marketCap = result.marketCap || 0;

    return {
      symbol,
      name: stock.name,
      sector: stock.sector,
      region: stock.region,
      price,
      change,
      changePercent,
      marketCap,
    };
  } catch (error) {
    console.error(`Failed to fetch ${symbol}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    // 병렬로 모든 종목 데이터 조회
    const promises = STOCKS.map((stock) => fetchStockData(stock.symbol));
    const results = await Promise.all(promises);

    const data: HeatmapData[] = results.filter((item) => item !== null) as HeatmapData[];

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        count: data.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("Market heatmap error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch market data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
