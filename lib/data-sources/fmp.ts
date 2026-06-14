// ─────────────────────────────────────────────
// Financial Modeling Prep (FMP) API
// Free tier: 250 req/day
// Base URL: https://financialmodelingprep.com/api/v3
// ─────────────────────────────────────────────

export interface FMPIncomeStatement {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
  grossProfitRatio: number;
  operatingIncomeRatio: number;
  netIncomeRatio: number;
}

export interface FMPKeyMetrics {
  date: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  bookValuePerShare: number;
  tangibleBookValuePerShare: number;
  roic: number;         // Return on Invested Capital
  roe: number;          // Return on Equity
  roa: number;          // Return on Assets
  debtToEquity: number;
  debtToAssets: number;
  currentRatio: number;
  peRatio: number;
  pbRatio: number;
  evToEbitda: number;
  priceToSalesRatio: number;
  marketCap: number;
}

export interface FMPDCFValuation {
  symbol: string;
  date: string;
  dcf: number;           // intrinsic value per share
  stockPrice: number;    // current price
  upside: number;        // (dcf - stockPrice) / stockPrice * 100
}

export interface FMPAnalystRating {
  symbol: string;
  date: string;
  rating: string;        // "Buy", "Strong Buy", "Hold", etc.
  ratingScore: number;   // 1-5
  ratingRecommendation: string;
  targetPrice?: number;
  analystCount?: number;
}

export interface FMPFinancialData {
  incomeStatements: FMPIncomeStatement[];  // 5 years annual
  keyMetrics: FMPKeyMetrics[];              // 5 years annual
  dcf: FMPDCFValuation | null;
  analystRating: FMPAnalystRating | null;
}

const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

async function fetchFMPIncomeStatements(
  ticker: string,
  limit = 5
): Promise<FMPIncomeStatement[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `${FMP_BASE_URL}/income-statement/${encodeURIComponent(ticker)}?limit=${limit}&apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`FMP income-statement fetch failed for ${ticker}: ${res.status}`);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: any): FMPIncomeStatement => ({
      date: item.date ?? "",
      revenue: item.revenue ?? 0,
      grossProfit: item.grossProfit ?? 0,
      operatingIncome: item.operatingIncome ?? 0,
      netIncome: item.netIncome ?? 0,
      eps: item.eps ?? 0,
      ebitda: item.ebitda ?? 0,
      grossProfitRatio: item.grossProfitRatio ?? 0,
      operatingIncomeRatio: item.operatingIncomeRatio ?? 0,
      netIncomeRatio: item.netIncomeRatio ?? 0,
    }));
  } catch (err) {
    console.warn(`FMP income-statement error for ${ticker}:`, err);
    return [];
  }
}

async function fetchFMPKeyMetrics(
  ticker: string,
  limit = 5
): Promise<FMPKeyMetrics[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `${FMP_BASE_URL}/key-metrics/${encodeURIComponent(ticker)}?limit=${limit}&apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`FMP key-metrics fetch failed for ${ticker}: ${res.status}`);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((item: any): FMPKeyMetrics => ({
      date: item.date ?? "",
      revenuePerShare: item.revenuePerShare ?? 0,
      netIncomePerShare: item.netIncomePerShare ?? 0,
      operatingCashFlowPerShare: item.operatingCashFlowPerShare ?? 0,
      freeCashFlowPerShare: item.freeCashFlowPerShare ?? 0,
      bookValuePerShare: item.bookValuePerShare ?? 0,
      tangibleBookValuePerShare: item.tangibleBookValuePerShare ?? 0,
      roic: item.roic ?? 0,
      roe: item.roe ?? 0,
      roa: item.roa ?? 0,
      debtToEquity: item.debtToEquity ?? 0,
      debtToAssets: item.debtToAssets ?? 0,
      currentRatio: item.currentRatio ?? 0,
      peRatio: item.peRatio ?? 0,
      pbRatio: item.pbRatio ?? 0,
      evToEbitda: item.evToEbitda ?? 0,
      priceToSalesRatio: item.priceToSalesRatio ?? 0,
      marketCap: item.marketCap ?? 0,
    }));
  } catch (err) {
    console.warn(`FMP key-metrics error for ${ticker}:`, err);
    return [];
  }
}

async function fetchFMPDCF(ticker: string): Promise<FMPDCFValuation | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `${FMP_BASE_URL}/discounted-cash-flow/${encodeURIComponent(ticker)}?apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`FMP DCF fetch failed for ${ticker}: ${res.status}`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // API may return an array or a single object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item: any = Array.isArray(data) ? data[0] : data;
    if (!item || !item.symbol) return null;

    const dcf: number = item.dcf ?? 0;
    const stockPrice: number = item["Stock Price"] ?? item.stockPrice ?? 0;
    const upside =
      stockPrice > 0 ? ((dcf - stockPrice) / stockPrice) * 100 : 0;

    return {
      symbol: item.symbol,
      date: item.date ?? new Date().toISOString().slice(0, 10),
      dcf,
      stockPrice,
      upside,
    };
  } catch (err) {
    console.warn(`FMP DCF error for ${ticker}:`, err);
    return null;
  }
}

async function fetchFMPAnalystRating(
  ticker: string
): Promise<FMPAnalystRating | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `${FMP_BASE_URL}/analyst-stock-recommendations/${encodeURIComponent(ticker)}?limit=1&apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`FMP analyst-rating fetch failed for ${ticker}: ${res.status}`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const item = data[0];
    return {
      symbol: item.symbol ?? ticker,
      date: item.date ?? "",
      rating: item.rating ?? "",
      ratingScore: item.ratingScore ?? 0,
      ratingRecommendation: item.ratingRecommendation ?? "",
      targetPrice: item.targetPrice ?? undefined,
      analystCount: item.analystCount ?? undefined,
    };
  } catch (err) {
    console.warn(`FMP analyst-rating error for ${ticker}:`, err);
    return null;
  }
}

export async function getFMPFinancialData(
  ticker: string
): Promise<FMPFinancialData> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn("FMP_API_KEY not set — skipping FMP data fetch");
    return { incomeStatements: [], keyMetrics: [], dcf: null, analystRating: null };
  }

  const [incomeStatements, keyMetrics, dcf, analystRating] = await Promise.all([
    fetchFMPIncomeStatements(ticker),
    fetchFMPKeyMetrics(ticker),
    fetchFMPDCF(ticker),
    fetchFMPAnalystRating(ticker),
  ]);

  return { incomeStatements, keyMetrics, dcf, analystRating };
}
