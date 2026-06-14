/**
 * daily-research.ts
 *
 * 매일 오전 11시 KST (02:00 UTC) GitHub Actions에 의해 실행되는 메인 리서치 스크립트.
 *
 * 역할:
 *  1. 분석할 종목 목록 정의
 *  2. Yahoo Finance에서 각 종목의 현재 주가, 52주 고/저, P/E 등 가져오기
 *  3. Alpha Vantage (또는 Yahoo Finance) 뉴스 가져오기
 *  4. Anthropic claude-sonnet으로 CLAUDE.md 품질 기준 준수 리포트 생성
 *  5. reports/ 디렉토리에 마크다운 파일로 저장
 *  6. data/track-record/log.csv에 트랙레코드 기록
 */

import * as path from "path";
import * as fs from "fs";
import {
  buildRichResearchContext,
  generateReport,
  reportFilePath,
  saveReport,
  appendTrackRecord,
} from "./research-agent";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TICKERS = [
  // Korea
  "005930.KS", // 삼성전자
  "000660.KS", // SK하이닉스
  "322000.KS", // 피에스케이홀딩스
  "042700.KS", // 한미반도체
  "009150.KS", // 삼성전기
  // US
  "NVDA",
  "MRVL",
  "AMAT",
  "LRCX",
  "MU",
  "ARM",
  "TSLA",
  // Japan
  "6857.T", // 어드밴테스트
  "8035.T", // 도쿄일렉트론
];

const ROOT_DIR = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT_DIR, "reports");
const TRACK_RECORD_PATH = path.join(ROOT_DIR, "data", "track-record", "log.csv");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getYearMonth(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function getDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

function isAlreadyGenerated(ticker: string, yearMonth: string): boolean {
  const filePath = reportFilePath(ticker, REPORTS_DIR, yearMonth);
  return fs.existsSync(filePath);
}

function resolveTickers(): string[] {
  const override = process.env.OVERRIDE_TICKERS;
  if (override && override.trim()) {
    return override
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return DEFAULT_TICKERS;
}

// ---------------------------------------------------------------------------
// Single-ticker processing
// ---------------------------------------------------------------------------

async function processTicker(
  ticker: string,
  yearMonth: string,
  dateStr: string
): Promise<"skipped" | "success" | "error"> {
  if (isAlreadyGenerated(ticker, yearMonth)) {
    console.log(`[${ticker}] 이미 ${yearMonth} 리포트 존재 — 건너뜀`);
    return "skipped";
  }

  console.log(`[${ticker}] 리서치 컨텍스트 수집 중 (FMP/FRED/DART/퀀트)...`);

  let ctx;
  try {
    ctx = await buildRichResearchContext(ticker);
  } catch (err) {
    console.error(`[${ticker}] 데이터 수집 실패: ${(err as Error).message}`);
    return "error";
  }

  console.log(
    `[${ticker}] 뉴스 ${ctx.news.length}건 수집 완료. 리포트 생성 중...`
  );

  let report: string;
  try {
    report = await generateReport(ctx);
  } catch (err) {
    console.error(`[${ticker}] 리포트 생성 실패: ${(err as Error).message}`);
    return "error";
  }

  const filePath = reportFilePath(ticker, REPORTS_DIR, yearMonth);
  try {
    saveReport(report, filePath);
    console.log(`[${ticker}] 리포트 저장 완료: ${filePath}`);
  } catch (err) {
    console.error(`[${ticker}] 파일 저장 실패: ${(err as Error).message}`);
    return "error";
  }

  try {
    appendTrackRecord(
      ticker,
      dateStr,
      ctx.price.price,
      ctx.price.currency,
      TRACK_RECORD_PATH
    );
  } catch (err) {
    // 트랙레코드 실패는 치명적이지 않음
    console.warn(
      `[${ticker}] 트랙레코드 기록 실패: ${(err as Error).message}`
    );
  }

  return "success";
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Daily Research Agent 시작 ===");
  console.log(`실행 시각 (UTC): ${new Date().toISOString()}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
    process.exit(1);
  }

  const tickers = resolveTickers();
  const yearMonth = getYearMonth();
  const dateStr = getDateStr();

  console.log(`분석 대상: ${tickers.join(", ")}`);
  console.log(`이번 달: ${yearMonth}`);
  console.log("");

  const results: Record<string, "skipped" | "success" | "error"> = {};

  for (const ticker of tickers) {
    results[ticker] = await processTicker(ticker, yearMonth, dateStr);
    // API rate-limit 방지를 위한 간격
    await new Promise((r) => setTimeout(r, 2000));
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n=== 실행 결과 요약 ===");
  const successes = Object.entries(results).filter(([, v]) => v === "success");
  const skipped = Object.entries(results).filter(([, v]) => v === "skipped");
  const errors = Object.entries(results).filter(([, v]) => v === "error");

  console.log(`성공: ${successes.length}건`);
  if (successes.length > 0)
    console.log("  " + successes.map(([t]) => t).join(", "));

  console.log(`건너뜀(중복): ${skipped.length}건`);
  if (skipped.length > 0)
    console.log("  " + skipped.map(([t]) => t).join(", "));

  console.log(`실패: ${errors.length}건`);
  if (errors.length > 0)
    console.log("  " + errors.map(([t]) => t).join(", "));

  if (errors.length > 0) {
    console.warn("\n일부 종목 처리에 실패했습니다. 위 로그를 확인하십시오.");
    process.exit(1);
  }

  console.log("\n=== 완료 ===");
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
