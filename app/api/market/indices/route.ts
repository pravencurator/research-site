import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

// ─────────────────────────────────────────────
// Index definitions
// ─────────────────────────────────────────────

interface IndexDef {
  symbol: string;
  label: string;
  category: "equity" | "fx" | "commodity";
}

const INDICES: IndexDef[] = [
  { symbol: "^KS11",    label: "코스피",       category: "equity" },
  { symbol: "^KQ11",    label: "코스닥",       category: "equity" },
  { symbol: "^GSPC",    label: "S&P 500",      category: "equity" },
  { symbol: "^NDX",     label: "나스닥 100",   category: "equity" },
  { symbol: "KRW=X",    label: "달러/원",      category: "fx" },
  { symbol: "DX-Y.NYB", label: "달러 인덱스",  category: "fx" },
  { symbol: "GC=F",     label: "금",           category: "commodity" },
  { symbol: "CL=F",     label: "WTI",          category: "commodity" },
];

// ─────────────────────────────────────────────
// Fallback values (static, delayed)
// ─────────────────────────────────────────────

const FALLBACK: Record<string, { value: number; change: number; changePercent: number }> = {
  "^KS11":    { value: 2745.32, change: 12.5,   changePercent: 0.46 },
  "^KQ11":    { value: 893.14,  change: -3.2,   changePercent: -0.36 },
  "^GSPC":    { value: 5832.04, change: -8.3,   changePercent: -0.14 },
  "^NDX":     { value: 20418.5, change: 45.2,   changePercent: 0.22 },
  "KRW=X":    { value: 1382.50, change: -2.1,   changePercent: -0.15 },
  "DX-Y.NYB": { value: 104.32,  change: 0.18,   changePercent: 0.17 },
  "GC=F":     { value: 2345.80, change: 11.40,  changePercent: 0.49 },
  "CL=F":     { value: 78.34,   change: -0.62,  changePercent: -0.79 },
};

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface IndexData {
  symbol: string;
  label: string;
  category: "equity" | "fx" | "commodity";
  value: number;
  change: number;
  changePercent: number;
  currency?: string;
  isDelayed: boolean;
  lastUpdate: string;
}

// ─────────────────────────────────────────────
// Fetch single index with fallback
// ─────────────────────────────────────────────

async function fetchIndex(def: IndexDef): Promise<IndexData> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(def.symbol);

    if (!result) throw new Error("empty result");

    return {
      symbol: def.symbol,
      label: def.label,
      category: def.category,
      value: result.regularMarketPrice ?? FALLBACK[def.symbol]?.value ?? 0,
      change: result.regularMarketChange ?? FALLBACK[def.symbol]?.change ?? 0,
      changePercent:
        result.regularMarketChangePercent ??
        FALLBACK[def.symbol]?.changePercent ??
        0,
      currency: result.currency ?? undefined,
      isDelayed: false,
      lastUpdate: new Date().toISOString(),
    };
  } catch {
    const fb = FALLBACK[def.symbol] ?? { value: 0, change: 0, changePercent: 0 };
    return {
      symbol: def.symbol,
      label: def.label,
      category: def.category,
      value: fb.value,
      change: fb.change,
      changePercent: fb.changePercent,
      isDelayed: true,
      lastUpdate: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export async function GET() {
  try {
    const results = await Promise.allSettled(INDICES.map(fetchIndex));

    const data: IndexData[] = results.map((r, idx) => {
      if (r.status === "fulfilled") return r.value;
      // Unexpected rejection — return fallback
      const def = INDICES[idx];
      const fb = FALLBACK[def.symbol] ?? { value: 0, change: 0, changePercent: 0 };
      return {
        symbol: def.symbol,
        label: def.label,
        category: def.category,
        value: fb.value,
        change: fb.change,
        changePercent: fb.changePercent,
        isDelayed: true,
        lastUpdate: new Date().toISOString(),
      };
    });

    const anyLive = data.some((d) => !d.isDelayed);

    return NextResponse.json(
      {
        success: true,
        data,
        count: data.length,
        live: anyLive,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Indices API error:", error);

    const fallbackData: IndexData[] = INDICES.map((def) => {
      const fb = FALLBACK[def.symbol] ?? { value: 0, change: 0, changePercent: 0 };
      return {
        symbol: def.symbol,
        label: def.label,
        category: def.category,
        value: fb.value,
        change: fb.change,
        changePercent: fb.changePercent,
        isDelayed: true,
        lastUpdate: new Date().toISOString(),
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: fallbackData,
        count: fallbackData.length,
        live: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  }
}
