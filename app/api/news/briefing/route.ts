import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import yahooFinance from "@/lib/data-sources/yahoo-finance";
import { clusterNews, type NewsCluster, type ClusterableNewsItem } from "@/lib/news-clusters";

// ─────────────────────────────────────────────
// News fetchers (mirrored from /api/news for server-side reuse)
// ─────────────────────────────────────────────

const FALLBACK_RAW: Omit<ClusterableNewsItem, "id">[] = [
  {
    title: "엔비디아 Blackwell B200 수요 공급 불균형 지속",
    summary: "Blackwell B200 GPU 수요가 공급을 크게 초과하며 납기 지연이 장기화. 데이터센터 고객사 예약 2026년 말까지.",
    url: "#", source: "Bloomberg", publishedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    severity: "high", tickers: ["NVDA"], sentiment: "bullish",
  },
  {
    title: "SK하이닉스 HBM4 양산 가속화, 2026년 공급 타이트",
    summary: "SK하이닉스 HBM4 양산 일정을 앞당기면서도 수요가 공급 상회. AI 가속기용 HBM 전체 시장 공급 부족 심화.",
    url: "#", source: "Korea Herald", publishedAt: new Date(Date.now() - 120 * 60000).toISOString(),
    severity: "critical", tickers: ["000660.KS"], sentiment: "bullish",
  },
  {
    title: "TSMC 선진 패키징 수주 급증, CoWoS 예약 2년치",
    summary: "TSMC CoWoS 패키징 예약이 2028년까지 꽉 찬 것으로 알려짐. AI 가속기 제조사들의 패키징 수요가 TSMC에 집중.",
    url: "#", source: "Reuters", publishedAt: new Date(Date.now() - 180 * 60000).toISOString(),
    severity: "high", tickers: ["TSM", "NVDA"], sentiment: "bullish",
  },
  {
    title: "AI 서버 수요 증가로 DDR5 고급 패키징 부족 심화",
    summary: "AI 서버 전환 가속화로 DDR5 고급 패키징 수요 급증. 마이크론과 SK하이닉스 모두 증설 서두르는 중.",
    url: "#", source: "Bloomberg", publishedAt: new Date(Date.now() - 240 * 60000).toISOString(),
    severity: "critical", tickers: ["MU", "000660.KS"], sentiment: "bullish",
  },
  {
    title: "미국 대중 반도체 수출규제 추가 강화 논의",
    summary: "미국 상무부가 대중국 반도체 수출 통제 범위 확대 검토. 고대역폭 메모리와 AI칩 제조 장비 추가 규제 가능성.",
    url: "#", source: "WSJ", publishedAt: new Date(Date.now() - 300 * 60000).toISOString(),
    severity: "critical", tickers: ["NVDA", "LRCX"], sentiment: "bearish",
  },
  {
    title: "어드밴테스트 HBM 테스트 장비 수주 기록 경신",
    summary: "어드밴테스트 HBM 전용 테스트 장비 수주액이 분기 기준 역대 최고치 경신. HBM3E 및 HBM4 양산 증가가 수요 견인.",
    url: "#", source: "Nikkei", publishedAt: new Date(Date.now() - 360 * 60000).toISOString(),
    severity: "normal", tickers: ["6857.T"], sentiment: "bullish",
  },
  {
    title: "AMAT 어드밴스드 패키징 매출 50% 성장 가이던스",
    summary: "Applied Materials가 어드밴스드 패키징 장비 부문 2026년 50%+ 성장을 전망. AI 반도체 수요가 핵심 동인.",
    url: "#", source: "AMAT IR", publishedAt: new Date(Date.now() - 420 * 60000).toISOString(),
    severity: "high", tickers: ["AMAT"], sentiment: "bullish",
  },
  {
    title: "마벨 커스텀 ASIC 매출 급성장, 클라우드향 견조",
    summary: "마벨 커스텀 ASIC 사업부 매출이 전년 대비 두 배 이상 성장. 클라우드 자체칩 설계 지원 프로젝트 다수 진행.",
    url: "#", source: "Reuters", publishedAt: new Date(Date.now() - 480 * 60000).toISOString(),
    severity: "high", tickers: ["MRVL"], sentiment: "bullish",
  },
];

async function fetchNewsItems(): Promise<ClusterableNewsItem[]> {
  const items: ClusterableNewsItem[] = [];

  // Alpha Vantage
  const avKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (avKey) {
    try {
      const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=technology,finance&apikey=${avKey}`;
      const res = await fetch(url, { next: { revalidate: 300 } } as Parameters<typeof fetch>[1]);
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        if (Array.isArray(data.feed)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const [idx, item] of (data.feed.slice(0, 20) as any[]).entries()) {
            const raw: string = item.overall_sentiment_label?.toLowerCase() ?? "neutral";
            items.push({
              id: `av-${idx}`,
              title: item.title ?? "",
              summary: item.summary ?? "",
              url: item.url ?? "#",
              source: item.source ?? "Alpha Vantage",
              publishedAt: item.time_published
                ? new Date(item.time_published.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3T$4:$5:$6")).toISOString()
                : new Date().toISOString(),
              severity: "normal",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tickers: item.ticker_sentiment?.map((t: any) => t.ticker as string) ?? [],
              sentiment: raw.includes("bull") ? "bullish" : raw.includes("bear") ? "bearish" : "neutral",
            });
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Yahoo Finance
  if (items.length < 5) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await yahooFinance.search("semiconductor AI Korea", { newsCount: 15, quotesCount: 0 });
      if (Array.isArray(result.news)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const [idx, item] of (result.news as any[]).entries()) {
          items.push({
            id: `yf-${idx}`,
            title: item.title ?? "",
            summary: item.title ?? "",
            url: item.link ?? "#",
            source: item.publisher ?? "Yahoo Finance",
            publishedAt: item.providerPublishTime
              ? new Date(item.providerPublishTime * 1000).toISOString()
              : new Date().toISOString(),
            severity: "normal",
            tickers: item.relatedTickers ?? [],
            sentiment: "neutral",
          });
        }
      }
    } catch { /* ignore */ }
  }

  // Fallback
  if (items.length < 5) {
    return FALLBACK_RAW.map((r, i) => ({ ...r, id: `fb-${i}` }));
  }

  return items;
}

// ─────────────────────────────────────────────
// Cross-Asset Beta Cascade Protocol via Claude
// ─────────────────────────────────────────────

export interface BriefingAnalysis {
  headlineSummary: string;
  realMessage: string;
  conclusion: string;
}

async function runCrossAssetCascade(clusters: NewsCluster[]): Promise<BriefingAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || clusters.length === 0) return null;

  const client = new Anthropic({ apiKey });

  const clusterText = clusters
    .map((c) => {
      const lines = c.items.map((i) => `  • ${i.title} (${i.source})`).join("\n");
      return `**[${c.icon} ${c.label}]** — 밸류체인: ${c.chain}\n${lines}`;
    })
    .join("\n\n");

  const prompt = `당신은 글로벌 IB 시니어 매크로 전략가입니다. Cross-Asset Beta Cascade Protocol을 적용해 오늘의 뉴스 클러스터에서 진짜 메시지를 추출하세요.

## 오늘의 클러스터 (동일 밸류체인·테마 뉴스 2건 이상 동시 발생)

${clusterText}

## Cross-Asset Beta Cascade Protocol 지침

1. **업스트림 촉매 식별**: 어떤 사건이 가장 먼저 발생했는가? 무엇이 근본 원인인가?
2. **베타 캐스케이드 추적**: 그 충격이 밸류체인을 따라 전파되는 경로를 A → B → C 형식으로 명시
3. **숨겨진 2차 효과**: 시장이 아직 완전히 반영하지 못한 간접 수혜/피해 자산을 1개 이상 명시
4. **포지셔닝 결론**: 한 문장으로 투자자가 취해야 할 행동 방향 제시

**출력 형식** (JSON만, 코드블록 없이):
{"headlineSummary":"헤드라인 핵심 요약 1-2문장","realMessage":"캐스케이드 분석: A → B → C 체인 + 숨겨진 효과 포함 2-3문장","conclusion":"포지셔닝 결론 1문장"}`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    // Strip markdown code fences if model added them
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(clean);
    return {
      headlineSummary: String(parsed.headlineSummary ?? ""),
      realMessage: String(parsed.realMessage ?? ""),
      conclusion: String(parsed.conclusion ?? ""),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export interface BriefingResponse {
  success: boolean;
  date: string;
  clusters: NewsCluster[];
  analysis: BriefingAnalysis | null;
  generatedAt: string;
}

export async function GET() {
  try {
    const items = await fetchNewsItems();
    const { clusters } = clusterNews(items);

    // Only call Claude if we actually have clusters
    const analysis = clusters.length > 0 ? await runCrossAssetCascade(clusters) : null;

    const body: BriefingResponse = {
      success: true,
      date: new Date().toISOString().slice(0, 10),
      clusters,
      analysis,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      headers: {
        // Cache for 30 min at edge; serve stale up to 60 min while revalidating
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Briefing API error:", error);
    return NextResponse.json(
      { success: false, date: new Date().toISOString().slice(0, 10), clusters: [], analysis: null, generatedAt: new Date().toISOString() },
      { status: 500 }
    );
  }
}
