import yahooFinance from "yahoo-finance2";

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
  isDelayed?: boolean;
  lastUpdate?: string;
}

export interface HeatmapStockData {
  symbol: string;
  name: string;
  sector: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume?: number;
  isDelayed?: boolean;
  lastUpdate?: string;
}

// 한국 종목 여부 판단
export function isKoreanStock(ticker: string): boolean {
  const cleaned = ticker.toUpperCase().replace(".KS", "");
  return /^\d{6}$/.test(cleaned);
}

// 티커 정규화
export function normalizeTicker(ticker: string): string {
  const cleaned = ticker.toUpperCase();
  if (isKoreanStock(ticker)) {
    return cleaned.includes(".KS") ? cleaned : `${cleaned}.KS`;
  }
  return cleaned;
}

// Yahoo Finance에서 주가 조회 (1차 시도)
export async function fetchFromYahooFinance(
  symbol: string
): Promise<StockPrice | null> {
  try {
    const normalizedSymbol = normalizeTicker(symbol);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(normalizedSymbol);

    if (!result) return null;

    return {
      symbol,
      price: result.regularMarketPrice || 0,
      change: result.regularMarketChange || 0,
      changePercent: result.regularMarketChangePercent || 0,
      currency: result.currency,
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Yahoo Finance fetch failed for ${symbol}:`, error);
    return null;
  }
}

// 페일오버로 실제 데이터 반환 (재시도 로직 포함)
export async function fetchStockPrice(
  ticker: string,
  retries: number = 2
): Promise<StockPrice> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await fetchFromYahooFinance(ticker);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries - 1) {
        // 재시도 전 1초 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  console.warn(
    `Failed to fetch ${ticker} after ${retries} attempts:`,
    lastError
  );

  // 최종 폴백: null 반환 (API 호출자가 처리)
  return {
    symbol: ticker,
    price: 0,
    change: 0,
    changePercent: 0,
    isDelayed: true,
  };
}

// 여러 종목을 병렬로 조회 (타임아웃 포함)
export async function fetchMultipleStocks(
  tickers: string[],
  timeoutMs: number = 5000
): Promise<StockPrice[]> {
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs)
  );

  const promises = tickers.map((ticker) =>
    Promise.race([fetchStockPrice(ticker), timeoutPromise])
  );

  const results = await Promise.allSettled(promises);

  return results
    .filter((result) => result.status === "fulfilled")
    .map((result) => (result as PromiseFulfilledResult<StockPrice | null>).value)
    .filter((price): price is StockPrice => price !== null);
}
