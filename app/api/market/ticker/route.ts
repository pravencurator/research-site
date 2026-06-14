import { NextResponse } from "next/server";
import { fetchStockPrice } from "@/lib/data-sources";

interface TickerData {
  symbol: string;
  label: string;
  value: number;
  change: number;
  changePercent: number;
  isDelayed?: boolean;
}

const TICKER_INDICES = [
  { symbol: "^KSPI", label: "코스피", exchange: "KS" },
  { symbol: "^GSPC", label: "S&P500", exchange: "" },
  { symbol: "^CCMP", label: "NASDAQ", exchange: "" },
  { symbol: "NVDA", label: "엔비디아", exchange: "" },
  { symbol: "005930.KS", label: "삼성전자", exchange: "KS" },
  { symbol: "000660.KS", label: "SK하이닉스", exchange: "KS" },
  { symbol: "TSLA", label: "테슬라", exchange: "" },
  { symbol: "322000.KS", label: "PSK", exchange: "KS" },
];

// 폴백 데이터
const FALLBACK_TICKERS: TickerData[] = [
  { symbol: "KOSPI", label: "코스피", value: 2745.32, change: 12.5, changePercent: 0.46, isDelayed: true },
  { symbol: "SPX", label: "S&P500", value: 5832.04, change: -8.3, changePercent: -0.14, isDelayed: true },
  { symbol: "CCMP", label: "NASDAQ", value: 18925.68, change: 45.2, changePercent: 0.24, isDelayed: true },
  { symbol: "NVDA", label: "엔비디아", value: 147.23, change: -1.2, changePercent: -0.81, isDelayed: true },
  { symbol: "Samsung", label: "삼성전자", value: 70500, change: 500, changePercent: 0.71, isDelayed: true },
  { symbol: "SK Hynix", label: "SK하이닉스", value: 190000, change: -2500, changePercent: -1.30, isDelayed: true },
  { symbol: "TSLA", label: "테슬라", value: 238.45, change: 5.8, changePercent: 2.50, isDelayed: true },
  { symbol: "PSK", label: "PSK", value: 85000, change: 1500, changePercent: 1.79, isDelayed: true },
];

export async function GET() {
  try {
    const promises = TICKER_INDICES.map(async (ticker) => {
      try {
        const data = await fetchStockPrice(ticker.symbol);
        return {
          symbol: ticker.symbol,
          label: ticker.label,
          value: data.price,
          change: data.change,
          changePercent: data.changePercent,
          isDelayed: data.isDelayed,
        } as TickerData;
      } catch {
        // 개별 종목 실패 시 null 반환 (필터링으로 처리)
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    const tickerData: TickerData[] = [];

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        tickerData.push(result.value);
      }
    }

    // 데이터가 충분하지 않으면 폴백 사용
    const finalData = tickerData.length >= 6 ? tickerData : FALLBACK_TICKERS;

    return NextResponse.json(
      {
        success: true,
        data: finalData,
        timestamp: new Date().toISOString(),
        count: finalData.length,
        fallback: finalData === FALLBACK_TICKERS,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Ticker API error:", error);

    // 에러 발생 시 폴백 데이터 반환
    return NextResponse.json(
      {
        success: true,
        data: FALLBACK_TICKERS,
        timestamp: new Date().toISOString(),
        fallback: true,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  }
}
