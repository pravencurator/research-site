import { NextResponse } from "next/server";
import { fetchStockPrice } from "@/lib/data-sources";

interface HeatmapData {
  symbol: string;
  name: string;
  sector: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  isDelayed?: boolean;
  lastUpdate?: string;
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
  { symbol: "MU", name: "마이크론", sector: "메모리", region: "미국" },
  { symbol: "ARM", name: "암홀딩스", sector: "IP", region: "미국" },

  // 일본 반도체
  { symbol: "6857.T", name: "어드밴테스트", sector: "반도체장비", region: "일본" },
  { symbol: "8035.T", name: "도쿄일렉트론", sector: "반도체장비", region: "일본" },
  { symbol: "6976.T", name: "무라타제조", sector: "부품", region: "일본" },
];

async function fetchStockData(
  symbol: string,
  maxRetries: number = 2
): Promise<HeatmapData | null> {
  try {
    const stock = STOCKS.find((s) => s.symbol === symbol);
    if (!stock) return null;

    let lastError: Error | null = null;

    // 재시도 로직
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const data = await fetchStockPrice(symbol);

        if (data && data.price > 0) {
          return {
            symbol,
            name: stock.name,
            sector: stock.sector,
            region: stock.region,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            isDelayed: data.isDelayed,
            lastUpdate: data.lastUpdate,
          };
        }
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          // 재시도 전 500ms 대기
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    console.warn(
      `Failed to fetch ${symbol} after ${maxRetries} attempts:`,
      lastError
    );
    return null;
  } catch (error) {
    console.error(`Error in fetchStockData for ${symbol}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    // 타임아웃을 포함한 병렬 요청
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 8000)
    );

    const promises = STOCKS.map((stock) =>
      Promise.race([
        fetchStockData(stock.symbol, 2),
        timeoutPromise,
      ])
    );

    const results = await Promise.allSettled(promises);

    const data: HeatmapData[] = results
      .filter((result) => result.status === "fulfilled" && result.value !== null)
      .map((result) => (result as PromiseFulfilledResult<HeatmapData | null>).value)
      .filter((item): item is HeatmapData => item !== null);

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        count: data.length,
        total: STOCKS.length,
        failureCount: STOCKS.length - data.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
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
        data: [],
      },
      { status: 500 }
    );
  }
}
