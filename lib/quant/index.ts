// ─────────────────────────────────────────────────────────────────────────────
// Quantitative Analysis Engine — Master Export
// Fama-French 5-Factor + Damodaran DCF + IB Comps Table
// ─────────────────────────────────────────────────────────────────────────────

export * from "./factor-model";
export * from "./dcf";
export * from "./comparable";

import type { FMPFinancialData } from "../data-sources/fmp";
import type { MacroIndicators } from "../data-sources/fred";
import { computeFactorScores, formatFactorScoresForLLM, type FactorScores } from "./factor-model";
import { computeDCF, deriveAssumptions, formatDCFForLLM, type DCFResult } from "./dcf";
import { formatCompsForLLM } from "./comparable";

export interface FullQuantResult {
  factorScores: FactorScores;
  dcf: DCFResult | null;
  formattedForLLM: string;  // all sections combined for LLM prompt injection
}

/**
 * Run the complete quantitative analysis pipeline.
 * Used by equity-analyst.ts and scripts/research-agent.ts before calling Claude.
 */
export async function runFullQuantAnalysis(
  ticker: string,
  fmpData: FMPFinancialData,
  macro: MacroIndicators,
  currentPrice: number,
  priceReturn12M?: number
): Promise<FullQuantResult> {
  // 1. Factor scores (Fama-French 5-factor)
  const latestMetrics = fmpData.keyMetrics?.[0] ?? null;
  const factorScores = computeFactorScores(
    ticker,
    latestMetrics ? [latestMetrics] : [],
    fmpData.incomeStatements ?? [],
    priceReturn12M
  );

  // 2. DCF valuation (Damodaran methodology)
  let dcf: DCFResult | null = null;
  try {
    if (fmpData.incomeStatements.length > 0 && latestMetrics) {
      const assumptions = deriveAssumptions(
        ticker,
        fmpData.incomeStatements,
        [latestMetrics],
        macro,
        currentPrice
      );
      dcf = computeDCF(assumptions);
    }
  } catch (err) {
    console.warn(`[quant] DCF computation failed for ${ticker}:`, err);
  }

  // 3. Combine formatted sections for LLM
  const sections: string[] = [];

  sections.push(formatFactorScoresForLLM(factorScores));

  if (dcf) {
    sections.push(formatDCFForLLM(dcf));
  } else if (fmpData.dcf) {
    // Fall back to FMP's own DCF estimate
    sections.push(
      `## FMP DCF 내재가치 추정\n` +
      `- FMP 모델 내재가치: ${fmpData.dcf.dcf.toFixed(2)}\n` +
      `- 현재가: ${fmpData.dcf.stockPrice.toFixed(2)}\n` +
      `- 상승여력: ${fmpData.dcf.upside.toFixed(1)}%`
    );
  }

  return {
    factorScores,
    dcf,
    formattedForLLM: sections.join("\n\n"),
  };
}
