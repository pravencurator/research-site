// ─────────────────────────────────────────────
// News clustering: theme definitions + grouping logic
// ─────────────────────────────────────────────

export const THEME_CLUSTER_MAP: Record<
  string,
  { label: string; icon: string; keywords: string[]; tickers: string[]; chain: string }
> = {
  HBM_SUPPLY: {
    label: "HBM 공급망",
    icon: "💾",
    keywords: ["HBM", "HBM4", "HBM3", "고대역폭", "한미반도체", "TC본더", "hbm"],
    tickers: ["000660.KS", "MU", "042700.KS"],
    chain: "AI 수요 → GPU → HBM 메모리 → 첨단 패키징",
  },
  AI_GPU_INFRA: {
    label: "AI GPU·인프라",
    icon: "⚡",
    keywords: [
      "Blackwell", "GPU", "CoWoS", "AI 서버", "데이터센터",
      "blackwell", "cowos", "NVIDIA", "엔비디아",
    ],
    tickers: ["NVDA", "TSM", "AVGO", "SMCI"],
    chain: "클라우드 Capex → GPU → CoWoS 패키징 → 전력·냉각",
  },
  EXPORT_CONTROL: {
    label: "수출규제",
    icon: "🚧",
    keywords: [
      "수출규제", "수출 통제", "대중국", "entity list", "BIS",
      "수출제한", "export control", "ban", "제재",
    ],
    tickers: ["NVDA", "LRCX", "AMAT", "6857.T"],
    chain: "지정학 → 미국 BIS 규제 → 장비·칩 공급 제한",
  },
  SEMICON_EQUIP: {
    label: "반도체 장비",
    icon: "🏭",
    keywords: [
      "장비", "식각", "수주", "어드밴테스트", "AMAT",
      "Lam Research", "도쿄일렉트론", "CVD", "ALD",
    ],
    tickers: ["AMAT", "LRCX", "8035.T", "6857.T", "322000.KS"],
    chain: "파운드리·메모리 CAPEX → 전공정 장비 수주 → 장비사 실적",
  },
  MEMORY_CYCLE: {
    label: "메모리 사이클",
    icon: "📈",
    keywords: ["DRAM", "DDR5", "NAND", "메모리", "수율", "양산", "memory"],
    tickers: ["005930.KS", "000660.KS", "MU", "WDC"],
    chain: "AI 서버 DRAM 수요 → 공급 타이트 → 계약가 상승 → 마진 확대",
  },
  CUSTOM_ASIC: {
    label: "커스텀 AI칩",
    icon: "🔷",
    keywords: ["ASIC", "커스텀", "custom", "Marvell", "마벨", "ARM", "로열티", "TPU"],
    tickers: ["MRVL", "AVGO", "ARM"],
    chain: "하이퍼스케일러 자체칩 → ARM IP 수요 → ASIC 설계서비스",
  },
};

export interface ClusterableNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  severity: "critical" | "high" | "normal";
  tickers?: string[];
  sentiment?: "bullish" | "bearish" | "neutral";
  clusterTag?: string;
}

export interface NewsCluster {
  tag: string;
  label: string;
  icon: string;
  chain: string;
  items: ClusterableNewsItem[];
}

export function clusterNews(items: ClusterableNewsItem[]): {
  tagged: ClusterableNewsItem[];
  clusters: NewsCluster[];
} {
  // Map item.id → first matching cluster key
  const itemClusterMap = new Map<string, string>();

  for (const item of items) {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();

    for (const [clusterKey, def] of Object.entries(THEME_CLUSTER_MAP)) {
      const kwMatch = def.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
      const tkMatch = (item.tickers ?? []).some((t) => def.tickers.includes(t));

      if ((kwMatch || tkMatch) && !itemClusterMap.has(item.id)) {
        itemClusterMap.set(item.id, clusterKey);
      }
    }
  }

  // Group into per-cluster buckets
  const buckets = new Map<string, ClusterableNewsItem[]>();
  for (const [itemId, key] of itemClusterMap) {
    if (!buckets.has(key)) buckets.set(key, []);
    const item = items.find((i) => i.id === itemId);
    if (item) buckets.get(key)!.push(item);
  }

  // Only clusters with ≥ 2 items qualify
  const valid = new Map<string, ClusterableNewsItem[]>();
  for (const [tag, group] of buckets) {
    if (group.length >= 2) valid.set(tag, group);
  }

  // Stamp clusterTag on qualifying items
  const tagged = items.map((item) => {
    const tag = itemClusterMap.get(item.id);
    if (tag && valid.has(tag)) return { ...item, clusterTag: tag };
    return item;
  });

  // Build ordered cluster list (by descending item count)
  const clusters: NewsCluster[] = [...valid.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, group]) => {
      const def = THEME_CLUSTER_MAP[tag];
      return { tag, label: def.label, icon: def.icon, chain: def.chain, items: group };
    });

  return { tagged, clusters };
}
