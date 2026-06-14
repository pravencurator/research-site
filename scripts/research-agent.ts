import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceData {
  ticker: string;
  price: number;
  currency: string;
  week52High: number;
  week52Low: number;
  peRatio: number | null;
  marketCap: number | null;
  volume: number;
  change: number;
  changePercent: number;
  fetchedAt: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
}

export interface ResearchContext {
  ticker: string;
  company: string;
  price: PriceData;
  news: NewsItem[];
  peers: string[];
  sector: string;
}

// ---------------------------------------------------------------------------
// Yahoo Finance price fetching (uses yahoo-finance2 installed in project)
// ---------------------------------------------------------------------------

async function fetchPriceData(ticker: string): Promise<PriceData> {
  // yahoo-finance2 v3: requires instantiation
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
  const YFClass = require("yahoo-finance2").default as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yahooFinance: any = new YFClass();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quote: any = await yahooFinance.quote(ticker);

  return {
    ticker,
    price: quote?.regularMarketPrice ?? 0,
    currency: quote?.currency ?? "USD",
    week52High: quote?.fiftyTwoWeekHigh ?? 0,
    week52Low: quote?.fiftyTwoWeekLow ?? 0,
    peRatio: quote?.trailingPE ?? null,
    marketCap: quote?.marketCap ?? null,
    volume: quote?.regularMarketVolume ?? 0,
    change: quote?.regularMarketChange ?? 0,
    changePercent: quote?.regularMarketChangePercent ?? 0,
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Alpha Vantage News fetching
// ---------------------------------------------------------------------------

async function fetchAlphaVantageNews(
  ticker: string,
  apiKey: string,
  limit = 10
): Promise<NewsItem[]> {
  // Normalize ticker for Alpha Vantage (strip exchange suffixes like .KS, .T)
  const avTicker = ticker.replace(/\.[A-Z]+$/, "");

  const url =
    `https://www.alphavantage.co/query` +
    `?function=NEWS_SENTIMENT` +
    `&tickers=${encodeURIComponent(avTicker)}` +
    `&limit=${limit}` +
    `&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);

  const json = (await res.json()) as {
    feed?: Array<{
      title?: string;
      url?: string;
      source?: string;
      time_published?: string;
      summary?: string;
    }>;
    Information?: string;
  };

  if (json.Information) {
    // API rate-limit message
    throw new Error(`Alpha Vantage: ${json.Information}`);
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (json.feed ?? [])
    .filter((item) => {
      if (!item.time_published) return true;
      // Format: 20240614T123456
      const iso = item.time_published.replace(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
        "$1-$2-$3T$4:$5:$6Z"
      );
      return new Date(iso).getTime() >= sevenDaysAgo;
    })
    .slice(0, limit)
    .map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      source: item.source ?? "",
      publishedAt: item.time_published ?? "",
      summary: item.summary ?? "",
    }));
}

// ---------------------------------------------------------------------------
// Yahoo Finance news fallback
// ---------------------------------------------------------------------------

async function fetchYahooNews(
  ticker: string,
  limit = 10
): Promise<NewsItem[]> {
  // yahoo-finance2 v3: requires instantiation
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
  const YFClass = require("yahoo-finance2").default as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yahooFinance: any = new YFClass();

  try {
    const result = await (yahooFinance as unknown as {
      search: (
        q: string,
        opts: { newsCount: number }
      ) => Promise<{ news?: Array<{ title?: string; link?: string; publisher?: string; providerPublishTime?: number; summary?: string }> }>;
    }).search(ticker, { newsCount: limit });

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return (result.news ?? [])
      .filter((n) => {
        if (!n.providerPublishTime) return true;
        return n.providerPublishTime * 1000 >= sevenDaysAgo;
      })
      .slice(0, limit)
      .map((n) => ({
        title: n.title ?? "",
        url: n.link ?? "",
        source: n.publisher ?? "",
        publishedAt: n.providerPublishTime
          ? new Date(n.providerPublishTime * 1000).toISOString()
          : "",
        summary: n.summary ?? "",
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Primary export: fetch news (Alpha Vantage → Yahoo fallback)
// ---------------------------------------------------------------------------

export async function fetchNews(
  ticker: string,
  limit = 10
): Promise<NewsItem[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (apiKey) {
    try {
      const items = await fetchAlphaVantageNews(ticker, apiKey, limit);
      if (items.length > 0) return items;
      console.log(
        `[news] Alpha Vantage returned 0 items for ${ticker}, falling back to Yahoo`
      );
    } catch (err) {
      console.warn(
        `[news] Alpha Vantage failed for ${ticker}: ${(err as Error).message}`
      );
    }
  }

  return fetchYahooNews(ticker, limit);
}

// ---------------------------------------------------------------------------
// Build ResearchContext
// ---------------------------------------------------------------------------

const PEER_MAP: Record<string, string[]> = {
  "005930.KS": ["000660.KS", "MU", "NVDA"],
  "000660.KS": ["005930.KS", "MU", "NVDA"],
  "322000.KS": ["042700.KS", "AMAT", "LRCX"],
  "042700.KS": ["322000.KS", "AMAT", "6857.T"],
  "009150.KS": ["005930.KS", "AMAT", "LRCX"],
  NVDA: ["AMD", "INTC", "MRVL"],
  MRVL: ["NVDA", "AVGO", "AMD"],
  AMAT: ["LRCX", "KLAC", "6857.T"],
  LRCX: ["AMAT", "KLAC", "8035.T"],
  MU: ["005930.KS", "000660.KS", "WDC"],
  ARM: ["NVDA", "INTC", "QCOM"],
  TSLA: ["GM", "F", "RIVN"],
  "6857.T": ["8035.T", "AMAT", "042700.KS"],
  "8035.T": ["6857.T", "LRCX", "AMAT"],
};

const SECTOR_MAP: Record<string, string> = {
  "005930.KS": "반도체/메모리",
  "000660.KS": "반도체/메모리",
  "322000.KS": "반도체 장비/소재",
  "042700.KS": "반도체 장비",
  "009150.KS": "전자부품",
  NVDA: "반도체/AI 가속",
  MRVL: "반도체/네트워킹",
  AMAT: "반도체 장비",
  LRCX: "반도체 장비",
  MU: "반도체/메모리",
  ARM: "반도체/IP",
  TSLA: "전기차/에너지",
  "6857.T": "반도체 검사장비",
  "8035.T": "반도체 장비",
};

const COMPANY_MAP: Record<string, string> = {
  "005930.KS": "삼성전자",
  "000660.KS": "SK하이닉스",
  "322000.KS": "피에스케이홀딩스",
  "042700.KS": "한미반도체",
  "009150.KS": "삼성전기",
  NVDA: "NVIDIA",
  MRVL: "Marvell Technology",
  AMAT: "Applied Materials",
  LRCX: "Lam Research",
  MU: "Micron Technology",
  ARM: "Arm Holdings",
  TSLA: "Tesla",
  "6857.T": "アドバンテスト (Advantest)",
  "8035.T": "東京エレクトロン (Tokyo Electron)",
};

export async function buildResearchContext(
  ticker: string
): Promise<ResearchContext> {
  const [price, news] = await Promise.all([
    fetchPriceData(ticker),
    fetchNews(ticker),
  ]);

  return {
    ticker,
    company: COMPANY_MAP[ticker] ?? ticker,
    price,
    news,
    peers: PEER_MAP[ticker] ?? [],
    sector: SECTOR_MAP[ticker] ?? "기타",
  };
}

// ---------------------------------------------------------------------------
// Extended context with FMP/FRED/DART quant data
// ---------------------------------------------------------------------------

export interface RichResearchContext extends ResearchContext {
  quantContext: string;
  macroContext: string;
  dartContext: string;
  financialData: {
    revenue?: number;
    netIncome?: number;
    roe?: number;
    roic?: number;
    ebitdaMargin?: number;
    debtToEquity?: number;
    evToEbitda?: number;
    dcfIntrinsicValue?: number;
    analystTargetPrice?: number;
    analystConsensus?: string;
  };
}

export async function buildRichResearchContext(
  ticker: string
): Promise<RichResearchContext> {
  // Dynamic imports to avoid bundler issues in ts-node CJS context
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildRichDataContext } = require("../lib/data-sources") as typeof import("../lib/data-sources");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { runFullQuantAnalysis } = require("../lib/quant") as typeof import("../lib/quant");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { formatMacroContext } = require("../lib/data-sources/fred") as typeof import("../lib/data-sources/fred");

  const [base, richData] = await Promise.all([
    buildResearchContext(ticker),
    buildRichDataContext(ticker),
  ]);

  const quant = await runFullQuantAnalysis(
    ticker,
    richData.fmp,
    richData.macro,
    richData.price.price
  );

  const latestIncome = richData.fmp.incomeStatements?.[0];
  const latestMetrics = richData.fmp.keyMetrics?.[0];

  const dartDisclosures = richData.dartDisclosures;
  const dartContext =
    dartDisclosures.length > 0
      ? dartDisclosures
          .slice(0, 5)
          .map((d) => `- [${d.rcept_dt}] ${d.report_nm}`)
          .join("\n")
      : richData.irSummary.formattedForLLM;

  return {
    ...base,
    price: {
      ...base.price,
      price: richData.price.price || base.price.price,
      change: richData.price.change || base.price.change,
      changePercent: richData.price.changePercent || base.price.changePercent,
    },
    quantContext: quant.formattedForLLM,
    macroContext: formatMacroContext(richData.macro),
    dartContext,
    financialData: {
      revenue: latestIncome?.revenue ? latestIncome.revenue / 1e6 : undefined,
      netIncome: latestIncome?.netIncome ? latestIncome.netIncome / 1e6 : undefined,
      roe: latestMetrics?.roe ? latestMetrics.roe * 100 : undefined,
      roic: latestMetrics?.roic ? latestMetrics.roic * 100 : undefined,
      ebitdaMargin: latestIncome?.ebitda && latestIncome?.revenue
        ? (latestIncome.ebitda / latestIncome.revenue) * 100
        : undefined,
      debtToEquity: latestMetrics?.debtToEquity ?? undefined,
      evToEbitda: latestMetrics?.evToEbitda ?? undefined,
      dcfIntrinsicValue: quant.dcf?.intrinsicValue ?? richData.fmp.dcf?.dcf ?? undefined,
      analystTargetPrice: richData.fmp.analystRating?.targetPrice ?? undefined,
      analystConsensus: richData.fmp.analystRating?.ratingRecommendation ?? undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Report generation via Anthropic SDK
// ---------------------------------------------------------------------------

function formatPriceBlock(p: PriceData): string {
  const fmt = (n: number | null) =>
    n === null ? "N/A" : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const mcap =
    p.marketCap === null
      ? "N/A"
      : `${(p.marketCap / 1e9).toFixed(1)}B ${p.currency}`;

  return [
    `현재가: ${fmt(p.price)} ${p.currency}`,
    `전일 대비: ${p.change >= 0 ? "+" : ""}${fmt(p.change)} (${p.changePercent >= 0 ? "+" : ""}${p.changePercent.toFixed(2)}%)`,
    `52주 고/저: ${fmt(p.week52High)} / ${fmt(p.week52Low)}`,
    `P/E (TTM): ${fmt(p.peRatio)}`,
    `시가총액: ${mcap}`,
    `거래량: ${fmt(p.volume)}`,
    `데이터 기준: ${p.fetchedAt}`,
  ].join("\n");
}

function formatNewsBlock(items: NewsItem[]): string {
  if (items.length === 0) return "(최근 7일 뉴스 없음)";
  return items
    .map(
      (n, i) =>
        `[${i + 1}] ${n.title}\n` +
        `    출처: ${n.source} | ${n.publishedAt}\n` +
        `    요약: ${n.summary || "(요약 없음)"}\n` +
        `    URL: ${n.url}`
    )
    .join("\n\n");
}

export async function generateReport(ctx: ResearchContext): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const rich = ctx as RichResearchContext;

  const systemPrompt = `당신은 Goldman Sachs, Morgan Stanley, JP Morgan 수준의 기관급 주식 리서치 애널리스트입니다.
아래의 분석 방법론을 반드시 적용하십시오.

## 분석 방법론 체계

### 1. Goldman Sachs 수익률 분해 프레임워크
총 기대수익률 = 이익성장률 + 멀티플 변화 + 배당수익률
12개월 절대수익률 기준 투자의견: BUY(+15% 이상) / NEUTRAL(-15%~+15%) / SELL(-15% 이하)

### 2. Morgan Stanley 시나리오 분석
Bull(25%) / Base(50%) / Bear(25%) 3개 시나리오의 확률 가중 목표가 필수 제시
ROIC > WACC: 가치창출, ROIC < WACC: 가치파괴 — 반드시 명시

### 3. Fama-French 5팩터 리스크 분석
제공된 팩터 스코어를 바탕으로: Value, Quality, Growth, Momentum, Profitability 해석
컨빅션 스코어 80 이상 → 강력 매수 시그널

### 4. Damodaran DCF 내재가치 분석 (NYU Stern)
DCF 내재가치 vs 현재가 괴리율을 MoS(안전마진)으로 해석
민감도 분석(WACC ±2%, 터미널 성장률 ±1%) 언급 필수

### 5. IB급 Comps 분석 (Goldman Sachs / JP Morgan)
섹터 중앙값 대비 프리미엄/할인: EV/EBITDA, P/E, P/B, EV/S 멀티플

### 6. Porter's 5 Forces (Harvard Business School)
경쟁강도 / 진입장벽 / 공급자교섭력 / 고객교섭력 / 대체재 위협

### 7. 한국 기관 IB 관점 (삼성증권/미래에셋/KB증권)
국내 수요처/공급망/정책 리스크 반영, 원화/달러 환율 민감도

## 필수 품질 기준
1. 제목: 반드시 메타포 형식 (설명형 제목 절대 불가)
2. 블록 4 "시장이 놓친 알파": 반드시 포함
3. 한 줄 결론: 강세 논거 + 리스크 양면성 한 문장
4. 경쟁 포지셔닝 삼분법 표: 1차수혜 / 보완 / 압박
5. 가격 반영도 평가: 현재가가 어느 시나리오를 반영하는지 명시
6. 수치 표기: (값 | 출처 | 날짜) 3종 세트. 추정치는 "(추정)" 명시
7. 자기 언어: 분석 문장 100% 재작성

## 9-블록 리포트 구조
블록 1: 제목 + 한 줄 결론 + 투자의견 (BUY/NEUTRAL/SELL) + 목표가
블록 2: 주가 현황 및 밸류에이션
블록 3: Goldman Sachs 수익률 분해 + Morgan Stanley 3시나리오
블록 4: Fama-French 팩터 스코어 분석
블록 5: Damodaran DCF 내재가치 + 민감도
블록 6: IB Comps (피어 멀티플 비교)
블록 7: 시장이 놓친 알파 + Porter's 5 Forces
블록 8: 리스크 / 촉매
블록 9: 가격 반영도 평가 + 결론

출력 형식: 마크다운`;

  const quantSection = rich.quantContext
    ? `\n## 퀀트 분석 (Fama-French + DCF + Comps)\n${rich.quantContext}`
    : "";
  const macroSection = rich.macroContext
    ? `\n## 거시경제 지표 (FRED)\n${rich.macroContext}`
    : "";
  const dartSection = rich.dartContext
    ? `\n## DART/SEC 공시 및 IR 자료\n${rich.dartContext}`
    : "";
  const finSection = rich.financialData
    ? `\n## 재무 데이터 (FMP)\n` +
      Object.entries(rich.financialData)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "";

  const userPrompt = `다음 데이터를 기반으로 ${ctx.company} (${ctx.ticker}) 풀 IB 리서치 리포트를 작성하십시오.

## 섹터
${ctx.sector}

## 주가 데이터
${formatPriceBlock(ctx.price)}

## 피어 그룹
${ctx.peers.join(", ") || "없음"}

## 최근 뉴스 (최근 7일, 최대 10건)
${formatNewsBlock(ctx.news)}
${finSection}${macroSection}${quantSection}${dartSection}

위 데이터를 바탕으로 9-블록 IB급 리포트를 작성하십시오.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n");

  return text;
}

// ---------------------------------------------------------------------------
// Save report to disk
// ---------------------------------------------------------------------------

export function reportFilePath(
  ticker: string,
  baseDir: string,
  yearMonth: string
): string {
  const safeTicker = ticker.replace(/\./g, "_");
  return path.join(baseDir, `report-${safeTicker}-${yearMonth}.md`);
}

export function saveReport(
  content: string,
  filePath: string
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Track-record logging
// ---------------------------------------------------------------------------

export function appendTrackRecord(
  ticker: string,
  date: string,
  price: number,
  currency: string,
  logPath: string
): void {
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const header = "ticker,date,price,currency\n";
  const line = `${ticker},${date},${price},${currency}\n`;

  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, header + line, "utf-8");
  } else {
    fs.appendFileSync(logPath, line, "utf-8");
  }
}
