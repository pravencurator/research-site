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

// Alpha Vantage GLOBAL_QUOTE (Vercel에서 동작 확인)
async function fetchFromAlphaVantage(
  symbol: string
): Promise<StockPrice | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  // Alpha Vantage는 한국 종목 코드에서 .KS suffix 제거 필요
  const avSymbol = symbol.replace(/\.(KS|T)$/i, "");

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(avSymbol)}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // 레이트 리밋 메시지 감지
    if (data?.Information || data?.Note) return null;

    const quote = data?.["Global Quote"];
    if (!quote || !quote["05. price"]) return null;

    const price = parseFloat(quote["05. price"]);
    const change = parseFloat(quote["09. change"]);
    const changePct = parseFloat(
      (quote["10. change percent"] ?? "0").replace("%", "")
    );

    if (!price) return null;

    return {
      symbol,
      price,
      change: isNaN(change) ? 0 : change,
      changePercent: isNaN(changePct) ? 0 : changePct,
      lastUpdate: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Yahoo Finance에서 주가 조회 (2차 시도)
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

// 주가 조회: Alpha Vantage → Yahoo Finance 순서
export async function fetchStockPrice(
  ticker: string,
  retries: number = 1
): Promise<StockPrice> {
  // 1차: Alpha Vantage (Vercel에서 동작)
  try {
    const avResult = await fetchFromAlphaVantage(ticker);
    if (avResult && avResult.price > 0) return avResult;
  } catch {
    // 무시하고 Yahoo로 넘어감
  }

  // 2차: Yahoo Finance (로컬 환경용)
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await fetchFromYahooFinance(ticker);
      if (result && result.price > 0) return result;
    } catch {
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  console.warn(`All data sources failed for ${ticker}`);

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
  timeoutMs: number = 8000
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
