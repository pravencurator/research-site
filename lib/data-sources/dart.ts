// ─────────────────────────────────────────────
// DART OpenAPI (한국 전자공시시스템)
// Free, 20,000 req/day with key.
// Base URL: https://opendart.fss.or.kr/api
// ─────────────────────────────────────────────

export interface DARTDisclosure {
  rcept_no: string;      // 접수번호
  corp_name: string;     // 회사명
  report_nm: string;     // 보고서명
  rcept_dt: string;      // 접수일자 YYYYMMDD
  rm: string;            // 비고
}

export interface DARTFinancialStatement {
  corp_code: string;
  bsns_year: string;     // 사업연도
  reprt_code: string;    // 보고서 코드 (11011=사업보고서)
  account_nm: string;    // 계정명
  thstrm_amount: string; // 당기 금액
  frmtrm_amount: string; // 전기 금액
  currency: string;
}

// 주요 종목 corp_code 하드코딩 (API 호출 절약)
const CORP_CODE_MAP: Record<string, string> = {
  "005930.KS": "00126380", // 삼성전자
  "000660.KS": "00164779", // SK하이닉스
  "322000.KS": "01632723", // 피에스케이홀딩스
  "042700.KS": "00752786", // 한미반도체
  "009150.KS": "00164309", // 삼성전기
};

const DART_BASE_URL = "https://opendart.fss.or.kr/api";

// YYYYMMDD 형식 날짜 문자열 반환
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function getDARTRecentDisclosures(
  ticker: string,
  limit = 5
): Promise<DARTDisclosure[]> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    console.warn("DART_API_KEY not set — skipping DART disclosures fetch");
    return [];
  }

  const corpCode = CORP_CODE_MAP[ticker.toUpperCase()] ?? CORP_CODE_MAP[ticker];
  if (!corpCode) {
    // Ticker not in the hardcoded map — skip to avoid unnecessary API calls
    return [];
  }

  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const bgnDe = toDateStr(ninetyDaysAgo);
  const endDe = toDateStr(today);

  try {
    const url = `${DART_BASE_URL}/list.json?corp_code=${encodeURIComponent(corpCode)}&bgn_de=${bgnDe}&end_de=${endDe}&pblntf_ty=A&page_count=${limit}&crtfc_key=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`DART disclosures fetch failed for ${ticker}: ${res.status}`);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    // DART API returns status "000" on success
    if (data?.status !== "000") {
      console.warn(`DART disclosures non-success status for ${ticker}:`, data?.status, data?.message);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = Array.isArray(data.list) ? data.list : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((item: any): DARTDisclosure => ({
      rcept_no: item.rcept_no ?? "",
      corp_name: item.corp_name ?? "",
      report_nm: item.report_nm ?? "",
      rcept_dt: item.rcept_dt ?? "",
      rm: item.rm ?? "",
    }));
  } catch (err) {
    console.warn(`DART disclosures error for ${ticker}:`, err);
    return [];
  }
}

export async function getDARTFinancials(
  ticker: string
): Promise<DARTFinancialStatement[]> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    console.warn("DART_API_KEY not set — skipping DART financials fetch");
    return [];
  }

  const corpCode = CORP_CODE_MAP[ticker.toUpperCase()] ?? CORP_CODE_MAP[ticker];
  if (!corpCode) {
    return [];
  }

  // 전년도 사업연도 사용 (가장 최근 완성된 연간 보고서)
  const lastFY = new Date().getFullYear() - 1;

  try {
    const url = `${DART_BASE_URL}/fnlttSinglAcntAll.json?corp_code=${encodeURIComponent(corpCode)}&bsns_year=${lastFY}&reprt_code=11011&fs_div=CFS&crtfc_key=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`DART financials fetch failed for ${ticker}: ${res.status}`);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();

    if (data?.status !== "000") {
      console.warn(`DART financials non-success status for ${ticker}:`, data?.status, data?.message);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = Array.isArray(data.list) ? data.list : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((item: any): DARTFinancialStatement => ({
      corp_code: item.corp_code ?? corpCode,
      bsns_year: item.bsns_year ?? String(lastFY),
      reprt_code: item.reprt_code ?? "11011",
      account_nm: item.account_nm ?? "",
      thstrm_amount: item.thstrm_amount ?? "",
      frmtrm_amount: item.frmtrm_amount ?? "",
      currency: item.currency ?? "KRW",
    }));
  } catch (err) {
    console.warn(`DART financials error for ${ticker}:`, err);
    return [];
  }
}
