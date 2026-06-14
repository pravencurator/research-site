// ─────────────────────────────────────────────────────────────────────────────
// DCF Valuation — Damodaran Methodology
// Standard framework used by Goldman Sachs, Morgan Stanley
// ─────────────────────────────────────────────────────────────────────────────

import type { FMPIncomeStatement, FMPKeyMetrics } from "../data-sources/fmp";
import type { MacroIndicators } from "../data-sources/fred";

export type { MacroIndicators } from "../data-sources/fred";

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface DCFAssumptions {
  // Growth
  revenueGrowthY1: number;      // % Year 1
  revenueGrowthY2: number;      // % Year 2
  revenueGrowthY3: number;      // % Year 3
  terminalGrowthRate: number;   // % terminal (usually 2–3%)

  // Margins
  targetEbitdaMargin: number;   // %
  targetCapexToRevenue: number; // %
  taxRate: number;              // %

  // Discount rate
  wacc: number;                 // % Weighted Average Cost of Capital

  // Balance sheet
  netDebt: number;              // millions (negative = net cash)
  sharesOutstanding: number;    // millions
  currentRevenue: number;       // TTM revenue, millions
}

export interface DCFResult {
  intrinsicValue: number;      // per share
  currentPrice: number;
  upside: number;              // %
  enterpriseValue: number;     // total EV (millions)
  projectedFCFs: number[];     // 3 years of FCF projections (millions)
  terminalValue: number;       // millions (undiscounted)
  pvTerminalValue: number;     // millions (discounted)
  pvFCFs: number;              // millions (sum of discounted FCFs)
  assumptions: DCFAssumptions;
  sensitivityMatrix: {
    waccRange: number[];
    terminalGrowthRange: number[];
    intrinsicValues: number[][];
  };
}

// ── Core DCF engine ───────────────────────────────────────────────────────────

export function computeDCF(
  assumptions: DCFAssumptions,
  currentPrice: number = 0
): DCFResult {
  const {
    revenueGrowthY1,
    revenueGrowthY2,
    revenueGrowthY3,
    terminalGrowthRate,
    targetEbitdaMargin,
    targetCapexToRevenue,
    taxRate,
    wacc,
    netDebt,
    sharesOutstanding,
    currentRevenue,
  } = assumptions;

  // Convert percentages to decimals
  const g1 = revenueGrowthY1 / 100;
  const g2 = revenueGrowthY2 / 100;
  const g3 = revenueGrowthY3 / 100;
  const tg = terminalGrowthRate / 100;
  const ebitdaMargin = targetEbitdaMargin / 100;
  const capexRatio = targetCapexToRevenue / 100;
  const tax = taxRate / 100;
  const discountRate = wacc / 100;

  // Project revenues
  const revY1 = currentRevenue * (1 + g1);
  const revY2 = revY1 * (1 + g2);
  const revY3 = revY2 * (1 + g3);

  // FCF = EBITDA * (1 - taxRate) - CapEx
  function fcf(rev: number): number {
    return rev * ebitdaMargin * (1 - tax) - rev * capexRatio;
  }

  const fcfY1 = fcf(revY1);
  const fcfY2 = fcf(revY2);
  const fcfY3 = fcf(revY3);
  const projectedFCFs = [fcfY1, fcfY2, fcfY3];

  // Present values of explicit FCFs
  const pvFCF1 = fcfY1 / Math.pow(1 + discountRate, 1);
  const pvFCF2 = fcfY2 / Math.pow(1 + discountRate, 2);
  const pvFCF3 = fcfY3 / Math.pow(1 + discountRate, 3);
  const pvFCFs = pvFCF1 + pvFCF2 + pvFCF3;

  // Terminal value (Gordon Growth at end of Y3)
  const terminalValue =
    discountRate > tg
      ? (fcfY3 * (1 + tg)) / (discountRate - tg)
      : 0;

  const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 3);

  // Enterprise Value = PV(FCFs) + PV(TV)
  const enterpriseValue = pvFCFs + pvTerminalValue;

  // Equity Value = EV - Net Debt  (netDebt negative = cash positive)
  const equityValue = enterpriseValue - netDebt;

  // Intrinsic value per share
  const intrinsicValue =
    sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;

  // Upside
  const upside =
    currentPrice > 0 ? ((intrinsicValue - currentPrice) / currentPrice) * 100 : 0;

  // Sensitivity matrix: 5×5 (WACC ±2%, ±1% vs TG ±1%, ±0.5%)
  const waccOffsets = [-2, -1, 0, 1, 2];
  const tgOffsets = [-1, -0.5, 0, 0.5, 1];

  const waccRange = waccOffsets.map((d) => wacc + d);
  const terminalGrowthRange = tgOffsets.map((d) => terminalGrowthRate + d);

  const intrinsicValues: number[][] = waccRange.map((w) => {
    const dr = w / 100;
    return terminalGrowthRange.map((t) => {
      const tgr = t / 100;
      if (dr <= tgr) return 0;

      const tv = (fcfY3 * (1 + tgr)) / (dr - tgr);
      const pvTV = tv / Math.pow(1 + dr, 3);
      const pvF1 = fcfY1 / Math.pow(1 + dr, 1);
      const pvF2 = fcfY2 / Math.pow(1 + dr, 2);
      const pvF3 = fcfY3 / Math.pow(1 + dr, 3);
      const ev = pvF1 + pvF2 + pvF3 + pvTV;
      const eq = ev - netDebt;
      return sharesOutstanding > 0
        ? Math.round((eq / sharesOutstanding) * 100) / 100
        : 0;
    });
  });

  return {
    intrinsicValue: Math.round(intrinsicValue * 100) / 100,
    currentPrice,
    upside: Math.round(upside * 10) / 10,
    enterpriseValue: Math.round(enterpriseValue),
    projectedFCFs: projectedFCFs.map((v) => Math.round(v)),
    terminalValue: Math.round(terminalValue),
    pvTerminalValue: Math.round(pvTerminalValue),
    pvFCFs: Math.round(pvFCFs),
    assumptions,
    sensitivityMatrix: {
      waccRange,
      terminalGrowthRange,
      intrinsicValues,
    },
  };
}

// ── Assumption derivation from FMP data ──────────────────────────────────────

function safeNum(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return v;
}

function revenueCAGR(statements: FMPIncomeStatement[], years: number): number | null {
  if (statements.length < 2) return null;
  const sorted = [...statements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const n = Math.min(sorted.length - 1, years);
  const start = sorted[sorted.length - 1 - n];
  const end = sorted[sorted.length - 1];
  if (!start.revenue || start.revenue <= 0) return null;
  return (Math.pow(end.revenue / start.revenue, 1 / n) - 1) * 100;
}

export function deriveAssumptions(
  ticker: string,
  fmpIncome: FMPIncomeStatement[],
  fmpMetrics: FMPKeyMetrics[],
  macroIndicators: MacroIndicators,
  currentPrice: number
): DCFAssumptions {
  // Suppress unused variable warning for ticker (kept for API consistency)
  void ticker;

  // ── Revenue growth ──────────────────────────────────────────────────────────
  const historicCAGR = revenueCAGR(fmpIncome, 3) ?? 10; // default 10%

  // Mean-revert: Y1 = historic, Y2 = (historic + terminal) / 2, Y3 closer to terminal
  const terminalGrowthRate = 2.5;
  const revenueGrowthY1 = Math.min(Math.max(historicCAGR, -10), 50);
  const revenueGrowthY2 = (revenueGrowthY1 + terminalGrowthRate * 2) / 3;
  const revenueGrowthY3 = (revenueGrowthY2 + terminalGrowthRate) / 2;

  // ── Margins from income statements ─────────────────────────────────────────
  const latestIncome = fmpIncome.length > 0 ? fmpIncome[0] : null;
  const rawEbitdaMargin =
    latestIncome && latestIncome.revenue > 0
      ? (latestIncome.ebitda / latestIncome.revenue) * 100
      : 20;
  const targetEbitdaMargin = Math.max(rawEbitdaMargin, 5); // floor 5%

  // CapEx-to-revenue: typical semiconductor ~10-15%; approximated from FCF difference
  const targetCapexToRevenue = 12; // semiconductor sector default

  // Tax rate: estimate from income statements
  let taxRate = 21; // US corporate default
  if (latestIncome) {
    const pretax = latestIncome.netIncome;
    const opIncome = latestIncome.operatingIncome;
    if (opIncome > 0 && pretax < opIncome) {
      const implied = ((opIncome - pretax) / opIncome) * 100;
      taxRate = Math.min(Math.max(implied, 10), 35);
    }
  }

  // ── WACC — Damodaran: Rf + beta * ERP ──────────────────────────────────────
  const treasury10Y = macroIndicators.treasury10Y?.value ?? 4.5;
  const sectorBeta = 1.4; // semiconductor sector beta
  const erp = 5.0;        // equity risk premium
  const wacc = treasury10Y + sectorBeta * erp;

  // ── Balance sheet ───────────────────────────────────────────────────────────
  const latestMetrics = fmpMetrics.length > 0 ? fmpMetrics[0] : null;
  const marketCap = safeNum(latestMetrics?.marketCap) ?? 0;
  const sharesOutstanding =
    currentPrice > 0 && marketCap > 0 ? marketCap / 1e6 / currentPrice : 100; // millions

  // Net debt: approximated — not directly in key-metrics; default 0
  const netDebt = 0;

  // Current revenue: TTM from latest income statement
  const currentRevenue =
    latestIncome && latestIncome.revenue > 0
      ? latestIncome.revenue / 1e6 // convert to millions
      : 1000;

  return {
    revenueGrowthY1: Math.round(revenueGrowthY1 * 10) / 10,
    revenueGrowthY2: Math.round(revenueGrowthY2 * 10) / 10,
    revenueGrowthY3: Math.round(revenueGrowthY3 * 10) / 10,
    terminalGrowthRate,
    targetEbitdaMargin: Math.round(targetEbitdaMargin * 10) / 10,
    targetCapexToRevenue,
    taxRate: Math.round(taxRate * 10) / 10,
    wacc: Math.round(wacc * 10) / 10,
    netDebt,
    sharesOutstanding: Math.round(sharesOutstanding * 10) / 10,
    currentRevenue: Math.round(currentRevenue * 10) / 10,
  };
}

// ── LLM formatting ────────────────────────────────────────────────────────────

export function formatDCFForLLM(dcf: DCFResult): string {
  const a = dcf.assumptions;

  // FCF projection table
  const fcfRows = dcf.projectedFCFs
    .map((fcf, i) => {
      let revStr = "N/A";
      if (a.currentRevenue > 0) {
        const g1 = 1 + a.revenueGrowthY1 / 100;
        const g2 = 1 + a.revenueGrowthY2 / 100;
        const g3 = 1 + a.revenueGrowthY3 / 100;
        const mult = i === 0 ? g1 : i === 1 ? g1 * g2 : g1 * g2 * g3;
        revStr = (a.currentRevenue * mult).toFixed(0);
      }
      return `| Year ${i + 1} | ${revStr}M | ${fcf.toFixed(0)}M |`;
    })
    .join("\n");

  // Sensitivity matrix
  const { waccRange, terminalGrowthRange, intrinsicValues } =
    dcf.sensitivityMatrix;

  const headerRow =
    "| WACC \\ TG | " +
    terminalGrowthRange.map((t) => `${t.toFixed(1)}%`).join(" | ") +
    " |";
  const separator =
    "|-----------|" + terminalGrowthRange.map(() => "------").join("|") + "|";
  const dataRows = waccRange
    .map(
      (w, wi) =>
        `| ${w.toFixed(1)}% | ` +
        intrinsicValues[wi].map((v) => `$${v.toFixed(0)}`).join(" | ") +
        " |"
    )
    .join("\n");

  const upsideStr =
    dcf.upside >= 0
      ? `+${dcf.upside.toFixed(1)}% 상승 여력`
      : `${dcf.upside.toFixed(1)}% 하락 리스크`;

  return `## DCF 내재가치 분석 (Damodaran 방법론)

### 핵심 결과
| 항목 | 값 |
|------|-----|
| 내재가치 (주당) | $${dcf.intrinsicValue.toFixed(2)} |
| 현재 주가 | $${dcf.currentPrice.toFixed(2)} |
| 상승/하락 여력 | ${upsideStr} |
| 기업가치 (EV) | $${(dcf.enterpriseValue / 1000).toFixed(1)}B |
| FCF PV 합계 | $${(dcf.pvFCFs / 1000).toFixed(1)}B |
| 터미널 가치 PV | $${(dcf.pvTerminalValue / 1000).toFixed(1)}B |

### 주요 가정
| 가정 | 값 |
|------|-----|
| WACC | ${a.wacc}% |
| 터미널 성장률 | ${a.terminalGrowthRate}% |
| EBITDA 마진 (목표) | ${a.targetEbitdaMargin}% |
| CapEx/Revenue | ${a.targetCapexToRevenue}% |
| 법인세율 | ${a.taxRate}% |
| 순부채 | $${a.netDebt.toFixed(0)}M |
| 발행주식수 | ${a.sharesOutstanding.toFixed(1)}M주 |

### FCF 프로젝션
| 기간 | 매출 | FCF |
|------|------|-----|
${fcfRows}

### 민감도 분석 — 내재가치 (WACC × 터미널 성장률)
${headerRow}
${separator}
${dataRows}`;
}
