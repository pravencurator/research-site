import { NextResponse } from "next/server";
import yahooFinance from "@/lib/data-sources/yahoo-finance";
import { clusterNews, type NewsCluster } from "@/lib/news-clusters";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  severity: "critical" | "high" | "normal";
  tickers?: string[];
  sentiment?: "bullish" | "bearish" | "neutral";
  /** Set when the item belongs to a cluster with ≥ 2 matching headlines */
  clusterTag?: string;
}

export type { NewsCluster };

// ─────────────────────────────────────────────
// Fallback curated news
// ─────────────────────────────────────────────

const FALLBACK_NEWS_RAW = [
  {
    title: "엔비디아 Blackwell B200 수요 공급 불균형 지속",
    summary:
      "Blackwell B200 GPU 수요가 공급을 크게 초과하며 납기 지연이 장기화되고 있다. 데이터센터 고객사들의 예약 주문이 2026년 말까지 이어지는 것으로 파악된다.",
    url: "https://bloomberg.com/news/nvda-b200-demand",
    severity: "high" as const,
    source: "Bloomberg",
    tickers: ["NVDA"],
    sentiment: "bullish" as const,
  },
  {
    title: "SK하이닉스 HBM4 양산 가속화, 2026년 공급 타이트",
    summary:
      "SK하이닉스가 HBM4 양산 일정을 앞당기면서도 공급이 수요를 따라가기 어렵다는 전망이 나왔다. AI 가속기 탑재용 HBM 전체 시장에서 공급 부족이 심화되고 있다.",
    url: "https://koreaherald.com/news/skhynix-hbm4",
    severity: "critical" as const,
    source: "Korea Herald",
    tickers: ["000660.KS"],
    sentiment: "bullish" as const,
  },
  {
    title: "삼성전자 파운드리 2nm 수율 개선 확인",
    summary:
      "삼성 파운드리 2nm GAA 공정의 수율이 업계 예상보다 빠르게 개선되고 있다는 소식이 전해졌다. 주요 팹리스 고객사들과 테이프아웃 일정 조율이 진행 중이다.",
    url: "https://digitimes.com/news/samsung-2nm",
    severity: "high" as const,
    source: "DigiTimes",
    tickers: ["005930.KS"],
    sentiment: "bullish" as const,
  },
  {
    title: "TSMC 선진 패키징 수주 급증, CoWoS 예약 2년치",
    summary:
      "TSMC CoWoS 패키징 예약이 2028년까지 꽉 찬 것으로 알려졌다. AI 가속기 제조사들의 고대역폭 패키징 수요가 TSMC에 집중되고 있다.",
    url: "https://reuters.com/news/tsmc-cowos",
    severity: "high" as const,
    source: "Reuters",
    tickers: ["TSM"],
    sentiment: "bullish" as const,
  },
  {
    title: "피에스케이홀딩스 신규 건식식각 장비 수주 소식",
    summary:
      "피에스케이홀딩스가 국내 주요 메모리 고객사로부터 건식식각 장비 신규 수주를 확보했다. 수주 금액은 공개되지 않았으나 올해 누적 수주 신기록 달성에 가까워진 것으로 파악된다.",
    url: "https://etnews.com/news/psk-etch",
    severity: "normal" as const,
    source: "전자신문",
    tickers: ["322000.KS"],
    sentiment: "bullish" as const,
  },
  {
    title: "AI 서버 수요 증가로 DDR5 고급 패키징 부족 심화",
    summary:
      "AI 서버 플랫폼 전환 가속으로 DDR5 고급 패키징 수요가 급증하면서 공급 부족이 심화되고 있다. 마이크론과 SK하이닉스 모두 증설을 서두르고 있다.",
    url: "https://bloomberg.com/news/ddr5-shortage",
    severity: "critical" as const,
    source: "Bloomberg",
    tickers: ["MU", "000660.KS"],
    sentiment: "bullish" as const,
  },
  {
    title: "마벨 커스텀 ASIC 매출 급성장, 클라우드향 견조",
    summary:
      "마벨 테크놀로지의 커스텀 ASIC 사업부 매출이 전년 대비 두 배를 넘어서며 성장세가 가팔라졌다. 주요 클라우드 고객사들의 자체 AI 칩 설계 지원 프로젝트가 다수 진행 중이다.",
    url: "https://reuters.com/news/mrvl-asic",
    severity: "high" as const,
    source: "Reuters",
    tickers: ["MRVL"],
    sentiment: "bullish" as const,
  },
  {
    title: "어드밴테스트 HBM 테스트 장비 수주 기록 경신",
    summary:
      "어드밴테스트가 HBM 전용 테스트 장비 수주액이 분기 기준 역대 최고치를 경신했다고 밝혔다. HBM3E 및 HBM4 양산 증가가 테스트 장비 수요를 끌어올리고 있다.",
    url: "https://nikkei.com/news/advantest-hbm",
    severity: "normal" as const,
    source: "Nikkei",
    tickers: ["6857.T"],
    sentiment: "bullish" as const,
  },
  {
    title: "미국 대중 반도체 수출규제 추가 강화 논의",
    summary:
      "미국 상무부가 대중국 반도체 수출 통제 범위를 확대하는 방안을 검토 중인 것으로 알려졌다. 고대역폭 메모리와 AI 관련 칩 제조 장비가 추가 규제 대상에 포함될 가능성이 있다.",
    url: "https://wsj.com/news/us-china-chip-export",
    severity: "critical" as const,
    source: "WSJ",
    tickers: ["NVDA", "LRCX"],
    sentiment: "bearish" as const,
  },
  {
    title: "ARM홀딩스 로열티 수입 AI 밸류체인 수혜 확대",
    summary:
      "ARM 아키텍처 기반 AI 칩 설계 증가로 ARM홀딩스의 로열티 수입이 분기별로 신고점을 경신하고 있다. 맞춤형 컴퓨팅 트렌드가 ARM의 구조적 성장을 뒷받침하고 있다.",
    url: "https://ft.com/news/arm-royalty",
    severity: "normal" as const,
    source: "FT",
    tickers: ["ARM"],
    sentiment: "bullish" as const,
  },
];

// ─────────────────────────────────────────────
// Severity classifier
// ─────────────────────────────────────────────

const CRITICAL_PATTERNS = [
  "급등",
  "급락",
  "earnings miss",
  "bankruptcy",
  "SEC investigation",
  "파산",
  "상장폐지",
  "수출규제",
  "공급 부족",
  "shortage",
  "recall",
];

const HIGH_PATTERNS = [
  "실적",
  "guidance",
  "upgrade",
  "downgrade",
  "인수",
  "M&A",
  "merger",
  "acquisition",
  "earnings beat",
  "수주",
  "양산",
];

function classifySeverity(
  title: string
): "critical" | "high" | "normal" {
  const lower = title.toLowerCase();

  // 삼성전자 + 부정어
  if (
    (lower.includes("삼성전자") || lower.includes("samsung")) &&
    (lower.includes("급락") ||
      lower.includes("miss") ||
      lower.includes("조사") ||
      lower.includes("수율 문제"))
  ) {
    return "critical";
  }

  if (CRITICAL_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
    return "critical";
  }

  if (HIGH_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) {
    return "high";
  }

  return "normal";
}

// ─────────────────────────────────────────────
// Alpha Vantage news fetcher
// ─────────────────────────────────────────────

async function fetchAlphaVantageNews(): Promise<NewsItem[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=technology,finance&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (!data.feed || !Array.isArray(data.feed)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.feed.slice(0, 20).map((item: any, idx: number): NewsItem => {
      const rawSentiment: string =
        item.overall_sentiment_label?.toLowerCase() ?? "neutral";
      const sentiment: NewsItem["sentiment"] = rawSentiment.includes("bull")
        ? "bullish"
        : rawSentiment.includes("bear")
        ? "bearish"
        : "neutral";

      const tickers: string[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item.ticker_sentiment?.map((t: any) => t.ticker as string) ?? [];

      return {
        id: `av-${idx}-${Date.now()}`,
        title: item.title ?? "",
        summary: item.summary ?? "",
        url: item.url ?? "#",
        source: item.source ?? "Alpha Vantage",
        publishedAt: item.time_published
          ? new Date(
              item.time_published.replace(
                /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
                "$1-$2-$3T$4:$5:$6"
              )
            ).toISOString()
          : new Date().toISOString(),
        severity: classifySeverity(item.title ?? ""),
        tickers,
        sentiment,
      };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Yahoo Finance news fetcher
// ─────────────────────────────────────────────

async function fetchYahooFinanceNews(): Promise<NewsItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search("semiconductor AI Korea", {
      newsCount: 15,
      quotesCount: 0,
    });

    if (!result.news || !Array.isArray(result.news)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.news.map((item: any, idx: number): NewsItem => ({
      id: `yf-${idx}-${Date.now()}`,
      title: item.title ?? "",
      summary: item.title ?? "", // Yahoo Finance search only returns title in summary
      url: item.link ?? "#",
      source: item.publisher ?? "Yahoo Finance",
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
      severity: classifySeverity(item.title ?? ""),
      tickers: item.relatedTickers ?? [],
      sentiment: "neutral",
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Build fallback with generated IDs
// ─────────────────────────────────────────────

function buildFallbackNews(): NewsItem[] {
  const now = new Date();
  return FALLBACK_NEWS_RAW.map((item, idx) => ({
    id: `fallback-${idx}`,
    title: item.title,
    summary: item.summary,
    url: item.url,
    source: item.source,
    publishedAt: new Date(
      now.getTime() - idx * 30 * 60 * 1000 // stagger by 30 min
    ).toISOString(),
    severity: item.severity,
    tickers: item.tickers,
    sentiment: item.sentiment,
  }));
}

// ─────────────────────────────────────────────
// Deduplicate by title similarity
// ─────────────────────────────────────────────

function deduplicate(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.slice(0, 40).toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export async function GET() {
  try {
    const [avNews, yfNews] = await Promise.allSettled([
      fetchAlphaVantageNews(),
      fetchYahooFinanceNews(),
    ]);

    const avItems =
      avNews.status === "fulfilled" ? avNews.value : [];
    const yfItems =
      yfNews.status === "fulfilled" ? yfNews.value : [];

    let combined: NewsItem[] = deduplicate([...avItems, ...yfItems]);

    const usedFallback = combined.length < 5;
    if (usedFallback) {
      combined = buildFallbackNews();
    }

    // Sort: critical first, then high, then normal; within each group by date desc
    const severityOrder = { critical: 0, high: 1, normal: 2 };
    combined.sort((a, b) => {
      const sev = severityOrder[a.severity] - severityOrder[b.severity];
      if (sev !== 0) return sev;
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });

    // ── Clustering step ──────────────────────────────────────
    const { tagged, clusters } = clusterNews(combined.slice(0, 30));

    return NextResponse.json(
      {
        success: true,
        data: tagged,
        clusters,
        count: combined.length,
        fallback: usedFallback,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("News API error:", error);

    const { tagged: fbTagged, clusters: fbClusters } = clusterNews(buildFallbackNews());
    return NextResponse.json(
      {
        success: true,
        data: fbTagged,
        clusters: fbClusters,
        count: FALLBACK_NEWS_RAW.length,
        fallback: true,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  }
}
