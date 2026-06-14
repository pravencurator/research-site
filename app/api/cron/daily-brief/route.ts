import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const BLOG_PATH = path.join(process.cwd(), "content", "blog");

const SYSTEM_PROMPT = `당신은 메르(전문 투자 블로거) 스타일로 매일 데일리 시장 브리핑을 작성하는 AI입니다.
번호 붙인 단락 형식(1. 2. 3. ...), 지정학→거시경제→섹터→종목 체인 구조로 작성하세요.
각 번호 단락은 2-4문장, 전체 15-20개 단락. 투자 의사결정에 직접 도움이 되는 밀도 높은 내용.

작성 원칙:
- 지정학·정책 변화 → 거시경제 영향 → 해당 섹터 전달 경로 → 구체적 종목 영향으로 이어지는 논리 체인을 유지할 것
- 수치는 구체적으로 명시(%, 달러, 배수 등)하고, 추정치는 "(추정)"으로 표시
- 강세 논거와 리스크를 균형 있게 다룰 것
- 각 단락은 독립적으로 읽혀도 이해될 수 있어야 함
- 한국어로 작성`;

async function fetchAlphaVantageNews(tickers: string): Promise<string> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return "Alpha Vantage API 키가 설정되지 않아 뉴스를 가져오지 못했습니다.";
  }

  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(tickers)}&apikey=${apiKey}&limit=20`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return `뉴스 API 오류: HTTP ${res.status}`;
    }
    const data = await res.json();

    if (!data.feed || !Array.isArray(data.feed)) {
      return "뉴스 피드를 파싱할 수 없습니다.";
    }

    // Summarize top 10 articles
    const summaries = (data.feed as Array<{
      title: string;
      summary: string;
      source: string;
      time_published: string;
    }>)
      .slice(0, 10)
      .map((item, i) => `[${i + 1}] ${item.title}\n출처: ${item.source} (${item.time_published.slice(0, 8)})\n${item.summary}`)
      .join("\n\n");

    return summaries || "관련 뉴스가 없습니다.";
  } catch (err) {
    return `뉴스 API 호출 실패: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function getTodayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildFrontmatter(date: string, title: string, tags: string[]): string {
  const tagList = tags.map((t) => `"${t}"`).join(", ");
  return `---
title: "${title}"
date: "${date}"
category: "데일리브리핑"
tags: [${tagList}]
summary: "AI가 생성한 ${date} 데일리 시장 브리핑. 글로벌 매크로→반도체→AI인프라 체인 분석."
author: "AI Research Agent"
---

`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Verify CRON_SECRET header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "인증 실패: 유효하지 않은 CRON_SECRET." },
      { status: 401 }
    );
  }

  const dateStr = getTodayDateString();
  const slug = `brief-${dateStr}`;
  const outputPath = path.join(BLOG_PATH, `${slug}.md`);

  // Check for duplicate
  if (fs.existsSync(outputPath)) {
    return NextResponse.json({
      message: `오늘(${dateStr}) 브리핑이 이미 생성되어 있습니다.`,
      slug,
    });
  }

  // 2. Fetch news from Alpha Vantage
  const tickers = "NVDA,MU,AMAT,LRCX,005930.KS";
  const newsSummary = await fetchAlphaVantageNews(tickers);

  // 3. Call Claude to generate the brief
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let generatedContent: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `오늘 날짜: ${dateStr}

아래 최신 뉴스 헤드라인과 요약을 참고하여 데일리 브리핑을 작성해주세요.
각 단락은 "숫자. 내용" 형식으로 15~20개 작성합니다.

=== 최신 뉴스 ===
${newsSummary}

브리핑 본문만 출력하고, 제목이나 프론트매터는 포함하지 마세요.`,
        },
      ],
    });

    const firstBlock = message.content[0];
    if (firstBlock.type !== "text") {
      throw new Error("Claude 응답이 텍스트 형식이 아닙니다.");
    }
    generatedContent = firstBlock.text;
  } catch (err) {
    return NextResponse.json(
      {
        error: "Claude API 호출 실패",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  // 4. Save to content/blog/
  const title = `${dateStr} 데일리 브리핑: AI인프라·반도체 시장 동향`;
  const tags = ["NVDA", "MU", "AMAT", "LRCX", "삼성전자", "데일리브리핑"];
  const frontmatter = buildFrontmatter(dateStr, title, tags);
  const fileContent = frontmatter + generatedContent;

  try {
    if (!fs.existsSync(BLOG_PATH)) {
      fs.mkdirSync(BLOG_PATH, { recursive: true });
    }
    fs.writeFileSync(outputPath, fileContent, "utf-8");
  } catch (err) {
    return NextResponse.json(
      {
        error: "파일 저장 실패",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  // 5. Return success
  return NextResponse.json({
    success: true,
    date: dateStr,
    slug,
    path: outputPath,
    message: `${dateStr} 데일리 브리핑이 성공적으로 생성되었습니다.`,
  });
}
