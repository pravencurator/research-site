import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import {
  searchNews,
  getAnalystRatings,
  getPeerComparison,
} from "@/lib/research/sources";
import type { NewsItem } from "@/app/api/news/route";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PriceData {
  current: number;
  change: number;
  changePercent: number;
  high52?: number;
  low52?: number;
  pe?: number;
  eps?: number;
  marketCap?: number;
  currency?: string;
}

interface AnalystRatingSummary {
  consensus: string;
  targetPrice?: number;
  analysts?: number;
  upside?: number;
}

interface PeerData {
  ticker: string;
  name: string;
  pe?: number;
  margin?: number;
  marketCap?: number;
  currentPrice?: number;
}

interface EarningsData {
  quarter: string;
  eps?: number;
  epsEstimate?: number;
  beat?: boolean;
  revenue?: number;
}

interface ResearchContext {
  ticker: string;
  priceData: PriceData;
  news: NewsItem[];
  analystRating: AnalystRatingSummary;
  peerComparison: PeerData[];
  recentEarnings: EarningsData[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalizeTicker(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (/^\d{6}$/.test(upper)) return `${upper}.KS`;
  return upper;
}

async function fetchPriceData(symbol: string): Promise<PriceData> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = await yahooFinance.quote(symbol);
    if (!q) throw new Error("empty quote");

    return {
      current: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      high52: q.fiftyTwoWeekHigh,
      low52: q.fiftyTwoWeekLow,
      pe: q.trailingPE ?? q.forwardPE,
      eps: q.epsTrailingTwelveMonths,
      marketCap: q.marketCap,
      currency: q.currency,
    };
  } catch {
    return { current: 0, change: 0, changePercent: 0 };
  }
}

async function fetchRecentEarnings(symbol: string): Promise<EarningsData[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary: any = await yahooFinance.quoteSummary(symbol, {
      modules: ["earningsHistory", "earningsTrend"],
    });

    const history = summary?.earningsHistory?.history;
    if (!Array.isArray(history)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return history.slice(-4).map((e: any): EarningsData => {
      const eps: number | undefined = e.epsActual?.raw ?? e.epsActual;
      const epsEst: number | undefined = e.epsEstimate?.raw ?? e.epsEstimate;
      const rev: number | undefined = e.revenue?.raw ?? e.revenue;
      const period: string = e.period ?? e.quarter ?? "";

      return {
        quarter: period,
        eps,
        epsEstimate: epsEst,
        beat: eps !== undefined && epsEst !== undefined ? eps > epsEst : undefined,
        revenue: rev,
      };
    });
  } catch {
    return [];
  }
}

// Convert NewsSearchResult → NewsItem shape
async function fetchNewsForTicker(ticker: string): Promise<NewsItem[]> {
  try {
    const raw = await searchNews(ticker, [ticker]);
    return raw.slice(0, 10).map((r, idx) => ({
      id: `ctx-${idx}-${Date.now()}`,
      title: r.title,
      summary: r.summary,
      url: r.url,
      source: r.source,
      publishedAt: r.publishedAt,
      severity: "normal" as const,
      tickers: r.relatedTickers,
      sentiment: "neutral" as const,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker } = body as { ticker?: string };

    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json(
        { error: "ticker is required" },
        { status: 400 }
      );
    }

    const symbol = normalizeTicker(ticker.trim());

    // Fetch all data in parallel
    const [priceData, newsItems, analystData, peerData, earningsData] =
      await Promise.all([
        fetchPriceData(symbol),
        fetchNewsForTicker(symbol),
        getAnalystRatings(symbol),
        getPeerComparison(symbol),
        fetchRecentEarnings(symbol),
      ]);

    const analystRating: AnalystRatingSummary = {
      consensus: analystData.consensus,
      targetPrice: analystData.targetPriceMean,
      analysts: analystData.numberOfAnalysts,
      upside: analystData.upside,
    };

    const peerComparison: PeerData[] = peerData.map((p) => ({
      ticker: p.ticker,
      name: p.name,
      pe: p.trailingPE ?? p.forwardPE,
      margin: p.profitMargin,
      marketCap: p.marketCap,
      currentPrice: p.currentPrice,
    }));

    const context: ResearchContext = {
      ticker: symbol,
      priceData,
      news: newsItems,
      analystRating,
      peerComparison,
      recentEarnings: earningsData,
    };

    return NextResponse.json(
      {
        success: true,
        data: context,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Research context API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch research context",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
