import { NextResponse } from "next/server";
import yahooFinance from "@/lib/data-sources/yahoo-finance";

// ─────────────────────────────────────────────────────────────────────────────
// KOSPI 시총 5천억 이상 주요 종목 (약 80개)
// ─────────────────────────────────────────────────────────────────────────────

interface WatchlistItem {
  symbol: string;
  name: string;
  sector: string;
  description: string;
}

const KOREAN_WATCHLIST: WatchlistItem[] = [
  // ── 반도체 ──────────────────────────────────────────────────────────────────
  { symbol: "005930.KS", name: "삼성전자", sector: "반도체", description: "세계 최대 메모리 반도체·스마트폰 제조사. DRAM·NAND·HBM 전 영역 1~2위 점유.\n파운드리(GAP) 확장과 HBM4 공급망에서 핵심 역할을 담당한다." },
  { symbol: "000660.KS", name: "SK하이닉스", sector: "반도체", description: "HBM3E 세계 점유율 1위(약 50%)를 보유한 AI 메모리 전문기업. 엔비디아 H100/H200 전량 공급.\n2025년 HBM4 양산 시작으로 프리미엄 메모리 시장 지배력 강화 중이다." },
  { symbol: "009150.KS", name: "삼성전기", sector: "반도체", description: "MLCC·카메라모듈·반도체패키지 기판을 생산하는 삼성그룹 부품사. AI 서버용 고용량 MLCC 수요 급증 수혜.\n전장·5G·AI 수요 확대로 고부가 제품 비중이 빠르게 높아지고 있다." },
  { symbol: "042700.KS", name: "한미반도체", sector: "반도체", description: "HBM 제조 핵심 장비인 TC본더 글로벌 점유율 1위 기업. SK하이닉스·마이크론에 독점 공급.\n2025~2026년 HBM4 전환 수혜로 수주잔고 사상 최대치를 기록 중이다." },
  { symbol: "322000.KS", name: "피에스케이홀딩스", sector: "반도체", description: "반도체 PR Stripper 장비 국내 점유율 90% 이상인 독과점 장비사.\nHBM 및 3D-NAND 적층 확대로 장비 교체 사이클이 가속화되고 있다." },
  { symbol: "066970.KS", name: "LG이노텍", sector: "반도체", description: "애플 아이폰용 카메라모듈·FC-BGA 기판을 생산하는 LG그룹 부품사.\nFC-BGA는 AI 서버 CPU 기판으로 신성장 동력이 되고 있다." },
  { symbol: "000990.KS", name: "DB하이텍", sector: "반도체", description: "8인치 파운드리 전문기업으로 아날로그·전력 반도체 위탁생산에 특화.\nEV·산업용 전력반도체 수요 증가로 8인치 생산능력이 희소 자원으로 부각 중이다." },

  // ── IT/플랫폼/게임 ───────────────────────────────────────────────────────────
  { symbol: "035420.KS", name: "NAVER", sector: "IT/플랫폼", description: "국내 1위 검색·광고 플랫폼. 하이퍼클로바X AI 모델 기반 B2B·커머스 AI 전환 주도.\nSME(중소기업) 광고·커머스 생태계가 매출 성장의 주축을 이루고 있다." },
  { symbol: "035720.KS", name: "카카오", sector: "IT/플랫폼", description: "카카오톡·카카오페이·카카오뱅크를 중심으로 한 국내 최대 모바일 생태계 기업.\n플랫폼 규제 리스크와 AI 전환 비용이 단기 수익성 압박 요인으로 작용 중이다." },
  { symbol: "259960.KS", name: "크래프톤", sector: "IT/플랫폼", description: "배틀그라운드(PUBG) IP 보유 글로벌 게임사. 인도·동남아 모바일 시장 압도적 1위.\n신작 출시 사이클이 2025~2026년 실적 재성장의 핵심 변수다." },
  { symbol: "352820.KS", name: "하이브", sector: "IT/플랫폼", description: "BTS·세븐틴·뉴진스 등 글로벌 K팝 IP 보유 엔터테인먼트·테크기업.\n팬덤 플랫폼 위버스 글로벌 확장과 아티스트 복귀 일정이 주가 방향을 결정한다." },
  { symbol: "018260.KS", name: "삼성SDS", sector: "IT/플랫폼", description: "삼성그룹 IT 서비스·물류 IT 전담 계열사. 클라우드 전환 및 AI 기반 물류 최적화 확대.\n삼성 계열사 의존도가 높지만 외부 고객 비중을 점진적으로 확대하고 있다." },
  { symbol: "017670.KS", name: "SK텔레콤", sector: "IT/플랫폼", description: "국내 이동통신 1위 사업자이자 AI 인프라(GPU 클라우드) 확장 중.\n5G 성숙기 진입으로 AI 데이터센터 투자가 새로운 성장축으로 부상하고 있다." },
  { symbol: "030200.KS", name: "KT", sector: "IT/플랫폼", description: "유선·무선 통신 2위 사업자. 공공·기업 AI 클라우드 시장 점유율 확대 중.\n데이터센터 투자와 통신 본업의 안정적 현금흐름이 균형을 이루고 있다." },
  { symbol: "032640.KS", name: "LG유플러스", sector: "IT/플랫폼", description: "이동통신 3위 사업자. AI 기반 통신·홈 IoT 서비스 차별화 전략 추진 중.\n고배당 매력과 AI 전환 비용 증가에 따른 이익 변동성이 공존한다." },

  // ── 2차전지/소재 ─────────────────────────────────────────────────────────────
  { symbol: "373220.KS", name: "LG에너지솔루션", sector: "2차전지", description: "GM·현대차·혼다 등에 납품하는 세계 2위 EV 배터리 제조사. 원통형·파우치·각형 전 라인 보유.\nNAM 공장 증설과 원가 개선이 2026년 수익성 회복의 핵심 과제다." },
  { symbol: "006400.KS", name: "삼성SDI", sector: "2차전지", description: "각형 배터리 프리미엄 P6 셀 보유. BMW·스텔란티스에 공급.\n전고체 배터리 기술 개발에서 업계 최선행 위치를 점하고 있다." },
  { symbol: "247540.KS", name: "에코프로비엠", sector: "2차전지", description: "하이니켈 양극재 세계 상위권 기업으로 삼성SDI의 핵심 공급사.\n헝가리 공장 가동과 북미 IRA 수혜 여부가 중기 실적의 분기점이다." },
  { symbol: "086520.KS", name: "에코프로", sector: "2차전지", description: "에코프로비엠 등 배터리 소재 계열사를 거느린 지주사.\n자회사 성장에 따른 NAV 할인 해소 여부가 주가 재평가의 핵심 트리거다." },
  { symbol: "003670.KS", name: "포스코퓨처엠", sector: "2차전지", description: "POSCO그룹의 양극재·음극재·이차전지 소재 사업 담당 핵심 계열사.\n리튬·니켈 광산 확보와 수직계열화 완성이 원가 경쟁력의 관건이다." },
  { symbol: "011790.KS", name: "SKC", sector: "2차전지", description: "동박(구리박) 세계 1위 소재기업이자 반도체 유리기판 사업 확장 중.\nAI 서버용 유리기판은 2026년 이후 신성장 동력으로 시장 주목을 받고 있다." },

  // ── 방산/항공 ────────────────────────────────────────────────────────────────
  { symbol: "012450.KS", name: "한화에어로스페이스", sector: "방산", description: "K9 자주포·천무 다연장 로켓 등 K-방산 핵심 수출 종합방산기업.\n폴란드·루마니아·호주 수출 계약 확대로 수주잔고가 역대 최고 수준을 기록 중이다." },
  { symbol: "047810.KS", name: "한국항공우주(KAI)", sector: "방산", description: "T-50 고등훈련기·KF-21 전투기 개발과 헬기 생산 담당 국내 유일 항공기 제조사.\n국내 KF-21 양산과 중동·동남아 수출이 2026~2030년 성장 가시성을 높이고 있다." },
  { symbol: "079550.KS", name: "LIG넥스원", sector: "방산", description: "유도무기·레이더·전자전 장비 전문 방산기업. 천궁-II 해외 수출 본격화.\n사우디·UAE 등 중동 수요와 국내 공군 무기 현대화 수혜가 이어지고 있다." },
  { symbol: "064350.KS", name: "현대로템", sector: "방산", description: "K2 전차·장갑차 제조사이자 수소열차·도시철도 차량 사업을 영위하는 방산·철도사.\n폴란드 K2 수출 본계약이 수주잔고를 급격히 확대시키고 있다." },

  // ── 자동차/부품 ──────────────────────────────────────────────────────────────
  { symbol: "005380.KS", name: "현대차", sector: "자동차", description: "글로벌 완성차 판매 3위 그룹 핵심 법인. 아이오닉 6/9 EV 라인업 확장 중.\n미국 조지아 공장(HMGMA) 가동으로 IRA 세액공제 직접 수혜 중이다." },
  { symbol: "000270.KS", name: "기아", sector: "자동차", description: "EV6·EV9·EV3 등 독자 EV 브랜드로 글로벌 디자인 경쟁력 확보.\nSUV·PBV 비중이 높아 수익성과 평균판매가(ASP) 측면에서 현대차보다 유리하다." },
  { symbol: "012330.KS", name: "현대모비스", sector: "자동차", description: "현대·기아차 핵심 모듈·부품 및 자율주행·전동화 부품 개발 전담 계열사.\nAS부품 부문의 안정적 이익이 전동화 전환 비용 증가의 버팀목이 되고 있다." },
  { symbol: "086280.KS", name: "현대글로비스", sector: "자동차", description: "현대차그룹 전속 물류·해운·중고차 사업 계열사. 완성차 물류 독점 구조.\nPCC(자동차 운반선) 운임 강세와 현대차 글로벌 판매 증가가 직접 수혜 요인이다." },
  { symbol: "161390.KS", name: "한국타이어앤테크놀로지", sector: "자동차", description: "국내 1위 타이어 제조사. EV 전용 고성능 타이어 라인업 확장 중.\n독일 공장 화재 영향에서 회복 후 수익성 정상화가 기대되는 구간이다." },

  // ── 바이오/헬스케어/뷰티 ────────────────────────────────────────────────────
  { symbol: "207940.KS", name: "삼성바이오로직스", sector: "바이오", description: "세계 최대 바이오의약품 CMO 공장 보유 삼성 바이오 핵심법인.\n5공장 증설 완료로 총 생산능력 78만L 돌파. 글로벌 빅파마 계약 확대 중이다." },
  { symbol: "068270.KS", name: "셀트리온", sector: "바이오", description: "자체 개발 바이오시밀러를 직접 판매하는 국내 최대 바이오텍. 짐펜트라·스텔라라 BS 출시.\n유럽·미국 직판 체계 구축으로 장기 이익률 구조가 개선 중이다." },
  { symbol: "000100.KS", name: "유한양행", sector: "바이오", description: "렉라자(레이저티닙) 얀센 기술이전, 미국 FDA 허가 완료한 대형 제약사.\n추가 기술수출 파이프라인이 주가 촉매로 부각되고 있다." },
  { symbol: "090430.KS", name: "아모레퍼시픽", sector: "바이오", description: "설화수·라네즈 등 프리미엄 K뷰티 브랜드 보유 국내 1위 화장품 기업.\n중국 의존도 축소와 북미·유럽 직접 진출 성과가 실적 방향성의 핵심 지표다." },
  { symbol: "006280.KS", name: "녹십자", sector: "바이오", description: "혈액제제·독감백신·희귀질환 치료제 생산 종합 제약사.\n미국 자회사를 통해 글로벌 혈액제제 시장 공략 중이다." },

  // ── 금융 ────────────────────────────────────────────────────────────────────
  { symbol: "105560.KS", name: "KB금융", sector: "금융", description: "KB국민은행을 주력으로 증권·보험·카드를 갖춘 국내 1위 금융그룹.\n주주환원율 업계 최고 수준이며 금리 인하 사이클에서 NIM 방어 능력이 탁월하다." },
  { symbol: "055550.KS", name: "신한지주", sector: "금융", description: "신한은행 중심으로 아시아 진출이 가장 활발한 금융지주.\n글로벌 수익 다변화와 디지털 전환 투자가 장기 주주가치 제고의 핵심이다." },
  { symbol: "086790.KS", name: "하나금융지주", sector: "금융", description: "하나은행 중심의 금융그룹. 외환·투자은행 분야 경쟁력 보유.\n비은행 자회사(하나증권·하나캐피탈) 성장이 수익 다각화에 기여 중이다." },
  { symbol: "316140.KS", name: "우리금융지주", sector: "금융", description: "우리은행 핵심 금융지주. 비은행 계열사 확보가 진행 중인 성장 스토리.\n정부 지분 매각 완료 이후 자율적 주주환원 정책이 가시화되는 단계다." },
  { symbol: "024110.KS", name: "IBK기업은행", sector: "금융", description: "중소기업 전문 국책은행. 안정적 이자수익과 고배당 매력 보유.\n경기 둔화 시 방어력이 강한 포트폴리오 구조를 갖추고 있다." },
  { symbol: "032830.KS", name: "삼성생명", sector: "금융", description: "국내 최대 생명보험사. 삼성전자 지분 보유로 NAV 대비 큰 할인 존재.\nIFRS17 도입 후 실적 가시성 높아졌으며 배당 확대 기조가 유지 중이다." },
  { symbol: "000810.KS", name: "삼성화재", sector: "금융", description: "국내 1위 손해보험사. 높은 배당성향과 IFRS17 전환 수혜가 돋보이는 우량 보험주.\n장기보험·자동차보험 시장 지배력 기반 안정적 EPS 성장이 지속 중이다." },
  { symbol: "005830.KS", name: "DB손해보험", sector: "금융", description: "DB그룹 계열 손해보험사. 자동차보험 점유율 2위. 높은 이익률과 배당 안정성 보유.\n합산비율 개선 추세가 이익 성장의 기반이 되고 있다." },
  { symbol: "071050.KS", name: "한국금융지주", sector: "금융", description: "한국투자증권 핵심 자회사의 금융지주. IB·WM 역량 업계 최상위권.\n토스뱅크·카카오뱅크 등 핀테크 지분 보유로 잠재적 NAV 상승 여지 있다." },
  { symbol: "016360.KS", name: "삼성증권", sector: "금융", description: "삼성금융 계열 증권사. WM(자산관리) 업계 1위. 고액자산가 고객 기반 탄탄.\n리테일·IB 겸업 구조로 시장 변동성에 상대적으로 안정적인 이익 흐름을 보인다." },
  { symbol: "006800.KS", name: "미래에셋증권", sector: "금융", description: "해외 대체투자·글로벌 ETF(TIGER)에서 독보적 경쟁력의 자산관리 전문 증권사.\n베트남·인도 이머징 자산 포트폴리오가 장기 성장 스토리를 지지한다." },

  // ── 철강/소재/화학 ────────────────────────────────────────────────────────────
  { symbol: "005490.KS", name: "POSCO홀딩스", sector: "철강/소재", description: "세계 4위 철강사이자 2차전지 소재(리튬·양극재·음극재) 사업으로 대전환 중인 지주사.\n리튬 광산 인수와 소재 수직계열화 완성도가 주가 재평가의 핵심 트리거다." },
  { symbol: "004020.KS", name: "현대제철", sector: "철강/소재", description: "현대차그룹 전속 철강사. 자동차용 냉연·열연강판 국내 1위 공급사.\n철강 업황 사이클과 현대차 생산량에 연동되는 경기민감 우량주다." },
  { symbol: "051910.KS", name: "LG화학", sector: "철강/소재", description: "배터리·석유화학·첨단소재·생명과학을 아우르는 LG그룹 핵심 화학사.\nLG에너지솔루션 지분 가치가 전체 시총을 상회하는 구조적 저평가 논쟁이 지속 중이다." },
  { symbol: "009830.KS", name: "한화솔루션", sector: "철강/소재", description: "태양광 모듈·케미칼·첨단소재 사업을 영위하는 한화그룹 화학 계열사.\n미국 IRA 태양광 수혜와 케미칼 업황 사이클이 이중 변수로 작용한다." },
  { symbol: "096770.KS", name: "SK이노베이션", sector: "철강/소재", description: "SK에너지(정유)·SK온(EV배터리)·SK지오센트릭(화학)을 자회사로 둔 지주사.\nSK온의 흑자 전환 시점이 주가 재평가의 결정적 분기점이다." },
  { symbol: "003550.KS", name: "LG", sector: "지주/기타", description: "LG전자·LG화학·LG에너지솔루션 등 계열사 지분 보유 순수 지주회사.\nNAV 대비 50~60% 할인이 지속돼 고배당+지주사 할인 해소가 투자 포인트다." },
  { symbol: "010120.KS", name: "LS ELECTRIC", sector: "철강/소재", description: "전력기기·자동화 솔루션 전문 LS그룹 계열사. AI 데이터센터 전력 인프라 핵심 공급사.\n미국·동남아 변압기 수요 급증으로 수출 주문이 사상 최대치를 기록 중이다." },

  // ── 에너지/유틸리티 ──────────────────────────────────────────────────────────
  { symbol: "010950.KS", name: "S-Oil", sector: "에너지", description: "사우디 아람코 최대주주인 국내 2위 정유사. 고도화율 업계 최고 수준.\n사우디 Shaheen 프로젝트를 통한 석유화학 신사업 전환이 2030년 장기 성장축이다." },
  { symbol: "015760.KS", name: "한국전력", sector: "에너지", description: "국내 전력 독점 공급사. 전기요금 인상과 원가 하락이 흑자 전환 유도 중.\nAI 데이터센터 증설에 따른 전력 수요 급증이 장기 매출 성장의 촉매로 부상 중이다." },
  { symbol: "034020.KS", name: "두산에너빌리티", sector: "에너지", description: "원자력발전 핵심 기자재 공급사이자 SMR(소형모듈원전) 개발 선도 에너지 기업.\nAI 데이터센터 전력 수요 증가로 원전 르네상스 수혜 기대가 밸류에이션에 반영 중이다." },
  { symbol: "036460.KS", name: "한국가스공사", sector: "에너지", description: "국내 천연가스 독점 공급 공기업. 미수금 회수와 요금 현실화가 핵심 투자 포인트.\n글로벌 LNG 수요 증가 수혜와 해외 가스전 개발 자산이 장기 가치를 지지한다." },

  // ── 조선/건설 ────────────────────────────────────────────────────────────────
  { symbol: "009540.KS", name: "HD한국조선해양", sector: "조선", description: "현대중공업·현대삼호중공업을 자회사로 둔 세계 1위 조선그룹 지주사.\nLNG선·VLCC 초대형 발주 호황으로 2027년까지 수주 도크가 꽉 찬 상황이다." },
  { symbol: "010140.KS", name: "삼성중공업", sector: "조선", description: "LNG 운반선 건조 기술 세계 최고 수준의 조선사. 고부가 선박 수주 집중 전략.\n2024~2026년 매출 성장 가시화로 장기 부진에서 탈출 단계로 평가받고 있다." },
  { symbol: "042660.KS", name: "한화오션", sector: "조선", description: "한화그룹으로 편입된 조선사(구 대우조선해양). 방산 함정·LNG선 이중 포트폴리오 보유.\n방산 부문 수주 확대와 LNG선 건조 재개가 실적 턴어라운드를 이끌고 있다." },
  { symbol: "000720.KS", name: "현대건설", sector: "건설", description: "현대차그룹 계열 국내 1위 건설사. 사우디 네옴시티 등 해외 대형 프로젝트 수행.\n해외 수주 호조와 원자력 건설 수혜가 방어막 역할을 하고 있다." },

  // ── 소비재/식품/유통 ─────────────────────────────────────────────────────────
  { symbol: "033780.KS", name: "KT&G", sector: "소비재", description: "국내 담배 독점 기업이자 부동산·홍삼(정관장) 사업 영위. 고배당·안정적 현금흐름 대표주.\n궐련형 전자담배(lil) 글로벌 수출 확대가 장기 성장 스토리로 주목받고 있다." },
  { symbol: "271560.KS", name: "오리온", sector: "소비재", description: "초코파이 등 K-스낵을 중국·베트남·러시아에 판매하는 글로벌 제과사.\n중국 소비 회복과 신흥국 확장이 실적 레버리지를 결정하는 핵심 변수다." },
  { symbol: "097950.KS", name: "CJ제일제당", sector: "소비재", description: "비비고·햇반 등 K-식품을 글로벌 시장에 판매하는 CJ그룹 식품 계열사.\n슈완스(미국 냉동식품) 자회사 시너지와 바이오(라이신·트립토판) 업황이 이익을 좌우한다." },
  { symbol: "139480.KS", name: "이마트", sector: "소비재", description: "국내 최대 오프라인 유통 체인. SSG닷컴·스타벅스코리아·지마켓 자회사 보유.\n유통 구조조정과 비용 절감을 통한 수익성 회복 시기가 주목된다." },

  // ── 그룹지주/항공/물류/기타 ──────────────────────────────────────────────────
  { symbol: "034730.KS", name: "SK", sector: "지주/기타", description: "SK하이닉스·SK이노베이션·SKT 등을 자회사로 둔 SK그룹 최상위 지주사.\n보유 자산 NAV 대비 40% 이상 할인과 고배당이 안전마진을 제공한다." },
  { symbol: "028260.KS", name: "삼성물산", sector: "지주/기타", description: "삼성전자·삼성생명 지분을 보유한 삼성그룹 사실상 지주사. 건설·상사·패션 사업 병행.\nNAV 할인 해소 가능성과 삼성 계열사 배당 수취 구조가 투자 매력의 핵심이다." },
  { symbol: "003490.KS", name: "대한항공", sector: "지주/기타", description: "아시아나항공 합병으로 국내 독점 대형항공사로 재탄생 중인 국적 항공사.\n합병 시너지 실현 시 영업 레버리지와 화물 수익 확대가 실적을 견인할 전망이다." },
  { symbol: "011200.KS", name: "HMM", sector: "지주/기타", description: "국내 최대 컨테이너 해운사. 하림-JKL 인수로 민영화가 진행 중.\n컨테이너 운임 사이클과 민영화 이후 전략 방향이 장기 투자 판단의 핵심이다." },
  { symbol: "042670.KS", name: "두산밥캣", sector: "지주/기타", description: "북미 컴팩트 건설장비 시장 1위 브랜드 보유 두산그룹 핵심 수출사.\n미국 주택·인프라 투자 연동이며 강달러 기조가 원화 환산 실적에 긍정적으로 작용한다." },
  { symbol: "047050.KS", name: "포스코인터내셔널", sector: "지주/기타", description: "POSCO그룹 계열 종합상사이자 미얀마 가스전 운영, 2차전지 소재 유통 확장 중.\nLNG 트레이딩·팜오일 농장 등 다양한 글로벌 자원 사업을 영위한다." },
  { symbol: "066570.KS", name: "LG전자", sector: "지주/기타", description: "가전·TV·전장 부품·B2B 솔루션을 글로벌 시장에 판매하는 LG그룹 핵심 전자 계열사.\n전장(VS사업부) 성장과 HVAC(냉난방) 시장 확대가 신성장 축으로 부각 중이다." },
];

export interface NewHighStock {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  currentPrice: number;
  high52Week: number;
  low52Week: number;
  changePercent: number;
  marketCapT: number;
  isBreakthrough: boolean;
  proximityPct: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

export async function GET() {
  try {
    const settled = await Promise.allSettled(
      KOREAN_WATCHLIST.map(async (item): Promise<NewHighStock | null> => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const q: any = await withTimeout(yahooFinance.quote(item.symbol), 5000);
          if (!q) return null;

          const currentPrice: number = q.regularMarketPrice ?? 0;
          const high52Week: number = q.fiftyTwoWeekHigh ?? 0;
          const low52Week: number = q.fiftyTwoWeekLow ?? 0;
          const changePercent: number = q.regularMarketChangePercent ?? 0;
          const marketCap: number = q.marketCap ?? 0;

          if (currentPrice <= 0 || high52Week <= 0) return null;

          // 시총 5천억 미만 제외 (Yahoo Finance 시총 기준)
          if (marketCap > 0 && marketCap < 500_000_000_000) return null;

          const proximityPct = (currentPrice / high52Week - 1) * 100;

          // 52주 고가의 98% 이상에만 포함
          if (proximityPct < -2) return null;

          return {
            symbol: item.symbol,
            name: item.name,
            sector: item.sector,
            description: item.description,
            currentPrice,
            high52Week,
            low52Week,
            changePercent,
            marketCapT: Math.round((marketCap / 1e12) * 10) / 10,
            isBreakthrough: currentPrice >= high52Week * 0.9999,
            proximityPct: Math.round(proximityPct * 10) / 10,
          };
        } catch {
          return null;
        }
      })
    );

    const data: NewHighStock[] = settled
      .filter(
        (r): r is PromiseFulfilledResult<NewHighStock | null> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value)
      .filter((v): v is NewHighStock => v !== null)
      .sort((a, b) => b.proximityPct - a.proximityPct);

    return NextResponse.json(
      {
        success: true,
        data,
        total: data.length,
        watchlistSize: KOREAN_WATCHLIST.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("[new-highs] Error:", error);
    return NextResponse.json(
      { success: true, data: [], total: 0, note: "데이터 로딩 실패" },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }
}
