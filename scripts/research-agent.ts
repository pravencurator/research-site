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
  // Dynamic import so this file works in both CJS (ts-node) and ESM contexts
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const yahooFinance = require("yahoo-finance2").default as typeof import("yahoo-finance2").default;

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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const yahooFinance = require("yahoo-finance2").default as typeof import("yahoo-finance2").default;

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

  const systemPrompt = `당신은 기관급 주식 리서치 애널리스트입니다. 아래 품질 기준을 반드시 100% 준수하십시오.

## 필수 품질 기준 (CLAUDE.md 기준)
1. **제목**: 반드시 메타포 형식 (설명형 제목 절대 불가). 예: "불꽃 속의 다이아몬드" (O) / "삼성전자 실적 분석" (X)
2. **블록 4 "시장이 놓친 알파"**: 없으면 리포트 미완성 — 반드시 포함
3. **한 줄 결론**: 강세 논거 + 리스크 양면성을 한 문장으로 필수 포함
4. **경쟁 포지셔닝 삼분법 표**: 1차수혜 / 보완 / 압박 세 열 필수
5. **가격 반영도 평가**: 현재 주가가 어느 시나리오를 반영하는지 명시 필수
6. **수치 표기**: 모든 핵심 수치에 (값 | 출처 | 날짜) 3종 세트 필수. 추정치는 "(추정)" 명시
7. **자기 언어**: 분석 문장은 100% 재작성 (직접 인용 금지)

## 리포트 구조
블록 1: 제목 + 한 줄 결론
블록 2: 주가 현황 및 밸류에이션
블록 3: 경쟁 포지셔닝 삼분법 표
블록 4: 시장이 놓친 알파 (핵심 차별 포인트)
블록 5: 리스크 / 촉매
블록 6: 가격 반영도 평가
블록 7: 결론 및 투자 의견

출력 형식: 마크다운`;

  const userPrompt = `다음 데이터를 기반으로 ${ctx.company} (${ctx.ticker}) 풀 리서치 리포트를 작성하십시오.

## 섹터
${ctx.sector}

## 주가 데이터
${formatPriceBlock(ctx.price)}

## 피어 그룹
${ctx.peers.join(", ") || "없음"}

## 최근 뉴스 (최근 7일, 최대 10건)
${formatNewsBlock(ctx.news)}

위 데이터를 바탕으로 품질 기준을 모두 충족하는 완전한 리포트를 작성하십시오.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
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
