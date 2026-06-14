import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisInput {
  ticker: string;
  name: string;
  sector: string;
  priceData?: {
    current: number;
    change: number;
    changePercent: number;
    high52Week?: number;
    low52Week?: number;
    currency?: string;
  };
  // NEW: quantitative context
  quantContext?: string;    // pre-formatted string from lib/quant/
  macroContext?: string;    // pre-formatted string from lib/data-sources/fred
  financialData?: {
    revenue?: number;
    netIncome?: number;
    eps?: number;
    pe?: number;
    // NEW fields
    roe?: number;
    roic?: number;
    grossMargin?: number;
    ebitdaMargin?: number;
    debtToEquity?: number;
    revenueGrowth3Y?: number;
    evToEbitda?: number;
    dcfIntrinsicValue?: number;
    analystTargetPrice?: number;
    analystConsensus?: string;
  };
  peers?: string[];
  newsContext?: string;     // recent news headlines
  dartContext?: string;     // recent Korean filings summary
}

interface ReportOutput {
  title: string;
  summary: string;
  content: string;
  conclusion: string;
  risks: string[];
  opportunities: string[];
  // NEW frontmatter fields
  conviction?: number;
  targetPrice?: number;
  investmentRating?: "BUY" | "NEUTRAL" | "SELL";
  dcfValue?: number;
  analystConsensus?: string;
}

// ---------------------------------------------------------------------------
// System prompt — full IB-grade methodology
// ---------------------------------------------------------------------------

const IB_SYSTEM_PROMPT = `당신은 Goldman Sachs, Morgan Stanley, JP Morgan 수준의 기관급 주식 리서치 애널리스트입니다.
아래의 분석 방법론을 반드시 적용하십시오.

## 분석 방법론 체계

### 1. Goldman Sachs 수익률 분해 프레임워크
총 기대수익률 = 이익성장률 + 멀티플 변화 + 배당수익률
12개월 절대수익률 기준 투자의견: BUY(+15% 이상) / NEUTRAL(-15%~+15%) / SELL(-15% 이하)

### 2. Morgan Stanley 시나리오 분석
Bull(25%) / Base(50%) / Bear(25%) 3개 시나리오의 확률 가중 목표가 필수 제시
ROIC > WACC: 가치창출, ROIC < WACC: 가치파괴 — 반드시 명시

### 3. Fama-French 5팩터 리스크 분석
제공된 팩터 스코어를 바탕으로: MKT(베타), SMB(규모), HML(가치), RMW(수익성), CMA(투자성향) 해석
컨빅션 스코어가 80 이상이면 강력한 매수 시그널로 해석

### 4. Damodaran DCF 내재가치 분석 (NYU Stern)
제공된 DCF 결과를 참조하여 현 주가의 반영 시나리오 해석
할인율(WACC) 및 영구성장률(Terminal Growth Rate) 민감도 분석 코멘트 필수

### 5. 하버드 비즈니스 스쿨 — Porter's 5 Forces 경쟁분석
① 신규진입 위협 ② 공급자 교섭력 ③ 구매자 교섭력 ④ 대체재 위협 ⑤ 경쟁 강도
반도체 산업 특성에 맞게 적용 (진입장벽, IP, 공정노하우)

### 6. 한국 IB 관점 (삼성증권, 미래에셋, KB증권 방법론)
국내 수급(외국인/기관), KOSPI 대비 알파, 원달러 환율 영향, 정책 리스크 반영

### 7. 공급망 BOM 역산 분석 (반도체 특화)
AI 서버 1대당 HBM/NAND/장비 투입량 → 수요 배수 계산
에코시스템 내 포지셔닝 (1차수혜/보완/압박 삼분법 표)

## 필수 보고서 구조 (CLAUDE.md 준수 + IB 표준 결합)

블록 1: 투자 등급 + 목표주가 + 한 줄 결론
  - Goldman 방식: 등급(BUY/NEUTRAL/SELL) + 12M 목표가 + 상승여력%
  - 메타포 형식 제목 필수 (설명형 절대 불가)

블록 2: 퀀트 팩터 스코어카드 (제공된 데이터 기반)
  - Fama-French 5팩터 점수표
  - 컨빅션 등급 해석

블록 3: 재무 모델 요약 (3개년 전망)
  - 매출/EBITDA/EPS 추정치 표 (Bull/Base/Bear)
  - DCF 내재가치 vs 현재가

블록 4: 경쟁 포지셔닝 삼분법 표 (필수)
  - 1차수혜 / 보완 / 압박 세 열

블록 5: 시장이 놓친 알파 (핵심 차별 포인트)
  - 컨센서스와 다른 분석 포인트 2-3개

블록 6: Porter's 5 Forces 경쟁구조
블록 7: 리스크 매트릭스 (확률 가중, Bull/Bear 트리거)
블록 8: 가격 반영도 평가 (현주가 = 어느 시나리오)
블록 9: 투자 결론 및 촉매 캘린더

출력 형식: 마크다운. 수치는 (값 | 출처 | 날짜) 3종 세트 필수.`;

// ---------------------------------------------------------------------------
// Build a rich user prompt from AnalysisInput
// ---------------------------------------------------------------------------

function buildUserPrompt(input: AnalysisInput): string {
  const sections: string[] = [];

  sections.push(`다음 종목을 분석하고 기관급 투자 리포트를 작성하세요.

**종목 정보**
- 이름: ${input.name}
- 티커: ${input.ticker}
- 섹터: ${input.sector}`);

  if (input.priceData) {
    const p = input.priceData;
    const currency = p.currency ?? "";
    sections.push(`
**주가 데이터**
- 현재가: ${p.current.toLocaleString()} ${currency}
- 전일 대비: ${p.change >= 0 ? "+" : ""}${p.change.toFixed(2)} (${p.changePercent >= 0 ? "+" : ""}${p.changePercent.toFixed(2)}%)
${p.high52Week != null ? `- 52주 고가: ${p.high52Week.toLocaleString()} ${currency}` : ""}
${p.low52Week != null ? `- 52주 저가: ${p.low52Week.toLocaleString()} ${currency}` : ""}`);
  }

  if (input.financialData) {
    const f = input.financialData;
    const lines: string[] = ["**재무 데이터**"];
    if (f.revenue != null)         lines.push(`- 매출: ${f.revenue.toLocaleString()}`);
    if (f.netIncome != null)       lines.push(`- 순이익: ${f.netIncome.toLocaleString()}`);
    if (f.eps != null)             lines.push(`- EPS: ${f.eps}`);
    if (f.pe != null)              lines.push(`- P/E (TTM): ${f.pe}`);
    if (f.roe != null)             lines.push(`- ROE: ${(f.roe * 100).toFixed(1)}%`);
    if (f.roic != null)            lines.push(`- ROIC: ${(f.roic * 100).toFixed(1)}%`);
    if (f.grossMargin != null)     lines.push(`- 매출총이익률: ${(f.grossMargin * 100).toFixed(1)}%`);
    if (f.ebitdaMargin != null)    lines.push(`- EBITDA 마진: ${(f.ebitdaMargin * 100).toFixed(1)}%`);
    if (f.debtToEquity != null)    lines.push(`- 부채비율(D/E): ${f.debtToEquity.toFixed(2)}`);
    if (f.revenueGrowth3Y != null) lines.push(`- 3년 매출 CAGR: ${(f.revenueGrowth3Y * 100).toFixed(1)}%`);
    if (f.evToEbitda != null)      lines.push(`- EV/EBITDA: ${f.evToEbitda.toFixed(1)}x`);
    if (f.dcfIntrinsicValue != null)
      lines.push(`- DCF 내재가치: ${f.dcfIntrinsicValue.toLocaleString()} (Damodaran 방법론 추정)`);
    if (f.analystTargetPrice != null)
      lines.push(`- 애널리스트 목표주가 평균: ${f.analystTargetPrice.toLocaleString()}`);
    if (f.analystConsensus)
      lines.push(`- 애널리스트 컨센서스: ${f.analystConsensus}`);
    sections.push(lines.join("\n"));
  }

  if (input.peers && input.peers.length > 0) {
    sections.push(`**피어 그룹**\n${input.peers.join(", ")}`);
  }

  if (input.quantContext) {
    sections.push(`**퀀트 팩터 스코어 (Fama-French 5팩터)**\n${input.quantContext}`);
  }

  if (input.macroContext) {
    sections.push(`**거시경제 맥락**\n${input.macroContext}`);
  }

  if (input.newsContext) {
    sections.push(`**최근 뉴스 헤드라인**\n${input.newsContext}`);
  }

  if (input.dartContext) {
    sections.push(`**DART 공시 요약 (최근)**\n${input.dartContext}`);
  }

  sections.push(`
**요청사항**
1. 메타포 형식의 제목 작성 (설명형 불가)
2. 투자등급(BUY/NEUTRAL/SELL) + 12M 목표주가 + 상승여력% 명시
3. Fama-French 5팩터 스코어카드 표
4. Bull/Base/Bear 3개 시나리오 재무 추정치 표
5. DCF 내재가치 분석 및 현재가 대비 괴리율 코멘트
6. 경쟁 포지셔닝 삼분법 표 (1차수혜 / 보완 / 압박)
7. 시장이 놓친 알파 섹션 (컨센서스 차별 포인트 2-3개)
8. Porter's 5 Forces 분석
9. 리스크 매트릭스 (확률 가중)
10. 가격 반영도 평가 (현주가 = 어느 시나리오)
11. 한 줄 결론: 강세 논거 + 리스크 양면성 1문장

JSON 형식으로 응답하세요:
{
  "title": "메타포 형식 제목",
  "investmentRating": "BUY|NEUTRAL|SELL",
  "targetPrice": 숫자,
  "conviction": 0-100 정수,
  "dcfValue": 숫자 또는 null,
  "oneLine": "한 줄 결론 (강세 논거 + 리스크)",
  "analystConsensus": "문자열",
  "alpha": "시장이 놓친 알파 (마크다운)",
  "positioning": "경쟁 포지셔닝 삼분법 표 (마크다운)",
  "quantScorecard": "Fama-French 5팩터 표 (마크다운)",
  "financialModel": "Bull/Base/Bear 재무 추정치 표 (마크다운)",
  "dcfAnalysis": "DCF 분석 코멘트 (마크다운)",
  "porterForces": "Porter's 5 Forces 분석 (마크다운)",
  "priceReflection": "가격 반영도 평가 (마크다운)",
  "riskMatrix": "리스크 매트릭스 (마크다운)",
  "catalystCalendar": "촉매 캘린더 (마크다운)",
  "risks": ["리스크1", "리스크2", "리스크3"],
  "conclusion": "최종 결론 및 투자 의견"
}`);

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// Primary export: generateEquityReport
// ---------------------------------------------------------------------------

/**
 * Goldman Sachs / Morgan Stanley 수준의 기관급 주식 리서치 리포트 생성.
 * CLAUDE.md 리포트 품질 기준 준수:
 * - 메타포 형식 제목 필수
 * - "시장이 놓친 알파" 섹션 필수
 * - 한 줄 결론: 강세 논거 + 리스크 양면성
 * - 경쟁 포지셔닝 삼분법 표
 * - 가격 반영도 평가 명시
 * - Fama-French 5팩터, DCF (Damodaran), Porter's 5 Forces 적용
 */
export async function generateEquityReport(
  input: AnalysisInput
): Promise<ReportOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = buildUserPrompt(input);

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: IB_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 추출 (```json ... ``` 또는 raw { ... })
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/) ??
                      responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON response from Claude");
    }

    const raw = jsonMatch[1] ?? jsonMatch[0];
    const analysis = JSON.parse(raw);

    const content = [
      analysis.quantScorecard  ? `## 퀀트 팩터 스코어카드\n\n${analysis.quantScorecard}` : "",
      analysis.financialModel  ? `## 재무 모델 요약 (Bull/Base/Bear)\n\n${analysis.financialModel}` : "",
      analysis.dcfAnalysis     ? `## DCF 내재가치 분석\n\n${analysis.dcfAnalysis}` : "",
      analysis.positioning     ? `## 경쟁 포지셔닝 삼분법\n\n${analysis.positioning}` : "",
      analysis.alpha           ? `## 시장이 놓친 알파\n\n${analysis.alpha}` : "",
      analysis.porterForces    ? `## Porter's 5 Forces\n\n${analysis.porterForces}` : "",
      analysis.riskMatrix      ? `## 리스크 매트릭스\n\n${analysis.riskMatrix}` : "",
      analysis.priceReflection ? `## 가격 반영도 평가\n\n${analysis.priceReflection}` : "",
      analysis.catalystCalendar? `## 촉매 캘린더\n\n${analysis.catalystCalendar}` : "",
    ].filter(Boolean).join("\n\n");

    return {
      title: analysis.title ?? input.name,
      summary: analysis.oneLine ?? "",
      content,
      conclusion: analysis.conclusion ?? "",
      risks: Array.isArray(analysis.risks) ? analysis.risks : [],
      opportunities: [analysis.alpha ?? ""],
      // NEW fields
      conviction: typeof analysis.conviction === "number" ? analysis.conviction : undefined,
      targetPrice: typeof analysis.targetPrice === "number" ? analysis.targetPrice : undefined,
      investmentRating: ["BUY", "NEUTRAL", "SELL"].includes(analysis.investmentRating)
        ? (analysis.investmentRating as "BUY" | "NEUTRAL" | "SELL")
        : undefined,
      dcfValue: typeof analysis.dcfValue === "number" ? analysis.dcfValue : undefined,
      analystConsensus: typeof analysis.analystConsensus === "string"
        ? analysis.analystConsensus
        : input.financialData?.analystConsensus,
    };
  } catch (error) {
    console.error("Failed to generate report:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Batch export
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// formatReportAsMarkdown — with IB-grade frontmatter
// ---------------------------------------------------------------------------

/**
 * 리포트를 마크다운 파일로 포맷팅 (CLAUDE.md 명명 규칙 준수)
 * Frontmatter에 conviction, targetPrice, investmentRating, dcfValue, analystConsensus 추가
 */
export function formatReportAsMarkdown(
  report: ReportOutput,
  ticker: string,
  name: string
): string {
  const date = new Date().toISOString().split("T")[0];

  const ratingEmoji =
    report.investmentRating === "BUY"
      ? "매수"
      : report.investmentRating === "SELL"
      ? "매도"
      : report.investmentRating === "NEUTRAL"
      ? "중립"
      : "미정";

  const frontmatterLines: string[] = [
    `---`,
    `title: "${report.title}"`,
    `ticker: "${ticker}"`,
    `name: "${name}"`,
    `date: "${date}"`,
    `difficulty: "intermediate"`,
    `summary: "${report.summary.replace(/"/g, "'")}"`,
    `exchange: "KS"`,
  ];

  if (report.investmentRating) {
    frontmatterLines.push(`investmentRating: "${report.investmentRating}"`);
  }
  if (report.targetPrice != null) {
    frontmatterLines.push(`targetPrice: ${report.targetPrice}`);
  }
  if (report.conviction != null) {
    frontmatterLines.push(`conviction: ${report.conviction}`);
  }
  if (report.dcfValue != null) {
    frontmatterLines.push(`dcfValue: ${report.dcfValue}`);
  }
  if (report.analystConsensus) {
    frontmatterLines.push(`analystConsensus: "${report.analystConsensus}"`);
  }
  frontmatterLines.push(`---`);

  const upside =
    report.targetPrice != null
      ? `  목표주가: ${report.targetPrice.toLocaleString()} | 상승여력: 목표가 기준`
      : "";

  return `${frontmatterLines.join("\n")}

# ${report.title}

> **투자의견: ${ratingEmoji}${report.targetPrice != null ? ` | 목표주가: ${report.targetPrice.toLocaleString()}` : ""}${report.conviction != null ? ` | 컨빅션: ${report.conviction}/100` : ""}**
${upside ? `\n${upside}` : ""}

> ${report.summary}

${report.content}

## 리스크 팩터

${report.risks.map((risk) => `- ${risk}`).join("\n")}

## 최종 평가

${report.conclusion}

---

**작성일**: ${date}
**분석자**: AI Research Agent (Goldman/MS/Fama-French/Damodaran 방법론)
**버전**: 2.0
`;
}
