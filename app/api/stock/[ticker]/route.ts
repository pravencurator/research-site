import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ApiResponse {
  success: boolean;
  ticker: string;
  name?: string;
  period?: string;
  data: HistoricalData[];
  currency?: string;
  timestamp?: string;
  error?: string;
}

const PERIOD_CONFIG: Record<string, { days: number; interval: "1d" | "1wk" }> = {
  "1M": { days: 30, interval: "1d" },
  "3M": { days: 90, interval: "1d" },
  "6M": { days: 180, interval: "1d" },
  "1Y": { days: 365, interval: "1d" },
  "3Y": { days: 1095, interval: "1wk" },
};

async function fetchHistoricalData(
  ticker: string,
  period: string = "1Y"
): Promise<HistoricalData[]> {
  try {
    // 한국 종목 자동 감지 및 .KS 추가
    const cleaned = ticker.toUpperCase().replace(".KS", "");
    const isKorean = /^\d{6}$/.test(cleaned);
    const symbol = isKorean ? `${cleaned}.KS` : ticker.toUpperCase();

    const config = PERIOD_CONFIG[period] || PERIOD_CONFIG["1Y"];

    // 조회 시작일 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - config.days);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = null;

    // 재시도 로직 (최대 2회)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await yahooFinance.historical(symbol, {
          period1: startDate,
          period2: endDate,
          interval: config.interval,
        });

        if (result && result.length > 0) {
          break;
        }
      } catch (error) {
        console.warn(
          `Attempt ${attempt + 1} failed for ${symbol}:`,
          error instanceof Error ? error.message : "Unknown error"
        );
        if (attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!result || result.length === 0) {
      console.warn(`No historical data found for ${symbol}`);
      return [];
    }

    // OHLCV 데이터로 변환
    const data: HistoricalData[] = result.map((item: any) => ({
      date: item.date.toISOString().split("T")[0],
      open: item.open || 0,
      high: item.high || 0,
      low: item.low || 0,
      close: item.close || 0,
      volume: item.volume || 0,
    }));

    return data;
  } catch (error) {
    console.error(`Failed to fetch historical data for ${ticker}:`, error);
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "1Y";

    if (!["1M", "3M", "6M", "1Y", "3Y"].includes(period)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid period",
          ticker,
        },
        { status: 400 }
      );
    }

    const data = await fetchHistoricalData(ticker, period);

    if (data.length === 0) {
      // 샘플 데이터 반환
      return NextResponse.json(
        {
          success: true,
          ticker,
          period,
          data: generateSampleData(50),
          isSample: true,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        ticker,
        period,
        data,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Stock API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 샘플 데이터 생성 (개발/테스트용)
function generateSampleData(days: number): HistoricalData[] {
  const data: HistoricalData[] = [];
  let basePrice = 100;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // 랜덤 변동
    const change = (Math.random() - 0.48) * 5;
    const open = basePrice + change;
    const close = open + (Math.random() - 0.5) * 3;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    const volume = Math.floor(Math.random() * 10000000 + 5000000);

    data.push({
      date: date.toISOString().split("T")[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    basePrice = close;
  }

  return data;
}
