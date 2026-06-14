import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface AnalysisInput {
  ticker: string;
  name: string;
  sector: string;
  financialData?: {
    revenue?: number;
    netIncome?: number;
    eps?: number;
    pe?: number;
  };
  priceData?: {
    current: number;
    change: number;
    changePercent: number;
    high52Week?: number;
    low52Week?: number;
  };
}

interface ReportOutput {
  title: string;
  summary: string;
  content: string;
  conclusion: string;
  risks: string[];
  opportunities: string[];
}

/**
 * SONNET 모델을 사용하여 종목 분석 리포트 생성
 * CLAUDE.md의 리포트 품질 기준 준수:
 * - 메타포 형식 제목 필수
 * - "시장이 놓친 알파" 섹션 필수
 * - 한 줄 결론: 강세 논거 + 리스크 양면성
 * - 경쟁 포지셔닝 삼분법 표
 */
export async function generateEquityReport(
  input: AnalysisInput
): Promise<ReportOutput> {
  const systemPrompt = `당신은 반도체·메모리 산업 전문 애널리스트입니다.

## 리포트 작성 규칙 (CLAUDE.md 준수)

1. **제목**: 설명형이 아닌 메타포 형식 (예: "공급 부족의 수혜자", "포화 시장의 아웃라이어")
2. **핵심 구성**:
   - 한 줄 결론: 강세 근거 + 리스크의 양면성을 1문장으로
   - 시장이 놓친 알파: 시장 컨센서스와 다른 분석 포인트
   - 경쟁 포지셔닝 삼분법: (1차 수혜/보완/압박) 테이블 형식
   - 가격 반영도 평가

3. **수치 표기**: 모든 핵심 수치는 (값 | 출처 | 날짜) 3종 세트
4. **저작권**: 분석 문장은 자기 언어로 100% 재작성
5. **스타일**: 정량적 데이터 + 정성적 통찰 균형

## 호출 형식
종목: {name} ({ticker})
섹터: {sector}
`;

  const userPrompt = `다음 종목을 분석하고 투자 리포트를 작성하세요:

**종목 정보**
- 이름: ${input.name}
- 티커: ${input.ticker}
- 섹터: ${input.sector}

${
  input.priceData
    ? `**주가 데이터**
- 현재가: ${input.priceData.current}
- 변동률: ${input.priceData.changePercent.toFixed(2)}%
- 52주 범위: ${input.priceData.low52Week} ~ ${input.priceData.high52Week}`
    : ""
}

${
  input.financialData
    ? `**재무 데이터**
- 영업이익: ${input.financialData.revenue}
- 순이익: ${input.financialData.netIncome}
- EPS: ${input.financialData.eps}
- P/E: ${input.financialData.pe}`
    : ""
}

**요청사항**
1. 메타포 형식의 제목 작성
2. 한 줄 결론 (강세 근거 + 리스크)
3. 시장이 놓친 알파 섹션
4. 경쟁 포지셔닝 분석
5. 가격 반영도 평가
6. 투자 리스크 분석

JSON 형식으로 응답하세요:
{
  "title": "메타포 형식 제목",
  "oneLine": "한 줄 결론",
  "alpha": "시장이 놓친 알파",
  "positioning": "경쟁 포지셔닝 분석",
  "priceReflection": "가격 반영도 평가",
  "risks": ["리스크1", "리스크2"],
  "conclusion": "최종 결론"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // 응답 파싱
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 추출
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON response from Claude");
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      title: analysis.title,
      summary: analysis.oneLine,
      content: `
## 시장이 놓친 알파
${analysis.alpha}

## 경쟁 포지셔닝
${analysis.positioning}

## 가격 반영도
${analysis.priceReflection}
      `.trim(),
      conclusion: analysis.conclusion,
      risks: analysis.risks,
      opportunities: [analysis.alpha],
    };
  } catch (error) {
    console.error("Failed to generate report:", error);
    throw error;
  }
}

/**
 * 여러 종목 동시 분석 (배치 모드)
 */
export async function generateBatchReports(
  inputs: AnalysisInput[]
): Promise<Map<string, ReportOutput>> {
  const results = new Map<string, ReportOutput>();

  // 순차 처리 (API 레이트 리미트 회피)
  for (const input of inputs) {
    try {
      const report = await generateEquityReport(input);
      results.set(input.ticker, report);

      // 각 요청 사이에 500ms 지연
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to generate report for ${input.ticker}:`, error);
      results.set(input.ticker, {
        title: "분석 실패",
        summary: error instanceof Error ? error.message : "Unknown error",
        content: "",
        conclusion: "",
        risks: [],
        opportunities: [],
      });
    }
  }

  return results;
}

/**
 * 리포트를 마크다운 파일로 포맷팅
 */
export function formatReportAsMarkdown(
  report: ReportOutput,
  ticker: string,
  name: string
): string {
  const date = new Date().toISOString().split("T")[0];
  const month = date.slice(0, 7);

  return `---
title: "${report.title}"
ticker: "${ticker}"
name: "${name}"
date: "${date}"
difficulty: "intermediate"
summary: "${report.summary}"
exchange: "KS"
---

# ${report.title}

> ${report.summary}

## 시장이 놓친 알파

${report.content}

## 리스크 팩터

${report.risks.map((risk) => `- ${risk}`).join("\n")}

## 최종 평가

${report.conclusion}

---

**작성일**: ${date}
**분석자**: AI Research Agent (SONNET)
**버전**: 1.0
`;
}
