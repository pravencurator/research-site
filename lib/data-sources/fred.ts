// ─────────────────────────────────────────────
// FRED API (Federal Reserve Economic Data)
// Free, requires API key. 120 req/min.
// Base URL: https://api.stlouisfed.org/fred
// ─────────────────────────────────────────────

export interface FREDObservation {
  date: string;         // "2026-06-01"
  value: number | null; // null if "." (missing)
}

export interface MacroIndicators {
  fetchedAt: string;
  // Rates
  fedFundsRate: FREDObservation | null;     // FEDFUNDS
  treasury10Y: FREDObservation | null;      // DGS10
  treasury2Y: FREDObservation | null;       // DGS2
  yieldSpread10Y2Y: number | null;          // DGS10 - DGS2 (computed)
  // Inflation & Growth
  cpi: FREDObservation | null;             // CPIAUCSL (YoY % change)
  unemployment: FREDObservation | null;    // UNRATE
  // Market
  vix: FREDObservation | null;             // VIXCLS
  dxyComponents: FREDObservation | null;   // DTWEXBGS (Broad Dollar Index)
  // Korea-specific
  krwUsd: FREDObservation | null;          // DEXKOUS (KRW per USD)
  // Commodities
  wtiOil: FREDObservation | null;          // DCOILWTICO
}

const FRED_BASE_URL = "https://api.stlouisfed.org/fred";

async function fetchLatestFREDSeries(
  seriesId: string
): Promise<FREDObservation | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `${FRED_BASE_URL}/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`FRED fetch failed for ${seriesId}: ${res.status}`);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obs: any[] = data?.observations;
    if (!Array.isArray(obs) || obs.length === 0) return null;

    const raw = obs[0];
    const rawValue: string = raw.value ?? ".";
    const value: number | null = rawValue === "." ? null : parseFloat(rawValue);

    return {
      date: raw.date ?? "",
      value: isNaN(value as number) ? null : value,
    };
  } catch (err) {
    console.warn(`FRED series error for ${seriesId}:`, err);
    return null;
  }
}

const NULL_MACRO: Omit<MacroIndicators, "fetchedAt"> = {
  fedFundsRate: null,
  treasury10Y: null,
  treasury2Y: null,
  yieldSpread10Y2Y: null,
  cpi: null,
  unemployment: null,
  vix: null,
  dxyComponents: null,
  krwUsd: null,
  wtiOil: null,
};

export async function getMacroIndicators(): Promise<MacroIndicators> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn("FRED_API_KEY not set — returning null macro indicators");
    return { fetchedAt: new Date().toISOString(), ...NULL_MACRO };
  }

  const [
    fedFundsRate,
    treasury10Y,
    treasury2Y,
    cpi,
    unemployment,
    vix,
    dxyComponents,
    krwUsd,
    wtiOil,
  ] = await Promise.all([
    fetchLatestFREDSeries("FEDFUNDS"),
    fetchLatestFREDSeries("DGS10"),
    fetchLatestFREDSeries("DGS2"),
    fetchLatestFREDSeries("CPIAUCSL"),
    fetchLatestFREDSeries("UNRATE"),
    fetchLatestFREDSeries("VIXCLS"),
    fetchLatestFREDSeries("DTWEXBGS"),
    fetchLatestFREDSeries("DEXKOUS"),
    fetchLatestFREDSeries("DCOILWTICO"),
  ]);

  const yieldSpread10Y2Y =
    treasury10Y?.value != null && treasury2Y?.value != null
      ? treasury10Y.value - treasury2Y.value
      : null;

  return {
    fetchedAt: new Date().toISOString(),
    fedFundsRate,
    treasury10Y,
    treasury2Y,
    yieldSpread10Y2Y,
    cpi,
    unemployment,
    vix,
    dxyComponents,
    krwUsd,
    wtiOil,
  };
}

// ─────────────────────────────────────────────
// Helper: generate macro context string for LLM prompts
// ─────────────────────────────────────────────

function fmtNum(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "N/A";
  return value.toFixed(decimals);
}

function fmtObs(obs: FREDObservation | null, decimals = 2): string {
  if (!obs || obs.value == null) return "N/A";
  return obs.value.toFixed(decimals);
}

export function formatMacroContext(macro: MacroIndicators): string {
  const spreadBp =
    macro.yieldSpread10Y2Y != null
      ? `${(macro.yieldSpread10Y2Y * 100).toFixed(0)}bp`
      : "N/A";

  const krwFormatted =
    macro.krwUsd?.value != null
      ? `${Math.round(macro.krwUsd.value).toLocaleString("ko-KR")}원`
      : "N/A";

  return [
    "## 거시경제 지표 (FRED, 최신)",
    `기준금리: ${fmtObs(macro.fedFundsRate)}% | 10Y국채: ${fmtObs(macro.treasury10Y)}% | 2Y국채: ${fmtObs(macro.treasury2Y)}% | 장단기 스프레드: ${spreadBp}`,
    `CPI(전월비): ${fmtObs(macro.cpi, 1)}% | 실업률: ${fmtObs(macro.unemployment, 1)}% | VIX: ${fmtObs(macro.vix, 1)} | 달러인덱스: ${fmtObs(macro.dxyComponents, 1)}`,
    `WTI유가: $${fmtNum(macro.wtiOil?.value, 1)} | 원달러: ${krwFormatted}`,
  ].join("\n");
}
