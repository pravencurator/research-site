// ─────────────────────────────────────────────────────────────────────────────
// Fama-French Inspired Factor Scoring Model
// Adapted for individual stock scoring (AQR / Two Sigma / D.E. Shaw style)
// Weights: Value 25%, Quality 25%, Growth 20%, Momentum 15%, Profitability 15%
// ─────────────────────────────────────────────────────────────────────────────

import type { FMPKeyMetrics, FMPIncomeStatement } from "../data-sources/fmp";

export interface FactorScores {
  ticker: string;
  computedAt: string;

  // Each 0-100 score (higher = more attractive)
  valueScore: number;
  qualityScore: number;
  growthScore: number;
  momentumScore: number;
  profitabilityScore: number;

  // Composite
  compositeScore: number;
  conviction: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";

  // Raw inputs (for transparency)
  inputs: {
    peRatio: number | null;
    pbRatio: number | null;
    evToEbitda: number | null;
    roe: number | null;
    roic: number | null;
    grossMargin: number | null;
    debtToEquity: number | null;
    revenueGrowth3Y: number | null;
    epsGrowth3Y: number | null;
    priceReturn12M: number | null;
    operatingMargin: number | null;
  };
}

// ─── Helper: safe number extraction ─────────────────────────────────────────

function safeNum(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!isFinite(value)) return null;
  return value;
}

// ─── Individual metric scoring functions ─────────────────────────────────────

function scorePE(pe: number | null): number {
  if (pe === null) return 50;
  if (pe < 15) return 90;
  if (pe < 25) return 75;
  if (pe < 35) return 60;
  if (pe < 50) return 40;
  return 20;
}

function scorePB(pb: number | null): number {
  if (pb === null) return 50;
  if (pb < 2) return 90;
  if (pb < 4) return 75;
  if (pb < 8) return 55;
  return 30;
}

function scoreEVEBITDA(ev: number | null): number {
  if (ev === null) return 50;
  if (ev < 10) return 90;
  if (ev < 20) return 70;
  if (ev < 30) return 50;
  return 25;
}

function scoreROE(roe: number | null): number {
  if (roe === null) return 50;
  // FMP stores as decimal (0.25 = 25%) — normalise
  const pct = Math.abs(roe) > 2 ? roe : roe * 100;
  if (pct > 25) return 90;
  if (pct >= 15) return 75;
  if (pct >= 8) return 60;
  if (pct >= 0) return 40;
  return 10;
}

function scoreROIC(roic: number | null): number {
  if (roic === null) return 50;
  const pct = Math.abs(roic) > 2 ? roic : roic * 100;
  if (pct > 20) return 90;
  if (pct >= 12) return 75;
  if (pct >= 6) return 60;
  if (pct >= 0) return 40;
  return 10;
}

function scoreGrossMargin(gm: number | null): number {
  if (gm === null) return 50;
  const pct = Math.abs(gm) > 2 ? gm : gm * 100;
  if (pct > 50) return 90;
  if (pct >= 35) return 75;
  if (pct >= 20) return 60;
  return 35;
}

function scoreDebtToEquity(de: number | null): number {
  if (de === null) return 50;
  if (de < 0.3) return 90;
  if (de < 0.7) return 75;
  if (de < 1.5) return 55;
  return 30;
}

function scoreCAGR(cagr: number | null): number {
  if (cagr === null) return 50;
  const pct = Math.abs(cagr) > 2 ? cagr : cagr * 100;
  if (pct > 30) return 90;
  if (pct >= 15) return 80;
  if (pct >= 5) return 65;
  if (pct >= 0) return 45;
  return 20;
}

function scorePriceReturn12M(ret: number | null): number {
  if (ret === null) return 55;
  const pct = Math.abs(ret) > 2 ? ret : ret * 100;
  if (pct > 50) return 90;
  if (pct >= 20) return 80;
  if (pct >= 0) return 65;
  if (pct >= -10) return 45;
  if (pct >= -20) return 30;
  return 15;
}

function scoreOperatingMargin(om: number | null): number {
  if (om === null) return 50;
  const pct = Math.abs(om) > 2 ? om : om * 100;
  if (pct > 25) return 90;
  if (pct >= 15) return 80;
  if (pct >= 8) return 65;
  if (pct >= 0) return 45;
  return 15;
}

// ─── CAGR computation from income statements ─────────────────────────────────

function computeRevenueCAGR(statements: FMPIncomeStatement[]): number | null {
  if (statements.length < 2) return null;
  // Statements are newest-first — take oldest available up to 3 years
  const sorted = [...statements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];
  const years = sorted.length - 1; // number of annual periods
  if (!earliest.revenue || earliest.revenue <= 0) return null;
  const ratio = latest.revenue / earliest.revenue;
  return Math.pow(ratio, 1 / years) - 1; // as decimal
}

function computeEPSCAGR(statements: FMPIncomeStatement[]): number | null {
  if (statements.length < 2) return null;
  const sorted = [...statements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];
  const years = sorted.length - 1;
  if (!earliest.eps || earliest.eps <= 0) return null;
  const ratio = latest.eps / earliest.eps;
  return Math.pow(ratio, 1 / years) - 1;
}

// ─── Average helper (ignores nulls) ─────────────────────────────────────────

function avg(...values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return 50;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

// ─── Main scoring function ───────────────────────────────────────────────────

export function computeFactorScores(
  ticker: string,
  metrics: FMPKeyMetrics[],
  incomeStatements: FMPIncomeStatement[],
  priceReturn12M?: number
): FactorScores {
  // Use most recent metrics entry
  const latest = metrics.length > 0 ? metrics[0] : null;

  // Raw inputs
  const peRatio = safeNum(latest?.peRatio ?? null);
  const pbRatio = safeNum(latest?.pbRatio ?? null);
  const evToEbitda = safeNum(latest?.evToEbitda ?? null);
  const roe = safeNum(latest?.roe ?? null);
  const roic = safeNum(latest?.roic ?? null);
  const debtToEquity = safeNum(latest?.debtToEquity ?? null);

  // Gross margin: derive from latest income statement (ratio stored directly)
  const latestIncome =
    incomeStatements.length > 0 ? incomeStatements[0] : null;
  const grossMarginRaw = safeNum(latestIncome?.grossProfitRatio ?? null);
  // grossProfitRatio is already a ratio (0-1 scale in FMP)
  const grossMargin =
    grossMarginRaw !== null
      ? Math.abs(grossMarginRaw) <= 1
        ? grossMarginRaw * 100
        : grossMarginRaw
      : null;

  // Operating margin
  const operatingMarginRaw = safeNum(
    latestIncome?.operatingIncomeRatio ?? null
  );
  const operatingMargin =
    operatingMarginRaw !== null
      ? Math.abs(operatingMarginRaw) <= 1
        ? operatingMarginRaw * 100
        : operatingMarginRaw
      : null;

  // Growth: use up to last 3 income statements (trimmed from full history)
  const statSlice = incomeStatements.slice(0, 4); // 4 data points = 3-year window
  const revenueGrowth3Y = computeRevenueCAGR(statSlice);
  const epsGrowth3Y = computeEPSCAGR(statSlice);

  const priceRet = priceReturn12M !== undefined ? priceReturn12M : null;

  // ── Factor scores ──────────────────────────────────────────────────────────

  // Value (25%)
  const vPE = scorePE(peRatio);
  const vPB = scorePB(pbRatio);
  const vEV = scoreEVEBITDA(evToEbitda);
  const valueScore = avg(vPE, vPB, vEV);

  // Quality (25%)
  const qROE = scoreROE(roe);
  const qROIC = scoreROIC(roic);
  const qGM = scoreGrossMargin(grossMargin);
  const qDE = scoreDebtToEquity(debtToEquity);
  const qualityScore = avg(qROE, qROIC, qGM, qDE);

  // Growth (20%)
  const gRev = scoreCAGR(revenueGrowth3Y);
  const gEPS = scoreCAGR(epsGrowth3Y);
  const growthScore = avg(gRev, gEPS);

  // Momentum (15%)
  const momentumScore = scorePriceReturn12M(priceRet);

  // Profitability / RMW (15%)
  const profitabilityScore = scoreOperatingMargin(operatingMargin);

  // Composite
  const compositeScore =
    valueScore * 0.25 +
    qualityScore * 0.25 +
    growthScore * 0.2 +
    momentumScore * 0.15 +
    profitabilityScore * 0.15;

  // Conviction
  let conviction: FactorScores["conviction"];
  if (compositeScore >= 78) conviction = "STRONG BUY";
  else if (compositeScore >= 62) conviction = "BUY";
  else if (compositeScore >= 45) conviction = "HOLD";
  else if (compositeScore >= 30) conviction = "SELL";
  else conviction = "STRONG SELL";

  return {
    ticker,
    computedAt: new Date().toISOString(),
    valueScore: Math.round(valueScore * 10) / 10,
    qualityScore: Math.round(qualityScore * 10) / 10,
    growthScore: Math.round(growthScore * 10) / 10,
    momentumScore: Math.round(momentumScore * 10) / 10,
    profitabilityScore: Math.round(profitabilityScore * 10) / 10,
    compositeScore: Math.round(compositeScore * 10) / 10,
    conviction,
    inputs: {
      peRatio,
      pbRatio,
      evToEbitda,
      roe,
      roic,
      grossMargin,
      debtToEquity,
      revenueGrowth3Y,
      epsGrowth3Y,
      priceReturn12M: priceRet,
      operatingMargin,
    },
  };
}

// ─── LLM formatting ──────────────────────────────────────────────────────────

function evalLabel(score: number): string {
  if (score >= 80) return "매우 우수";
  if (score >= 65) return "우수";
  if (score >= 50) return "중립";
  if (score >= 35) return "미흡";
  return "매우 미흡";
}

export function formatFactorScoresForLLM(scores: FactorScores): string {
  const rows = [
    ["밸류에이션 (Value)", scores.valueScore],
    ["수익성 품질 (Quality)", scores.qualityScore],
    ["성장성 (Growth)", scores.growthScore],
    ["모멘텀 (Momentum)", scores.momentumScore],
    ["수익성 안정성 (Profitability/RMW)", scores.profitabilityScore],
  ] as const;

  const tableRows = rows
    .map(
      ([label, score]) =>
        `| ${label} | ${score}/100 | ${evalLabel(score)} |`
    )
    .join("\n");

  const inputLines = [
    `- P/E: ${scores.inputs.peRatio?.toFixed(1) ?? "N/A"}`,
    `- P/B: ${scores.inputs.pbRatio?.toFixed(2) ?? "N/A"}`,
    `- EV/EBITDA: ${scores.inputs.evToEbitda?.toFixed(1) ?? "N/A"}`,
    `- ROE: ${scores.inputs.roe !== null ? (Math.abs(scores.inputs.roe) <= 1 ? (scores.inputs.roe * 100).toFixed(1) : scores.inputs.roe.toFixed(1)) + "%" : "N/A"}`,
    `- ROIC: ${scores.inputs.roic !== null ? (Math.abs(scores.inputs.roic) <= 1 ? (scores.inputs.roic * 100).toFixed(1) : scores.inputs.roic.toFixed(1)) + "%" : "N/A"}`,
    `- 매출총이익률: ${scores.inputs.grossMargin?.toFixed(1) ?? "N/A"}%`,
    `- 부채비율(D/E): ${scores.inputs.debtToEquity?.toFixed(2) ?? "N/A"}`,
    `- 매출 3Y CAGR: ${scores.inputs.revenueGrowth3Y !== null ? (scores.inputs.revenueGrowth3Y * 100).toFixed(1) + "%" : "N/A"}`,
    `- EPS 3Y CAGR: ${scores.inputs.epsGrowth3Y !== null ? (scores.inputs.epsGrowth3Y * 100).toFixed(1) + "%" : "N/A"}`,
    `- 12M 주가 수익률: ${scores.inputs.priceReturn12M !== null ? (Math.abs(scores.inputs.priceReturn12M) <= 1 ? (scores.inputs.priceReturn12M * 100).toFixed(1) : scores.inputs.priceReturn12M.toFixed(1)) + "%" : "N/A"}`,
    `- 영업이익률: ${scores.inputs.operatingMargin?.toFixed(1) ?? "N/A"}%`,
  ].join("\n");

  return `## 퀀트 팩터 스코어 (Fama-French 5팩터 응용)

| 팩터 | 점수 | 평가 |
|------|------|------|
${tableRows}

**종합 컨빅션 점수: ${scores.compositeScore}/100 → [${scores.conviction}]**

### 원시 입력값
${inputLines}

> 산출 기준: ${scores.computedAt}`;
}
