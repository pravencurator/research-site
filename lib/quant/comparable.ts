// ─────────────────────────────────────────────────────────────────────────────
// Comparable Company Analysis (Comps Table)
// Goldman Sachs / JP Morgan IB standard methodology
// ─────────────────────────────────────────────────────────────────────────────

import type { FMPKeyMetrics } from "../data-sources/fmp";

export interface CompsEntry {
  ticker: string;
  name: string;
  marketCap: number | null;     // billions USD
  peRatio: number | null;
  evToEbitda: number | null;
  pbRatio: number | null;
  revenueGrowth: number | null; // % TTM
  grossMargin: number | null;   // %
  ebitdaMargin: number | null;  // %
  roe: number | null;           // %
  currentPrice: number | null;
  currency: string;
}

export interface CompsAnalysis {
  subject: CompsEntry;
  peers: CompsEntry[];
  sectorMedians: {
    peRatio: number | null;
    evToEbitda: number | null;
    pbRatio: number | null;
    revenueGrowth: number | null;
    grossMargin: number | null;
  };
  // Premium (+) / Discount (-) vs median (%)
  subjectVsMedian: {
    peRatio: number | null;
    evToEbitda: number | null;
    pbRatio: number | null;
  };
  impliedTargetPrice: number | null;
}

// ─── Helper: median of non-null values ───────────────────────────────────────

function median(values: (number | null)[]): number | null {
  const clean = values.filter((v): v is number => v !== null && isFinite(v));
  if (clean.length === 0) return null;
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pctDiff(subject: number | null, ref: number | null): number | null {
  if (subject === null || ref === null || ref === 0) return null;
  return ((subject - ref) / ref) * 100;
}

// ─── Build a CompsEntry from FMP key metrics ─────────────────────────────────

export function buildCompsEntry(
  ticker: string,
  name: string,
  metrics: FMPKeyMetrics | null,
  currentPrice: number | null,
  currency = "USD"
): CompsEntry {
  if (!metrics) {
    return {
      ticker, name, marketCap: null, peRatio: null, evToEbitda: null,
      pbRatio: null, revenueGrowth: null, grossMargin: null, ebitdaMargin: null,
      roe: null, currentPrice, currency,
    };
  }
  return {
    ticker,
    name,
    marketCap: metrics.marketCap ? metrics.marketCap / 1e9 : null,
    peRatio: metrics.peRatio ?? null,
    evToEbitda: metrics.evToEbitda ?? null,
    pbRatio: metrics.pbRatio ?? null,
    revenueGrowth: null,        // populated separately from income statements
    grossMargin: null,          // populated separately
    ebitdaMargin: null,         // populated separately
    roe: metrics.roe ? metrics.roe * 100 : null,
    currentPrice,
    currency,
  };
}

// ─── Main: build comps analysis ──────────────────────────────────────────────

export function buildCompsAnalysis(
  subject: CompsEntry,
  peers: CompsEntry[]
): CompsAnalysis {
  const allPeers = peers.filter(Boolean);

  const sectorMedians = {
    peRatio: median(allPeers.map((p) => p.peRatio)),
    evToEbitda: median(allPeers.map((p) => p.evToEbitda)),
    pbRatio: median(allPeers.map((p) => p.pbRatio)),
    revenueGrowth: median(allPeers.map((p) => p.revenueGrowth)),
    grossMargin: median(allPeers.map((p) => p.grossMargin)),
  };

  const subjectVsMedian = {
    peRatio: pctDiff(subject.peRatio, sectorMedians.peRatio),
    evToEbitda: pctDiff(subject.evToEbitda, sectorMedians.evToEbitda),
    pbRatio: pctDiff(subject.pbRatio, sectorMedians.pbRatio),
  };

  // Implied target price from sector median EV/EBITDA
  // Simplified: if subject trades at X% discount to peers on EV/EBITDA,
  // target = currentPrice * (1 + discount/100 * rerating_factor)
  let impliedTargetPrice: number | null = null;
  if (
    subject.currentPrice !== null &&
    subjectVsMedian.evToEbitda !== null
  ) {
    // If subject at 20% discount to peers → target = current * (1 + 0.20 * 0.5)
    // Partial reversion assumption (50% mean reversion)
    const discount = -subjectVsMedian.evToEbitda / 100;
    impliedTargetPrice = subject.currentPrice * (1 + discount * 0.5);
  }

  return { subject, peers: allPeers, sectorMedians, subjectVsMedian, impliedTargetPrice };
}

// ─── Format for LLM prompt ───────────────────────────────────────────────────

export function formatCompsForLLM(comps: CompsAnalysis): string {
  const fmt = (v: number | null, d = 1, suffix = "") =>
    v === null ? "N/A" : `${v.toFixed(d)}${suffix}`;

  const rows = [comps.subject, ...comps.peers]
    .map((e) =>
      `| ${e.ticker.padEnd(12)} | ${e.name.slice(0, 20).padEnd(20)} | ${fmt(e.marketCap, 1, "B")} | ${fmt(e.peRatio)}x | ${fmt(e.evToEbitda)}x | ${fmt(e.pbRatio)}x | ${fmt(e.roe, 1, "%")} |`
    )
    .join("\n");

  const vs = comps.subjectVsMedian;
  const premDisc = (v: number | null) => {
    if (v === null) return "N/A";
    return v >= 0 ? `+${v.toFixed(1)}% 프리미엄` : `${v.toFixed(1)}% 할인`;
  };

  return `## 동종업체 밸류에이션 비교 (Comps Table)

| 종목 | 회사명 | 시총 | P/E | EV/EBITDA | P/B | ROE |
|------|--------|------|-----|-----------|-----|-----|
${rows}
| **섹터 중앙값** | — | — | ${fmt(comps.sectorMedians.peRatio)}x | ${fmt(comps.sectorMedians.evToEbitda)}x | ${fmt(comps.sectorMedians.pbRatio)}x | — |

**피어 대비 프리미엄/할인:**
- P/E: ${premDisc(vs.peRatio)}
- EV/EBITDA: ${premDisc(vs.evToEbitda)}
- P/B: ${premDisc(vs.pbRatio)}
${comps.impliedTargetPrice ? `\n**Comps 기반 목표주가 (부분 리레이팅 가정):** ${comps.impliedTargetPrice.toFixed(0)}` : ""}`;
}
