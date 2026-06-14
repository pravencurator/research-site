import { NextRequest, NextResponse } from "next/server";
import { generateEquityReport, formatReportAsMarkdown } from "@/lib/agents/equity-analyst";
import { fetchStockPrice } from "@/lib/data-sources";
import { writeFile } from "fs/promises";
import { join } from "path";

interface AnalysisRequest {
  ticker: string;
}

// 샘플 회사 정보 (프로덕션에서는 데이터베이스에서 가져옴)
const COMPANY_INFO: Record<
  string,
  { name: string; sector: string; exchange: string }
> = {
  "005930.KS": { name: "삼성전자", sector: "반도체", exchange: "KS" },
  "000660.KS": { name: "SK하이닉스", sector: "반도체", exchange: "KS" },
  "322000.KS": { name: "피에스케이홀딩스", sector: "반도체", exchange: "KS" },
  NVDA: { name: "엔비디아", sector: "AI칩", exchange: "" },
  MRVL: { name: "마벨", sector: "AI칩", exchange: "" },
  AMAT: { name: "어플라이드머터리얼즈", sector: "반도체장비", exchange: "" },
  MU: { name: "마이크론", sector: "메모리", exchange: "" },
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalysisRequest;
    const { ticker } = body;

    if (!ticker) {
      return NextResponse.json(
        { error: "ticker is required" },
        { status: 400 }
      );
    }

    const companyInfo = COMPANY_INFO[ticker.toUpperCase()];
    if (!companyInfo) {
      return NextResponse.json(
        { error: "Unknown ticker", ticker },
        { status: 400 }
      );
    }

    // 현재 주가 데이터 조회
    const priceData = await fetchStockPrice(ticker);

    // SONNET으로 리포트 생성
    const report = await generateEquityReport({
      ticker,
      name: companyInfo.name,
      sector: companyInfo.sector,
      priceData: {
        current: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
      },
    });

    // 마크다운 포맷
    const markdown = formatReportAsMarkdown(
      report,
      ticker,
      companyInfo.name
    );

    // 파일 저장 (프로덕션에서는 데이터베이스에 저장)
    // 임시로 console.log로 표시
    const date = new Date().toISOString().split("T")[0];
    const month = date.slice(0, 7);
    const filename = `report-${ticker.replace(".KS", "").replace(".T", "")}-${month}.md`;

    // 실제 파일 저장 (Vercel에서는 읽기 전용 파일시스템이므로 주의)
    try {
      const reportDir = join(process.cwd(), "reports");
      const filepath = join(reportDir, filename);
      await writeFile(filepath, markdown);
      console.log(`Report saved to ${filepath}`);
    } catch (error) {
      console.warn("Failed to save report file:", error);
      // 파일 저장 실패해도 계속 진행 (API는 성공으로 반환)
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
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze ticker",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 옵션 메서드 처리 (CORS)
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
