import { NextRequest, NextResponse } from "next/server";
import { generateEquityReport, formatReportAsMarkdown } from "@/lib/agents/equity-analyst";
import { buildRichDataContext } from "@/lib/data-sources";
import { runFullQuantAnalysis } from "@/lib/quant";
import { formatMacroContext } from "@/lib/data-sources/fred";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

interface AnalysisRequest {
  ticker: string;
}

const COMPANY_INFO: Record<string, { name: string; sector: string; exchange: string }> = {
  "005930.KS": { name: "삼성전자", sector: "반도체/메모리", exchange: "KS" },
  "000660.KS": { name: "SK하이닉스", sector: "반도체/메모리", exchange: "KS" },
  "322000.KS": { name: "피에스케이홀딩스", sector: "반도체장비", exchange: "KS" },
  "042700.KS": { name: "한미반도체", sector: "반도체장비", exchange: "KS" },
  "009150.KS": { name: "삼성전기", sector: "전자부품", exchange: "KS" },
  "NVDA": { name: "엔비디아", sector: "AI칩/데이터센터", exchange: "US" },
  "MRVL": { name: "마벨테크놀로지", sector: "AI칩/네트워킹", exchange: "US" },
  "AMAT": { name: "어플라이드머터리얼즈", sector: "반도체장비", exchange: "US" },
  "LRCX": { name: "램리서치", sector: "반도체장비", exchange: "US" },
  "MU": { name: "마이크론테크놀로지", sector: "메모리", exchange: "US" },
  "ARM": { name: "암홀딩스", sector: "반도체IP", exchange: "US" },
  "6857.T": { name: "어드밴테스트", sector: "반도체검사장비", exchange: "T" },
  "8035.T": { name: "도쿄일렉트론", sector: "반도체장비", exchange: "T" },
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalysisRequest;
    const { ticker } = body;

    if (!ticker) {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    const companyInfo = COMPANY_INFO[ticker] ?? COMPANY_INFO[ticker.toUpperCase()];
    if (!companyInfo) {
      return NextResponse.json({ error: "Unknown ticker", ticker }, { status: 400 });
    }

    // ── 1. Fetch all data sources in parallel ─────────────────────────────────
    const { price, fmp, macro, dartDisclosures, irSummary } =
      await buildRichDataContext(ticker);

    // ── 2. Run quantitative analysis (factor scores + DCF + comps) ────────────
    const quant = await runFullQuantAnalysis(
      ticker,
      fmp,
      macro,
      price.price
    );

    // ── 3. Build macro context string ─────────────────────────────────────────
    const macroContext = formatMacroContext(macro);

    // ── 4. Build DART / IR context ────────────────────────────────────────────
    const dartContext =
      dartDisclosures.length > 0
        ? dartDisclosures
            .slice(0, 5)
            .map((d) => `- [${d.rcept_dt}] ${d.report_nm}`)
            .join("\n")
        : irSummary.formattedForLLM;

    // ── 5. Extract financial data from FMP ────────────────────────────────────
    const latestIncome = fmp.incomeStatements?.[0];
    const latestMetrics = fmp.keyMetrics?.[0];

    const financialData = {
      revenue: latestIncome?.revenue ? latestIncome.revenue / 1e6 : undefined,
      netIncome: latestIncome?.netIncome ? latestIncome.netIncome / 1e6 : undefined,
      eps: latestMetrics?.netIncomePerShare ?? undefined,
      pe: latestMetrics?.peRatio ?? undefined,
      roe: latestMetrics?.roe ? latestMetrics.roe * 100 : undefined,
      roic: latestMetrics?.roic ? latestMetrics.roic * 100 : undefined,
      grossMargin: latestIncome?.grossProfit && latestIncome?.revenue
        ? (latestIncome.grossProfit / latestIncome.revenue) * 100
        : undefined,
      ebitdaMargin: latestIncome?.ebitda && latestIncome?.revenue
        ? (latestIncome.ebitda / latestIncome.revenue) * 100
        : undefined,
      debtToEquity: latestMetrics?.debtToEquity ?? undefined,
      evToEbitda: latestMetrics?.evToEbitda ?? undefined,
      dcfIntrinsicValue: quant.dcf?.intrinsicValue ?? fmp.dcf?.dcf ?? undefined,
      analystTargetPrice: fmp.analystRating?.targetPrice ?? undefined,
      analystConsensus: fmp.analystRating?.ratingRecommendation ?? undefined,
    };

    // ── 6. Generate IB-grade report ───────────────────────────────────────────
    const report = await generateEquityReport({
      ticker,
      name: companyInfo.name,
      sector: companyInfo.sector,
      priceData: {
        current: price.price,
        change: price.change,
        changePercent: price.changePercent,
        currency: price.currency,
      },
      quantContext: quant.formattedForLLM,
      macroContext,
      financialData,
      dartContext,
    });

    const markdown = formatReportAsMarkdown(report, ticker, companyInfo.name);

    // ── 7. Save report file ───────────────────────────────────────────────────
    const date = new Date().toISOString().split("T")[0];
    const month = date.slice(0, 7);
    const safeTicker = ticker.replace(/\.(KS|T)$/, "");
    const filename = `report-${safeTicker}-${month}.md`;

    try {
      const reportDir = join(process.cwd(), "reports");
      await mkdir(reportDir, { recursive: true });
      await writeFile(join(reportDir, filename), markdown);
      console.log(`[analyze] Report saved: ${filename}`);
    } catch (err) {
      console.warn("[analyze] File save failed (expected on Vercel):", err);
    }

    return NextResponse.json(
      {
        success: true,
        ticker,
        filename,
        report: {
          title: report.title,
          summary: report.summary,
          risks: report.risks,
          conviction: report.conviction,
          targetPrice: report.targetPrice,
          investmentRating: report.investmentRating,
          dcfValue: report.dcfValue,
        },
        quant: {
          compositeScore: quant.factorScores.compositeScore,
          conviction: quant.factorScores.conviction,
          dcfIntrinsicValue: quant.dcf?.intrinsicValue,
          dcfUpside: quant.dcf?.upside,
        },
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[analyze] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze ticker",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
