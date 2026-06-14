import { NextResponse } from "next/server";
import { fetchStockPrice } from "@/lib/data-sources";

// 분석 대상 종목 (매일 순환 — 하루 5개씩)
const ALL_TICKERS = [
  { symbol: "005930.KS", name: "삼성전자",       sector: "반도체",   exchange: "KS" },
  { symbol: "000660.KS", name: "SK하이닉스",      sector: "반도체",   exchange: "KS" },
  { symbol: "322000.KS", name: "피에스케이홀딩스", sector: "반도체",   exchange: "KS" },
  { symbol: "042700.KS", name: "한미반도체",       sector: "반도체",   exchange: "KS" },
  { symbol: "009150.KS", name: "삼성전기",         sector: "반도체",   exchange: "KS" },
  { symbol: "NVDA",      name: "엔비디아",          sector: "AI칩",    exchange: ""   },
  { symbol: "MRVL",      name: "마벨",              sector: "AI칩",    exchange: ""   },
  { symbol: "AMAT",      name: "어플라이드머터리얼즈", sector: "반도체장비", exchange: "" },
  { symbol: "LRCX",      name: "램리서치",          sector: "반도체장비", exchange: "" },
  { symbol: "MU",        name: "마이크론",          sector: "메모리",  exchange: ""   },
  { symbol: "ARM",       name: "암홀딩스",          sector: "IP",      exchange: ""   },
  { symbol: "6857.T",    name: "어드밴테스트",       sector: "반도체장비", exchange: "T" },
  { symbol: "8035.T",    name: "도쿄일렉트론",       sector: "반도체장비", exchange: "T" },
];

// 오늘 날짜 기반 로테이션 (5개씩 순환)
function getTodaysTickers() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const startIdx = (dayOfYear * 5) % ALL_TICKERS.length;
  const tickers = [];
  for (let i = 0; i < 5; i++) {
    tickers.push(ALL_TICKERS[(startIdx + i) % ALL_TICKERS.length]);
  }
  return tickers;
}

// GitHub API로 파일 커밋
async function commitToGitHub(
  filename: string,
  content: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return { success: false, error: "GITHUB_TOKEN or GITHUB_REPO not set" };
  }

  try {
    const base64Content = Buffer.from(content, "utf-8").toString("base64");
    const apiUrl = `https://api.github.com/repos/${repo}/contents/reports/${filename}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // 기존 파일 SHA 확인 (업데이트 시 필요)
    let sha: string | undefined;
    const checkRes = await fetch(apiUrl, { headers });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // 파일 생성/업데이트
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message,
        content: base64Content,
        ...(sha ? { sha } : {}),
        committer: {
          name: "AI Research Agent",
          email: "research-agent@noreply.github.com",
        },
      }),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text();
      return { success: false, error: `GitHub API error ${putRes.status}: ${errBody}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// 리포트 마크다운 포맷
function buildReportMarkdown(
  ticker: { symbol: string; name: string; sector: string; exchange: string },
  reportContent: string,
  priceInfo: { price: number; change: number; changePercent: number }
): string {
  const today = new Date().toISOString().split("T")[0];
  const month = today.slice(0, 7);

  return `---
title: "AI 리서치 리포트: ${ticker.name}"
ticker: "${ticker.symbol.replace(".KS", "").replace(".T", "")}"
exchange: "${ticker.exchange}"
sector: "${ticker.sector}"
date: "${today}"
difficulty: "중급"
summary: "${ticker.name} AI 자동 분석 리포트 (${month})"
tags: ["${ticker.sector}", "AI리서치", "자동생성"]
---

# ${ticker.name} (${ticker.symbol}) — ${month} 리서치 리포트

> **현재가**: ${priceInfo.price.toLocaleString()} | **등락률**: ${priceInfo.changePercent.toFixed(2)}% | **출처**: Yahoo Finance | **기준일**: ${today}

${reportContent}

---

*이 리포트는 AI Research Agent(SONNET)가 자동 생성하였습니다.*
*작성일: ${today} | 분석 모델: claude-sonnet-4-6*
`;
}

export async function GET(request: Request) {
  // Cron 보안 검증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: {
    ticker: string;
    status: "success" | "skipped" | "error";
    filename?: string;
    error?: string;
  }[] = [];

  const todaysTickers = getTodaysTickers();
  const today = new Date().toISOString().split("T")[0];
  const month = today.slice(0, 7);

  for (const ticker of todaysTickers) {
    const filename = `report-${ticker.symbol.replace(".KS", "").replace(".T", "")}-${month}.md`;

    try {
      // 주가 데이터 수집
      const priceData = await fetchStockPrice(ticker.symbol);

      // SONNET으로 리포트 생성 (Anthropic SDK)
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const systemPrompt = `당신은 반도체·AI 섹터 전문 투자 애널리스트입니다.
다음 규칙을 반드시 준수하세요:
1. 제목은 메타포 형식 (설명형 불가)
2. "시장이 놓친 알파" 섹션 필수
3. 한 줄 결론: 강세 근거 + 리스크 양면성
4. 경쟁 포지셔닝 삼분법 표 (1차수혜/보완/압박)
5. 가격 반영도 평가 명시
6. 모든 수치: (값 | 출처 | 날짜) 3종 세트
7. 마크다운 형식으로 출력`;

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `**종목**: ${ticker.name} (${ticker.symbol})
**섹터**: ${ticker.sector}
**현재가**: ${priceData.price.toLocaleString()} (${priceData.changePercent.toFixed(2)}%)
**기준일**: ${today}

위 종목에 대한 투자 분석 리포트를 작성하세요. 다음 섹션을 포함해야 합니다:

## [메타포 형식 제목]

**한 줄 결론**: [강세 근거 + 리스크의 양면성]

## 시장이 놓친 알파
[시장 컨센서스와 다른 핵심 인사이트]

## 비즈니스 분석
[핵심 사업 구조 및 경쟁력]

## 경쟁 포지셔닝
| 구분 | 기업 | 관계 |
|------|------|------|
| 1차 수혜 | ... | ... |
| 보완 | ... | ... |
| 압박 | ... | ... |

## 가격 반영도 평가
[현재 주가가 실적/전망을 얼마나 반영하는지]

## 리스크 팩터
- [리스크 1]
- [리스크 2]

## 최종 투자 의견
[결론 및 모니터링 포인트]`,
          },
        ],
      });

      const reportContent =
        message.content[0].type === "text" ? message.content[0].text : "";

      const markdown = buildReportMarkdown(ticker, reportContent, {
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
      });

      // GitHub에 커밋
      const commitResult = await commitToGitHub(
        filename,
        markdown,
        `🤖 Auto Research: ${ticker.name} (${month})`
      );

      if (!commitResult.success) {
        // GitHub 커밋 실패해도 리포트 생성은 성공으로 처리
        console.warn(
          `GitHub commit failed for ${ticker.symbol}: ${commitResult.error}`
        );
      }

      results.push({ ticker: ticker.symbol, status: "success", filename });
    } catch (error) {
      console.error(`Research failed for ${ticker.symbol}:`, error);
      results.push({
        ticker: ticker.symbol,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown",
      });
    }

    // 종목 사이 지연 (API 레이트 리미트)
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const summary = {
    date: today,
    total: todaysTickers.length,
    success: results.filter((r) => r.status === "success").length,
    error: results.filter((r) => r.status === "error").length,
    results,
  };

  return NextResponse.json(summary);
}
