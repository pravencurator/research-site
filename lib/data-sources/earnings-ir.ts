// ─────────────────────────────────────────────────────────────────────────────
// Earnings Calls, IR Materials, Guidance & Conference Calls
// Sources:
//   - DART (한국): 실적발표, 투자설명회, IR 자료, 수시공시
//   - SEC EDGAR (미국): 8-K earnings releases, 10-Q/10-K management discussion
//   - Alpha Vantage: Earnings surprises & estimates
//   - FMP: Earnings call transcripts (premium), earnings surprises (free)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EarningsEvent {
  ticker: string;
  reportedDate: string;        // ISO date
  period: string;              // e.g. "Q1 2026", "FY2025"
  reportedEPS: number | null;
  estimatedEPS: number | null;
  epsSurprise: number | null;  // %
  reportedRevenue: number | null;   // millions
  estimatedRevenue: number | null;  // millions
  revenueSurprise: number | null;   // %
  source: string;
}

export interface GuidanceItem {
  ticker: string;
  announcedDate: string;
  period: string;              // guidance period
  metric: string;              // "Revenue", "EPS", "Operating Margin" etc.
  lowEstimate: number | null;
  highEstimate: number | null;
  midpoint: number | null;
  unit: string;                // "USD millions", "KRW billions", "%"
  managementComment: string;
  source: string;
}

export interface ConferenceCallHighlight {
  ticker: string;
  callDate: string;
  callType: "earnings" | "investor-day" | "conference" | "ir-presentation";
  keyThemes: string[];         // AI, HBM, CoWoS, capacity, pricing, etc.
  managementQuotes: string[];  // key direct quotes from mgmt
  analystQuestions: string[];  // key questions raised by sell-side
  guidanceSummary: string;
  source: string;
}

export interface IRMaterialSummary {
  ticker: string;
  company: string;
  fetchedAt: string;

  recentEarnings: EarningsEvent[];
  guidance: GuidanceItem[];
  conferenceCallHighlights: ConferenceCallHighlight[];
  dartDisclosureTypes: string[];  // types of DART disclosures found (for Korean stocks)
  formattedForLLM: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DART — 실적 관련 공시 (한국 기업)
// 공시 유형: 실적발표(A), 수시공시(B), 지분공시(D), 투자설명회(I)
// ─────────────────────────────────────────────────────────────────────────────

const CORP_CODE_MAP: Record<string, string> = {
  "005930.KS": "00126380", // 삼성전자
  "000660.KS": "00164779", // SK하이닉스
  "322000.KS": "01632723", // 피에스케이홀딩스
  "042700.KS": "00752786", // 한미반도체
  "009150.KS": "00164309", // 삼성전기
};

const COMPANY_NAME_MAP: Record<string, string> = {
  "005930.KS": "삼성전자",
  "000660.KS": "SK하이닉스",
  "322000.KS": "피에스케이홀딩스",
  "042700.KS": "한미반도체",
  "009150.KS": "삼성전기",
};

function toDateStr(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

async function fetchDARTEarningsDisclosures(
  ticker: string
): Promise<{ reportNames: string[]; dates: string[] }> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) return { reportNames: [], dates: [] };

  const corpCode = CORP_CODE_MAP[ticker] ?? CORP_CODE_MAP[ticker.toUpperCase()];
  if (!corpCode) return { reportNames: [], dates: [] };

  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  try {
    // 실적 관련 공시: 분기보고서(11012), 반기보고서(11013), 사업보고서(11011)
    // pblntf_ty=A: 정기공시, B: 수시공시, I: IR자료
    const url = `https://opendart.fss.or.kr/api/list.json?corp_code=${corpCode}&bgn_de=${toDateStr(oneYearAgo)}&end_de=${toDateStr(today)}&pblntf_ty=A&page_count=20&crtfc_key=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { reportNames: [], dates: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (data?.status !== "000") return { reportNames: [], dates: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = Array.isArray(data.list) ? data.list : [];
    return {
      reportNames: list.map((i) => i.report_nm ?? ""),
      dates: list.map((i) => i.rcept_dt ?? ""),
    };
  } catch {
    return { reportNames: [], dates: [] };
  }
}

async function fetchDARTIRMaterials(
  ticker: string
): Promise<string[]> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) return [];

  const corpCode = CORP_CODE_MAP[ticker] ?? CORP_CODE_MAP[ticker.toUpperCase()];
  if (!corpCode) return [];

  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  try {
    // 수시공시(B)에는 IR자료, 투자설명회, 실적발표 자료 포함
    const url = `https://opendart.fss.or.kr/api/list.json?corp_code=${corpCode}&bgn_de=${toDateStr(sixMonthsAgo)}&end_de=${toDateStr(today)}&pblntf_ty=B&page_count=10&crtfc_key=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (data?.status !== "000") return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = Array.isArray(data.list) ? data.list : [];
    return list
      .filter((i) => {
        const name: string = i.report_nm ?? "";
        return (
          name.includes("IR") ||
          name.includes("실적") ||
          name.includes("투자설명") ||
          name.includes("컨퍼런스") ||
          name.includes("guidance") ||
          name.includes("Guidance")
        );
      })
      .map((i) => `[${i.rcept_dt}] ${i.report_nm}`);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEC EDGAR — 8-K earnings releases (US companies)
// ─────────────────────────────────────────────────────────────────────────────

// CIK numbers for major US names in coverage
const SEC_CIK_MAP: Record<string, string> = {
  NVDA: "0001045810",
  MRVL: "0001058057",
  AMAT: "0000796343",
  LRCX: "0000707549",
  MU:   "0000723125",
  ARM:  "0001974329",
  TSLA: "0001318605",
  INTC: "0000050863",
  AMD:  "0000002488",
};

async function fetchSECRecentFilings(ticker: string): Promise<string[]> {
  const cik = SEC_CIK_MAP[ticker.toUpperCase()];
  if (!cik) return [];

  try {
    // SEC EDGAR submissions API — no key required
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "ResearchAgent research@example.com" },
    });
    if (!res.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const recent = data?.filings?.recent;
    if (!recent) return [];

    const forms: string[] = recent.form ?? [];
    const dates: string[] = recent.filingDate ?? [];
    const descriptions: string[] = recent.primaryDocument ?? [];

    const results: string[] = [];
    for (let i = 0; i < Math.min(forms.length, 50); i++) {
      const form = forms[i];
      if (form === "8-K" || form === "10-Q" || form === "10-K") {
        results.push(`[${dates[i]}] ${form}: ${descriptions[i]}`);
        if (results.length >= 5) break;
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Alpha Vantage — Earnings surprises
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAlphaVantageEarnings(ticker: string): Promise<EarningsEvent[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return [];

  // Strip exchange suffix for AV
  const avTicker = ticker.replace(/\.(KS|T|L|PA|DE)$/i, "");

  try {
    const url = `https://www.alphavantage.co/query?function=EARNINGS&symbol=${encodeURIComponent(avTicker)}&apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (data?.Information || data?.Note) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quarterly: any[] = Array.isArray(data.quarterlyEarnings)
      ? data.quarterlyEarnings.slice(0, 4)
      : [];

    return quarterly.map((q): EarningsEvent => {
      const reported = parseFloat(q.reportedEPS);
      const estimated = parseFloat(q.estimatedEPS);
      const surprise = !isNaN(reported) && !isNaN(estimated) && estimated !== 0
        ? ((reported - estimated) / Math.abs(estimated)) * 100
        : null;
      return {
        ticker,
        reportedDate: q.reportedDate ?? "",
        period: q.fiscalDateEnding ?? "",
        reportedEPS: isNaN(reported) ? null : reported,
        estimatedEPS: isNaN(estimated) ? null : estimated,
        epsSurprise: surprise,
        reportedRevenue: null,
        estimatedRevenue: null,
        revenueSurprise: null,
        source: "Alpha Vantage",
      };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FMP — Earnings surprises (free tier)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFMPEarningsSurprises(ticker: string): Promise<EarningsEvent[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://financialmodelingprep.com/api/v3/earnings-surprises/${encodeURIComponent(ticker)}?apikey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

    return data.slice(0, 4).map((q): EarningsEvent => {
      const reported = q.actualEarningResult ?? null;
      const estimated = q.estimatedEarning ?? null;
      const surprise = reported !== null && estimated !== null && estimated !== 0
        ? ((reported - estimated) / Math.abs(estimated)) * 100
        : null;
      return {
        ticker,
        reportedDate: q.date ?? "",
        period: q.date ?? "",
        reportedEPS: reported,
        estimatedEPS: estimated,
        epsSurprise: surprise,
        reportedRevenue: null,
        estimatedRevenue: null,
        revenueSurprise: null,
        source: "Financial Modeling Prep",
      };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Format for LLM prompt
// ─────────────────────────────────────────────────────────────────────────────

function formatEarningsForLLM(events: EarningsEvent[]): string {
  if (events.length === 0) return "(어닝 데이터 없음)";
  const fmt = (v: number | null, d = 2) => v === null ? "N/A" : v.toFixed(d);
  return events
    .map(
      (e) =>
        `- ${e.period} (${e.reportedDate}): EPS ${fmt(e.reportedEPS)} vs 추정 ${fmt(e.estimatedEPS)} → ${e.epsSurprise !== null ? (e.epsSurprise >= 0 ? "+" : "") + e.epsSurprise.toFixed(1) + "% 서프라이즈" : "N/A"}`
    )
    .join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: getIRMaterialSummary
// ─────────────────────────────────────────────────────────────────────────────

export async function getIRMaterialSummary(
  ticker: string
): Promise<IRMaterialSummary> {
  const isKorean = /^\d{6}/.test(ticker) || ticker.toUpperCase().endsWith(".KS");
  const company = COMPANY_NAME_MAP[ticker] ?? ticker;
  const fetchedAt = new Date().toISOString();

  const [
    avEarnings,
    fmpEarnings,
    dartEarnings,
    dartIR,
    secFilings,
  ] = await Promise.all([
    fetchAlphaVantageEarnings(ticker),
    fetchFMPEarningsSurprises(ticker),
    isKorean ? fetchDARTEarningsDisclosures(ticker) : Promise.resolve({ reportNames: [], dates: [] }),
    isKorean ? fetchDARTIRMaterials(ticker) : Promise.resolve([]),
    !isKorean ? fetchSECRecentFilings(ticker) : Promise.resolve([]),
  ]);

  // Merge earnings data (prefer FMP, supplement with AV)
  const recentEarnings: EarningsEvent[] =
    fmpEarnings.length > 0 ? fmpEarnings : avEarnings;

  const sections: string[] = [];

  // Earnings surprises
  if (recentEarnings.length > 0) {
    sections.push(`## 최근 실적 서프라이즈 (최근 4분기)\n${formatEarningsForLLM(recentEarnings)}`);
  }

  // DART disclosures (Korean)
  if (dartEarnings.reportNames.length > 0) {
    const dlines = dartEarnings.reportNames
      .slice(0, 5)
      .map((nm, i) => `- [${dartEarnings.dates[i]}] ${nm}`)
      .join("\n");
    sections.push(`## DART 정기 공시 (최근 1년)\n${dlines}`);
  }

  // DART IR materials (Korean)
  if (dartIR.length > 0) {
    sections.push(`## DART IR 자료 / 수시공시\n${dartIR.slice(0, 5).join("\n")}`);
  }

  // SEC filings (US)
  if (secFilings.length > 0) {
    sections.push(`## SEC EDGAR 최근 공시\n${secFilings.join("\n")}`);
  }

  // DART disclosure types found
  const dartDisclosureTypes = [...dartEarnings.reportNames, ...dartIR];

  return {
    ticker,
    company,
    fetchedAt,
    recentEarnings,
    guidance: [],           // To be populated from parsed 8-K/DART text (future)
    conferenceCallHighlights: [],  // Future: transcript parsing
    dartDisclosureTypes,
    formattedForLLM: sections.join("\n\n") || "(IR/실적 데이터 없음)",
  };
}
