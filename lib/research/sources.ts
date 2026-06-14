import yahooFinance from "../data-sources/yahoo-finance";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ResearchSource {
  name: string;
  type: "news" | "filing" | "report" | "data";
  url?: string;
  credibility: number; // 0-1
}

export interface NewsSearchResult {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  relatedTickers: string[];
  summary: string;
}

export interface FilingInfo {
  ticker: string;
  companyName: string;
  exchange: string;
  currency: string;
  sector?: string;
  industry?: string;
  website?: string;
  description?: string;
  employees?: number;
}

export interface AnalystRating {
  ticker: string;
  consensus: "strongBuy" | "buy" | "hold" | "sell" | "strongSell" | "unknown";
  targetPriceMean?: number;
  targetPriceHigh?: number;
  targetPriceLow?: number;
  numberOfAnalysts?: number;
  currentPrice?: number;
  upside?: number; // percentage
}

export interface PeerCompanyData {
  ticker: string;
  name: string;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  currentPrice?: number;
  currency?: string;
}

// ─────────────────────────────────────────────
// Source registry
// ─────────────────────────────────────────────

export const RESEARCH_SOURCES: ResearchSource[] = [
  // ── 글로벌 IB 리서치 ──────────────────────────────────────────────────────
  { name: "Goldman Sachs Research",      type: "report", credibility: 0.97 },
  { name: "Morgan Stanley Equity Research", type: "report", credibility: 0.96 },
  { name: "JP Morgan Asia Equity",       type: "report", credibility: 0.95 },
  { name: "UBS Tech Research",           type: "report", credibility: 0.92 },
  { name: "Barclays Equity Research",    type: "report", credibility: 0.91 },
  { name: "BofA Securities",             type: "report", credibility: 0.91 },
  { name: "Bernstein Research",          type: "report", credibility: 0.93 },
  { name: "CLSA Asia Research",          type: "report", credibility: 0.90 },
  { name: "Jefferies Tech Research",     type: "report", credibility: 0.89 },
  { name: "Citi Research",               type: "report", credibility: 0.91 },

  // ── 국내 증권사 리서치 ────────────────────────────────────────────────────
  { name: "삼성증권 리서치센터",           type: "report", credibility: 0.92 },
  { name: "미래에셋증권 리서치",           type: "report", credibility: 0.91 },
  { name: "KB증권 리서치",               type: "report", credibility: 0.90 },
  { name: "NH투자증권 리서치",            type: "report", credibility: 0.89 },
  { name: "한국투자증권 리서치",           type: "report", credibility: 0.89 },
  { name: "메리츠증권 리서치",            type: "report", credibility: 0.88 },
  { name: "신한투자증권 리서치",           type: "report", credibility: 0.87 },
  { name: "키움증권 리서치",             type: "report", credibility: 0.85 },
  { name: "대신증권 리서치",             type: "report", credibility: 0.84 },
  { name: "하나증권 리서치",             type: "report", credibility: 0.85 },

  // ── 뉴스 ─────────────────────────────────────────────────────────────────
  { name: "Bloomberg Technology",          type: "news", credibility: 0.95 },
  { name: "Reuters Tech",                  type: "news", credibility: 0.93 },
  { name: "The Information",               type: "news", credibility: 0.91 },
  { name: "Korea Herald Business",         type: "news", credibility: 0.85 },
  { name: "DigiTimes",                     type: "news", credibility: 0.88 },
  { name: "Nikkei Tech",                   type: "news", credibility: 0.87 },
  { name: "Electronic Times (전자신문)",   type: "news", credibility: 0.83 },
  { name: "매일경제 증권부",              type: "news", credibility: 0.82 },
  { name: "한국경제 마켓인사이트",         type: "news", credibility: 0.83 },

  // ── 공시/IR 데이터 ────────────────────────────────────────────────────────
  { name: "DART (전자공시)", type: "filing", credibility: 1.0, url: "https://opendart.fss.or.kr" },
  { name: "DART IR 자료·수시공시", type: "filing", credibility: 1.0, url: "https://opendart.fss.or.kr" },
  { name: "KRX 공시", type: "filing", credibility: 1.0, url: "https://disclosure.krx.co.kr" },
  { name: "SEC EDGAR (8-K/10-Q/10-K)", type: "filing", credibility: 1.0, url: "https://www.sec.gov/cgi-bin/browse-edgar" },
  { name: "회사 IR 자료 (기업설명회)", type: "filing", credibility: 0.95 },
  { name: "실적 컨퍼런스콜 transcript", type: "filing", credibility: 0.95 },

  // ── 학술/퀀트 데이터 ──────────────────────────────────────────────────────
  { name: "Kenneth French Data Library (Fama-French Factors)", type: "data", credibility: 0.99 },
  { name: "FRED (St. Louis Fed)",  type: "data", credibility: 1.0, url: "https://fred.stlouisfed.org" },
  { name: "Financial Modeling Prep", type: "data", credibility: 0.87 },
  { name: "Alpha Vantage",         type: "data", credibility: 0.88 },
  { name: "Yahoo Finance",         type: "data", credibility: 0.85 },
];

// ─────────────────────────────────────────────
// Utility: get sources filtered by type
// ─────────────────────────────────────────────

export function getSourcesByType(
  type: ResearchSource["type"]
): ResearchSource[] {
  return RESEARCH_SOURCES.filter((s) => s.type === type);
}

export function getTopSources(n = 5): ResearchSource[] {
  return [...RESEARCH_SOURCES].sort((a, b) => b.credibility - a.credibility).slice(0, n);
}

// ─────────────────────────────────────────────
// searchNews: Alpha Vantage + Yahoo Finance fallback
// ─────────────────────────────────────────────

export async function searchNews(
  query: string,
  tickers?: string[]
): Promise<NewsSearchResult[]> {
  const results: NewsSearchResult[] = [];

  // 1. Try Alpha Vantage NEWS_SENTIMENT with ticker filter
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (apiKey && tickers && tickers.length > 0) {
    try {
      const tickerParam = tickers.join(",");
      const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(tickerParam)}&topics=technology,finance&limit=20&apikey=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        if (Array.isArray(data.feed)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const item of data.feed as any[]) {
            results.push({
              title: item.title ?? "",
              url: item.url ?? "#",
              source: item.source ?? "Alpha Vantage",
              publishedAt: item.time_published
                ? new Date(
                    item.time_published.replace(
                      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
                      "$1-$2-$3T$4:$5:$6"
                    )
                  ).toISOString()
                : new Date().toISOString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              relatedTickers: item.ticker_sentiment?.map((t: any) => t.ticker) ?? [],
              summary: item.summary ?? "",
            });
          }
        }
      }
    } catch {
      // Fall through to Yahoo
    }
  }

  // 2. Augment / fallback with Yahoo Finance search
  if (results.length < 5) {
    try {
      const searchQuery =
        tickers && tickers.length > 0 ? `${tickers[0]} ${query}` : query;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const yfResult: any = await yahooFinance.search(searchQuery, {
        newsCount: 10,
        quotesCount: 0,
      });

      if (Array.isArray(yfResult.news)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const item of yfResult.news as any[]) {
          results.push({
            title: item.title ?? "",
            url: item.link ?? "#",
            source: item.publisher ?? "Yahoo Finance",
            publishedAt: item.providerPublishTime
              ? new Date(item.providerPublishTime * 1000).toISOString()
              : new Date().toISOString(),
            relatedTickers: item.relatedTickers ?? [],
            summary: item.title ?? "",
          });
        }
      }
    } catch {
      // Ignore
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────
// getLatestFilings: company profile via Yahoo Finance
// ─────────────────────────────────────────────

export async function getLatestFilings(ticker: string): Promise<FilingInfo> {
  const normalized = ticker.toUpperCase().includes(".KS")
    ? ticker.toUpperCase()
    : /^\d{6}$/.test(ticker)
    ? `${ticker}.KS`
    : ticker.toUpperCase();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(normalized);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let summary: any = null;
    try {
      summary = await yahooFinance.quoteSummary(normalized, { modules: ["assetProfile"] });
    } catch {
      // 프로필 조회 실패해도 계속 진행
    }

    const profile = summary?.assetProfile;

    return {
      ticker: normalized,
      companyName: quote?.longName ?? quote?.shortName ?? normalized,
      exchange: quote?.exchange ?? "Unknown",
      currency: quote?.currency ?? "USD",
      sector: profile?.sector ?? quote?.sector,
      industry: profile?.industry ?? quote?.industry,
      website: profile?.website,
      description: profile?.longBusinessSummary,
      employees: profile?.fullTimeEmployees,
    };
  } catch (error) {
    console.error(`getLatestFilings error for ${ticker}:`, error);
    return {
      ticker: normalized,
      companyName: normalized,
      exchange: "Unknown",
      currency: "Unknown",
    };
  }
}

// ─────────────────────────────────────────────
// getAnalystRatings: consensus + target price
// ─────────────────────────────────────────────

export async function getAnalystRatings(
  ticker: string
): Promise<AnalystRating> {
  const normalized = /^\d{6}$/.test(ticker) ? `${ticker}.KS` : ticker.toUpperCase();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let quoteSummaryResult: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let quoteResult: any = null;

    try {
      quoteSummaryResult = await yahooFinance.quoteSummary(normalized, {
        modules: ["financialData", "recommendationTrend"],
      });
    } catch { /* skip */ }

    try {
      quoteResult = await yahooFinance.quote(normalized);
    } catch { /* skip */ }

    const financial = quoteSummaryResult?.financialData;
    const currentPrice: number =
      quoteResult?.regularMarketPrice ?? financial?.currentPrice?.raw ?? 0;

    const targetMean: number | undefined =
      financial?.targetMeanPrice?.raw ?? financial?.targetMeanPrice;
    const targetHigh: number | undefined =
      financial?.targetHighPrice?.raw ?? financial?.targetHighPrice;
    const targetLow: number | undefined =
      financial?.targetLowPrice?.raw ?? financial?.targetLowPrice;
    const numberOfAnalysts: number | undefined =
      financial?.numberOfAnalystOpinions?.raw ??
      financial?.numberOfAnalystOpinions;

    // Recommendation string: "buy", "strongBuy", "hold", etc.
    const rec: string =
      (financial?.recommendationKey as string) ?? "unknown";

    const consensusMap: Record<string, AnalystRating["consensus"]> = {
      strongbuy: "strongBuy",
      buy: "buy",
      hold: "hold",
      sell: "sell",
      strongsell: "strongSell",
    };
    const consensus: AnalystRating["consensus"] =
      consensusMap[rec.toLowerCase()] ?? "unknown";

    const upside =
      targetMean && currentPrice > 0
        ? ((targetMean - currentPrice) / currentPrice) * 100
        : undefined;

    return {
      ticker: normalized,
      consensus,
      targetPriceMean: targetMean,
      targetPriceHigh: targetHigh,
      targetPriceLow: targetLow,
      numberOfAnalysts,
      currentPrice,
      upside,
    };
  } catch (error) {
    console.error(`getAnalystRatings error for ${ticker}:`, error);
    return { ticker: normalized, consensus: "unknown" };
  }
}

// ─────────────────────────────────────────────
// getPeerComparison: fetch key multiples for peer set
// ─────────────────────────────────────────────

// Default peer groups per known tickers
const PEER_MAP: Record<string, string[]> = {
  "005930.KS": ["000660.KS", "MU", "TSM", "INTC"],
  "000660.KS": ["005930.KS", "MU", "TSM"],
  "322000.KS": ["AMAT", "LRCX", "KLAC", "6857.T"],
  NVDA:        ["AMD", "INTC", "MRVL", "QCOM"],
  MRVL:        ["NVDA", "AMD", "AVGO", "QCOM"],
  AMAT:        ["LRCX", "KLAC", "322000.KS"],
  MU:          ["005930.KS", "000660.KS", "WDC"],
  TSM:         ["005930.KS", "INTC", "UMC"],
};

export async function getPeerComparison(
  ticker: string
): Promise<PeerCompanyData[]> {
  const normalized = /^\d{6}$/.test(ticker) ? `${ticker}.KS` : ticker.toUpperCase();
  const peers = PEER_MAP[normalized] ?? PEER_MAP[ticker.toUpperCase()] ?? [];

  if (peers.length === 0) {
    // Fall back to Yahoo Finance similar stocks
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await yahooFinance.quoteSummary(normalized, {
        modules: ["summaryProfile"],
      });
      // Without a dedicated similar-stocks endpoint we return empty
      void result;
    } catch {
      // ignore
    }
    return [];
  }

  const peerDataPromises = peers.map(async (sym): Promise<PeerCompanyData | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = await yahooFinance.quote(sym);
      if (!q) return null;

      return {
        ticker: sym,
        name: q.longName ?? q.shortName ?? sym,
        marketCap: q.marketCap,
        trailingPE: q.trailingPE,
        forwardPE: q.forwardPE,
        priceToBook: q.priceToBook,
        profitMargin: q.profitMargins,
        revenueGrowth: q.revenueGrowth,
        currentPrice: q.regularMarketPrice,
        currency: q.currency,
      };
    } catch {
      return null;
    }
  });

  const settled = await Promise.allSettled(peerDataPromises);
  return settled
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<PeerCompanyData | null>).value as PeerCompanyData);
}
