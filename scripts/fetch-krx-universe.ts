/**
 * scripts/fetch-krx-universe.ts
 *
 * 코스피 + 코스닥 전체 상장종목을 수집하여 data/krx-universe.json에 저장.
 *
 * 데이터 소스 (우선순위):
 *  1. KRX data.krx.co.kr     — API 키 불필요, 시가총액 직접 제공
 *  2. 공공데이터포털 금융위원회_주식시세정보 — PUBLIC_DATA_API_KEY 필요
 *
 * 실행:
 *   npx ts-node --project tsconfig.scripts.json scripts/fetch-krx-universe.ts
 *
 * 또는 package.json 스크립트:
 *   npm run fetch-krx
 */

import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────
// Output type
// ─────────────────────────────────────────────

export interface KrxStock {
  ticker: string;      // 6자리 KRX 코드, e.g. "005930"
  name: string;        // 회사명 (한국어 약식명)
  market: "KOSPI" | "KOSDAQ";
  marketCap: number;   // 시가총액 (억원, 0 = 조회 불가)
}

interface UniverseFile {
  fetchedAt: string;   // ISO 8601
  source: string;      // 실제 사용된 데이터 소스
  count: number;
  kospiCount: number;
  kosdaqCount: number;
  stocks: KrxStock[];
}

// ─────────────────────────────────────────────
// Helper: 최근 거래일 YYYYMMDD 반환
// (주말 보정, 공휴일 보정 불포함 — API가 빈 응답 시 -1일 재시도)
// ─────────────────────────────────────────────

function recentTradingDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 0) d.setDate(d.getDate() - 2);
  else if (day === 6) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

// ─────────────────────────────────────────────
// Source 1: KRX data.krx.co.kr  (API 키 불필요)
//
// 엔드포인트: MDCSTAT01501 (시가총액 현황)
//   - ISU_SRT_CD : 6자리 종목코드
//   - ISU_ABBRV  : 종목약명
//   - MKTCAP     : 시가총액 (억원, 쉼표 포함)
//   - MKT_TP_NM  : 시장구분명 (유가증권시장 / 코스닥시장)
// ─────────────────────────────────────────────

const KRX_URL = "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd";
const KRX_REFERER =
  "http://data.krx.co.kr/contents/MDC/MDI/mdimain/mdcmdi30102/MDCMDI30102.cmd";
const KRX_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36";

async function fetchKrxMarket(
  mktId: "STK" | "KSQ",
  trdDd: string
): Promise<KrxStock[]> {
  const market: "KOSPI" | "KOSDAQ" = mktId === "STK" ? "KOSPI" : "KOSDAQ";

  const body = new URLSearchParams({
    bld: "dbms/MDC/STAT/standard/MDCSTAT01501",
    locale: "ko_KR",
    mktId,
    trdDd,
    share: "1",
    money: "1",
    csvxls_isNo: "false",
  });

  const res = await fetch(KRX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: KRX_REFERER,
      "User-Agent": KRX_UA,
      Accept: "application/json, text/javascript, */*",
    },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`KRX HTTP ${res.status} for mktId=${mktId}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data.OutBlock_1 ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      `KRX OutBlock_1 비어있음 (mktId=${mktId}, trdDd=${trdDd}) — 공휴일 가능성`
    );
  }

  return rows
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.ISU_SRT_CD && /^\d{6}$/.test(String(r.ISU_SRT_CD))
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any): KrxStock => ({
      ticker: String(r.ISU_SRT_CD),
      name: String(r.ISU_ABBRV ?? r.ISU_NM ?? "")
        .replace(/\*/g, "")
        .trim(),
      market,
      marketCap:
        parseInt(String(r.MKTCAP ?? "0").replace(/,/g, ""), 10) || 0,
    }));
}

async function fetchFromKrx(): Promise<{ stocks: KrxStock[]; source: string }> {
  // 최근 거래일 최대 3일 전까지 재시도 (공휴일 대응)
  for (let offset = 0; offset <= 3; offset++) {
    const trdDd = recentTradingDate(offset);
    console.log(
      `  [KRX] 조회일 ${trdDd} 시도 중 (offset=${offset})...`
    );
    try {
      const [kospi, kosdaq] = await Promise.all([
        fetchKrxMarket("STK", trdDd),
        fetchKrxMarket("KSQ", trdDd),
      ]);
      const stocks = [...kospi, ...kosdaq];
      if (stocks.length < 100) {
        throw new Error(`종목 수 비정상: ${stocks.length}건`);
      }
      console.log(
        `  [KRX] 성공 — KOSPI ${kospi.length}종, KOSDAQ ${kosdaq.length}종`
      );
      return { stocks, source: `KRX data.krx.co.kr (trdDd=${trdDd})` };
    } catch (err) {
      console.warn(
        `  [KRX] offset=${offset} 실패: ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }
  throw new Error("KRX 소스 3회 연속 실패");
}

// ─────────────────────────────────────────────
// Source 2: 공공데이터포털 금융위원회_주식시세정보
//
// 환경변수: PUBLIC_DATA_API_KEY
// 엔드포인트:
//   https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo
//
// 응답 필드:
//   srtnCd     : 단축코드 (6자리)
//   itmsNm     : 종목명
//   mrktCtg    : 시장 (KOSPI / KOSDAQ)
//   clpr       : 종가
//   lstgStCnt  : 상장주식수
//   → 시총(억원) = round(clpr × lstgStCnt / 1e8)
// ─────────────────────────────────────────────

const PUBLIC_DATA_BASE =
  "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo";

async function fetchPublicDataMarket(
  mrktCls: "KOSPI" | "KOSDAQ",
  basDt: string,
  apiKey: string
): Promise<KrxStock[]> {
  const all: KrxStock[] = [];
  let pageNo = 1;
  const numOfRows = 500;

  while (true) {
    const url = new URL(PUBLIC_DATA_BASE);
    url.searchParams.set("serviceKey", apiKey);
    url.searchParams.set("numOfRows", String(numOfRows));
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("resultType", "json");
    url.searchParams.set("mrktCls", mrktCls);
    url.searchParams.set("basDt", basDt);

    const res = await fetch(url.toString());
    if (!res.ok)
      throw new Error(
        `공공데이터포털 HTTP ${res.status} (mrktCls=${mrktCls})`
      );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const respBody = json?.response?.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = respBody?.items?.item ?? [];

    if (!Array.isArray(items) || items.length === 0) break;

    for (const r of items) {
      const code = String(r.srtnCd ?? "").replace(/^A/, ""); // 'A' prefix 제거
      if (!/^\d{6}$/.test(code)) continue;

      const price =
        parseInt(String(r.clpr ?? "0").replace(/,/g, ""), 10) || 0;
      const shares =
        parseInt(String(r.lstgStCnt ?? "0").replace(/,/g, ""), 10) || 0;
      const marketCap = Math.round((price * shares) / 1e8);

      all.push({
        ticker: code,
        name: String(r.itmsNm ?? "").trim(),
        market: mrktCls,
        marketCap,
      });
    }

    const totalCount = parseInt(String(respBody?.totalCount ?? "0"), 10);
    if (all.length >= totalCount) break;
    pageNo++;

    // 간단한 rate-limit 보호
    await new Promise((r) => setTimeout(r, 200));
  }

  return all;
}

async function fetchFromPublicDataPortal(): Promise<{
  stocks: KrxStock[];
  source: string;
}> {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PUBLIC_DATA_API_KEY 환경변수 미설정 — 공공데이터포털 소스 건너뜀"
    );
  }

  // 최근 거래일 재시도
  for (let offset = 0; offset <= 3; offset++) {
    const basDt = recentTradingDate(offset);
    console.log(
      `  [공공데이터포털] 조회일 ${basDt} 시도 중 (offset=${offset})...`
    );
    try {
      const [kospi, kosdaq] = await Promise.all([
        fetchPublicDataMarket("KOSPI", basDt, apiKey),
        fetchPublicDataMarket("KOSDAQ", basDt, apiKey),
      ]);
      const stocks = [...kospi, ...kosdaq];
      if (stocks.length < 100)
        throw new Error(`종목 수 비정상: ${stocks.length}건`);
      console.log(
        `  [공공데이터포털] 성공 — KOSPI ${kospi.length}종, KOSDAQ ${kosdaq.length}종`
      );
      return {
        stocks,
        source: `공공데이터포털 금융위원회_주식시세정보 (basDt=${basDt})`,
      };
    } catch (err) {
      console.warn(
        `  [공공데이터포털] offset=${offset} 실패: ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }
  throw new Error("공공데이터포털 소스 3회 연속 실패");
}

// ─────────────────────────────────────────────
// Dedup & sort
// ─────────────────────────────────────────────

function dedupAndSort(stocks: KrxStock[]): KrxStock[] {
  const seen = new Map<string, KrxStock>();
  for (const s of stocks) {
    if (!seen.has(s.ticker)) seen.set(s.ticker, s);
  }
  return [...seen.values()].sort((a, b) => b.marketCap - a.marketCap);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log("=== KRX 유니버스 수집 시작 ===");
  console.log(`실행 시각: ${new Date().toISOString()}`);
  console.log("");

  let result: { stocks: KrxStock[]; source: string } | null = null;

  // 1차: KRX
  console.log("[1/2] KRX data.krx.co.kr 시도...");
  try {
    result = await fetchFromKrx();
  } catch (err) {
    console.error(
      `  KRX 소스 최종 실패: ${err instanceof Error ? err.message : err}`
    );
  }

  // 2차: 공공데이터포털
  if (!result) {
    console.log("[2/2] 공공데이터포털 시도...");
    try {
      result = await fetchFromPublicDataPortal();
    } catch (err) {
      console.error(
        `  공공데이터포털 소스 최종 실패: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  if (!result) {
    console.error(
      "\n❌ 모든 데이터 소스 실패. data/krx-universe.json 갱신 안 됨."
    );
    process.exit(1);
  }

  const stocks = dedupAndSort(result.stocks);
  const kospiCount = stocks.filter((s) => s.market === "KOSPI").length;
  const kosdaqCount = stocks.filter((s) => s.market === "KOSDAQ").length;

  const output: UniverseFile = {
    fetchedAt: new Date().toISOString(),
    source: result.source,
    count: stocks.length,
    kospiCount,
    kosdaqCount,
    stocks,
  };

  // 저장
  const outDir = path.resolve(__dirname, "../data");
  const outPath = path.join(outDir, "krx-universe.json");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log("");
  console.log("=== 완료 ===");
  console.log(`저장 경로 : ${outPath}`);
  console.log(`데이터 소스: ${result.source}`);
  console.log(`총 종목수  : ${stocks.length}건`);
  console.log(`  KOSPI   : ${kospiCount}종`);
  console.log(`  KOSDAQ  : ${kosdaqCount}종`);
  console.log(
    `시총 TOP5 :\n${stocks
      .slice(0, 5)
      .map(
        (s, i) =>
          `  ${i + 1}. ${s.name} (${s.ticker}) — ${s.marketCap.toLocaleString()}억원`
      )
      .join("\n")}`
  );
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
