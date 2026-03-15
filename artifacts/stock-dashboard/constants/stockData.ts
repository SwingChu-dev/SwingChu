export const USD_KRW_RATE = 1450;

export type Market = "NASDAQ" | "KOSPI" | "KOSDAQ";
export type MarketRegion = "미국장" | "국내장";
export type StockGrade = "우량주" | "중형주" | "소형주";
export type Theme = string;

export interface SplitEntry {
  ratio: number;
  dropPercent: number;
  targetPrice: number;
}

export interface ProfitTarget {
  percent: number;
  price: number;
}

export interface BoxRange {
  support: number;
  resistance: number;
  currentPosition: "저점권" | "중간권" | "고점권";
}

export interface PriceForecast {
  period: string;
  price: number;
  changePercent: number;
}

export interface FinancialAnalysis {
  per: number;
  pbr: number;
  roe: number;
  debtRatio: number;
  revenueGrowth: number;
  evaluation: "심각한 거품" | "거품" | "적정" | "저평가" | "강한 저평가";
  summary: string;
}

export interface DayFeature {
  day: string;
  feature: string;
  caution: string;
}

export interface RiskInfo {
  geopolitical: string;
  technicalBounce: string;
  strategy: string;
}

export interface StockInfo {
  id: string;
  name: string;
  ticker: string;
  market: Market;
  region: MarketRegion;
  grade: StockGrade;
  themes: Theme[];
  currentPrice: number;
  currency: "KRW" | "USD";
  description: string;
  splitEntries: SplitEntry[];
  profitTargets: ProfitTarget[];
  boxRange: BoxRange;
  forecasts: PriceForecast[];
  financials: FinancialAnalysis;
  dayFeatures: DayFeature[];
  risk: RiskInfo;
  witchDayStrategy: string;
  entryRecommendation: string;
}

export const STOCKS: StockInfo[] = [
  {
    id: "nvda",
    name: "엔비디아",
    ticker: "NVDA",
    market: "NASDAQ",
    region: "미국장",
    grade: "우량주",
    themes: ["AI/반도체", "데이터센터", "게이밍", "자율주행"],
    currentPrice: 267355,
    currency: "KRW",
    description: "AI 반도체 시장의 절대 강자. GPU 시장 점유율 80%+, CUDA 생태계로 강력한 해자 보유.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(267355 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(267355 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(267355 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(267355 * 1.03) },
      { percent: 8, price: Math.round(267355 * 1.08) },
      { percent: 15, price: Math.round(267355 * 1.15) },
    ],
    boxRange: {
      support: 230000,
      resistance: 310000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 268900, changePercent: 0.6 },
      { period: "1주 후", price: 272000, changePercent: 1.7 },
      { period: "1개월 후", price: 285000, changePercent: 6.6 },
      { period: "3개월 후", price: 305000, changePercent: 14.1 },
      { period: "6개월 후", price: 330000, changePercent: 23.4 },
      { period: "12개월 후", price: 380000, changePercent: 42.1 },
      { period: "1800일",   price: 960000, changePercent: 258.4 },
    ],
    financials: {
      per: 35.2,
      pbr: 28.1,
      roe: 91.5,
      debtRatio: 42.3,
      revenueGrowth: 122.4,
      evaluation: "적정",
      summary: "초고성장 감안 시 현재 밸류는 적정. ROE 91% 수준의 압도적 수익성. AI 수요 지속 성장 반영.",
    },
    dayFeatures: [
      { day: "월요일", feature: "갭업/갭다운 빈번, 주말 뉴스 반영", caution: "시초가 급변동 주의, 첫 30분 관망 권장" },
      { day: "화요일", feature: "방향성 결정, 기관 순매수 활발", caution: "상승 추세 확인 후 진입" },
      { day: "수요일", feature: "거래량 증가, 중간 변곡점", caution: "익절 타이밍 체크" },
      { day: "목요일", feature: "실적 발표일 많음, 변동성 증가", caution: "옵션 만기 앞두고 변동 주의" },
      { day: "금요일", feature: "주말 포지션 청산, 오후 약세", caution: "금요일 오후 매도 압력 증가" },
    ],
    risk: {
      geopolitical: "미-중 반도체 규제 심화 시 중국 수출 제한 리스크. 대만 지정학적 리스크 상존.",
      technicalBounce: "RSI 30 이하 과매도 구간 진입 시 강한 기술적 반등 기대. 200일 이동평균선 지지 확인.",
      strategy: "AI 수요 둔화 우려 시 비중 축소. 분기 실적 발표 전후 변동성 대비 분할매수/분할매도 전략 유효.",
    },
    witchDayStrategy: "마녀의 날(옵션·선물 동시 만기) 전날 오후부터 변동성 급증. NVDA 포지션의 50%는 만기 전날 익절 또는 스탑로스 설정 권장. 만기 당일 오전 급락 시 단기 반등 매수 기회.",
    entryRecommendation: "현재 5% 하락 시 1차 진입(₩253,987), 이후 추가 하락 대기. RSI 45 이하 + 거래량 증가 확인 후 진입 최적.",
  },
  {
    id: "googl",
    name: "알파벳 A",
    ticker: "GOOGL",
    market: "NASDAQ",
    region: "미국장",
    grade: "우량주",
    themes: ["AI/클라우드", "광고", "검색", "유튜브"],
    currentPrice: 445197,
    currency: "KRW",
    description: "세계 최대 검색·광고 플랫폼. AI Gemini로 재도약 중, YouTube·GCP 고성장 지속.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(445197 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(445197 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(445197 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(445197 * 1.03) },
      { percent: 8, price: Math.round(445197 * 1.08) },
      { percent: 15, price: Math.round(445197 * 1.15) },
    ],
    boxRange: {
      support: 390000,
      resistance: 490000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 447000, changePercent: 0.4 },
      { period: "1주 후", price: 452000, changePercent: 1.5 },
      { period: "1개월 후", price: 468000, changePercent: 5.1 },
      { period: "3개월 후", price: 490000, changePercent: 10.1 },
      { period: "6개월 후", price: 520000, changePercent: 16.8 },
      { period: "12개월 후", price: 580000, changePercent: 30.3 },
      { period: "1800일",   price: 1160000, changePercent: 160.6 },
    ],
    financials: {
      per: 21.5,
      pbr: 6.8,
      roe: 32.1,
      debtRatio: 15.2,
      revenueGrowth: 13.8,
      evaluation: "저평가",
      summary: "AI 투자 반영 전 PER 21배는 저평가 구간. 현금흐름 탄탄, 자사주 매입 공격적. 빅테크 중 가장 매력적인 밸류.",
    },
    dayFeatures: [
      { day: "월요일", feature: "광고 집행 데이터 반영, 안정적", caution: "주말 규제 뉴스 체크" },
      { day: "화요일", feature: "기관 리포트 발표 집중", caution: "목표주가 변경 시 급변동" },
      { day: "수요일", feature: "상대적으로 안정, 꾸준한 상승", caution: "시장 전반 눌림 시 함께 하락" },
      { day: "목요일", feature: "AI 관련 뉴스 민감도 높음", caution: "OpenAI·MS 발표에 동반 변동" },
      { day: "금요일", feature: "주말 포지션 정리", caution: "오후 2시 이후 매도 압력" },
    ],
    risk: {
      geopolitical: "EU 독점금지법 리스크. 미국 법무부 검색 독점 소송 진행 중.",
      technicalBounce: "52주 고점 대비 20% 이상 조정 시 강력한 기술적 반등 지점. 지지선 $155(환율 1,450원 기준) 확인.",
      strategy: "AI 검색 점유율 방어 여부 핵심 체크. 실적 발표 후 가이던스 확인 필수.",
    },
    witchDayStrategy: "대형주로 옵션 변동성 크지 않음. 마녀의 날 전일 소폭 하락 후 당일 반등 패턴 多. 만기 당일 매수 관망, 오후 2시 이후 진입 고려.",
    entryRecommendation: "5% 하락(₩422,937) 1차 진입 추천. PER 20배 이하 진입 시 중장기 최적 포인트.",
  },
  {
    id: "orcl",
    name: "오라클",
    ticker: "ORCL",
    market: "NASDAQ",
    region: "미국장",
    grade: "우량주",
    themes: ["클라우드", "AI/데이터베이스", "SaaS", "엔터프라이즈"],
    currentPrice: 232417,
    currency: "KRW",
    description: "엔터프라이즈 데이터베이스·클라우드 강자. AI 클라우드 수요로 OCI 고성장 중.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(232417 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(232417 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(232417 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(232417 * 1.03) },
      { percent: 8, price: Math.round(232417 * 1.08) },
      { percent: 15, price: Math.round(232417 * 1.15) },
    ],
    boxRange: {
      support: 200000,
      resistance: 265000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 233500, changePercent: 0.5 },
      { period: "1주 후", price: 236000, changePercent: 1.5 },
      { period: "1개월 후", price: 245000, changePercent: 5.4 },
      { period: "3개월 후", price: 260000, changePercent: 11.9 },
      { period: "6개월 후", price: 278000, changePercent: 19.6 },
      { period: "12개월 후", price: 310000, changePercent: 33.4 },
      { period: "1800일",   price: 580000, changePercent: 149.8 },
    ],
    financials: {
      per: 28.3,
      pbr: 45.2,
      roe: 148.7,
      debtRatio: 89.4,
      revenueGrowth: 7.2,
      evaluation: "적정",
      summary: "PBR 높지만 부채로 인한 착시. ROE 148%로 자본 효율성 최상급. 클라우드 전환 가속화로 성장 모멘텀 확보.",
    },
    dayFeatures: [
      { day: "월요일", feature: "기업 계약 소식 반영", caution: "갭 변동 주의" },
      { day: "화요일", feature: "안정적 흐름", caution: "시장 전반 동향 추종" },
      { day: "수요일", feature: "거래량 평균 수준", caution: "특이 사항 없으면 횡보" },
      { day: "목요일", feature: "클라우드 업계 발표 민감", caution: "AWS·Azure 발표에 동반 변동" },
      { day: "금요일", feature: "주말 포지션 정리", caution: "오후 약세 경향" },
    ],
    risk: {
      geopolitical: "미-중 무역 분쟁 시 중국 사업 리스크. 러시아 제재로 일부 매출 영향.",
      technicalBounce: "50일 이동평균선 이탈 시 200일선까지 조정 가능. 반등 지지선 $145(환율 적용).",
      strategy: "OCI 성장률 분기마다 확인 필수. 계약 수주 발표 직후 단기 매매 유효.",
    },
    witchDayStrategy: "중형주 수준 변동성. 만기일 전후 거래량 증가 시 방향성 추종 전략. 급락 시 지지선 매수 유효.",
    entryRecommendation: "10% 하락(₩209,175) 2차 진입 시 가장 매력적. 현재 가격은 상단 저항선 근처.",
  },
  {
    id: "ionq",
    name: "아이온큐",
    ticker: "IONQ",
    market: "NASDAQ",
    region: "미국장",
    grade: "소형주",
    themes: ["양자컴퓨팅", "미래기술", "AI", "방위"],
    currentPrice: 48877,
    currency: "KRW",
    description: "순수 양자컴퓨팅 기업. IBM·구글과 경쟁하는 트랩드 이온 방식 특화. 고위험 고수익 테마주.",
    splitEntries: [
      { ratio: 30, dropPercent: 8, targetPrice: Math.round(48877 * 0.92) },
      { ratio: 30, dropPercent: 15, targetPrice: Math.round(48877 * 0.85) },
      { ratio: 40, dropPercent: 25, targetPrice: Math.round(48877 * 0.75) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(48877 * 1.03) },
      { percent: 8, price: Math.round(48877 * 1.08) },
      { percent: 15, price: Math.round(48877 * 1.15) },
    ],
    boxRange: {
      support: 35000,
      resistance: 70000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 49500, changePercent: 1.3 },
      { period: "1주 후", price: 51000, changePercent: 4.3 },
      { period: "1개월 후", price: 55000, changePercent: 12.5 },
      { period: "3개월 후", price: 62000, changePercent: 26.8 },
      { period: "6개월 후", price: 72000, changePercent: 47.3 },
      { period: "12개월 후", price: 90000, changePercent: 84.1 },
      { period: "1800일",   price: 290000, changePercent: 493.0 },
    ],
    financials: {
      per: -18.5,
      pbr: 12.3,
      roe: -52.3,
      debtRatio: 28.1,
      revenueGrowth: 95.3,
      evaluation: "거품",
      summary: "적자 기업으로 PER 산출 불가. 매출은 급증하나 수익화 시점 불투명. 양자컴퓨팅 테마 거품 가능성, 장기 보유 주의.",
    },
    dayFeatures: [
      { day: "월요일", feature: "양자 관련 뉴스에 즉시 반응", caution: "주말 기술 발표 급등락 빈번" },
      { day: "화요일", feature: "단기 트레이더 활발", caution: "변동성 매우 높음" },
      { day: "수요일", feature: "숨고르기 구간", caution: "방향성 확인 필요" },
      { day: "목요일", feature: "계약 발표 빈번한 요일", caution: "급등 시 차익 실현 압박" },
      { day: "금요일", feature: "주말 포지션 정리로 약세", caution: "소형주 특성상 금요일 매도 압력 강함" },
    ],
    risk: {
      geopolitical: "양자 기술 미-중 경쟁 심화. 정부 계약 의존도 높아 정책 변화 리스크.",
      technicalBounce: "RSI 20 이하 극단적 과매도 시 강한 반등. 손절선 25% 이상 설정 권장.",
      strategy: "전체 포트폴리오의 5% 이하 투자 권장. 정부 계약 수주 발표 시 단기 매매 전략.",
    },
    witchDayStrategy: "소형주·고변동성으로 마녀의 날 영향 매우 큼. 만기 전날 반드시 포지션 50% 이상 축소. 만기 당일 관망 후 저점 매수 기회 탐색.",
    entryRecommendation: "소형 테마주 특성상 8% 하락(₩44,967) 1차 진입, 15% 추가 하락 대기. 전체 포트의 5% 이내 소액 투자 권장.",
  },
  {
    id: "sandisk",
    name: "샌디스크",
    ticker: "SNDK",
    market: "NASDAQ",
    region: "미국장",
    grade: "중형주",
    themes: ["반도체/메모리", "스토리지", "AI 인프라", "데이터센터"],
    currentPrice: 965199,
    currency: "KRW",
    description: "WD에서 분사한 플래시 메모리 전문기업. NAND 플래시 시장 2위권, AI 데이터센터 수요로 수혜.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(965199 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(965199 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(965199 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(965199 * 1.03) },
      { percent: 8, price: Math.round(965199 * 1.08) },
      { percent: 15, price: Math.round(965199 * 1.15) },
    ],
    boxRange: {
      support: 820000,
      resistance: 1100000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 970000, changePercent: 0.5 },
      { period: "1주 후", price: 985000, changePercent: 2.1 },
      { period: "1개월 후", price: 1020000, changePercent: 5.7 },
      { period: "3개월 후", price: 1080000, changePercent: 11.9 },
      { period: "6개월 후", price: 1150000, changePercent: 19.1 },
      { period: "12개월 후", price: 1280000, changePercent: 32.6 },
      { period: "1800일",   price: 2400000, changePercent: 148.7 },
    ],
    financials: {
      per: 22.1,
      pbr: 3.4,
      roe: 18.9,
      debtRatio: 58.7,
      revenueGrowth: 28.4,
      evaluation: "저평가",
      summary: "메모리 사이클 회복 국면, PER 22배 합리적. NAND 수요 증가로 실적 개선 기대. 중장기 저평가 매력.",
    },
    dayFeatures: [
      { day: "월요일", feature: "메모리 가격 동향 반영", caution: "주말 재고 조정 소식 주의" },
      { day: "화요일", feature: "반도체 섹터 동반 움직임", caution: "NVDA 흐름 참고" },
      { day: "수요일", feature: "거래량 증가, 방향성 형성", caution: "거래량 없이 급등락 주의" },
      { day: "목요일", feature: "실적 가이던스 발표 빈번", caution: "서프라이즈 여부 확인" },
      { day: "금요일", feature: "주간 정리, 오후 약세", caution: "고점 매도 기회" },
    ],
    risk: {
      geopolitical: "중국 메모리 공급 과잉 리스크. 삼성·SK하이닉스와의 경쟁 심화.",
      technicalBounce: "전고점 대비 15% 이상 조정 시 매수 기회. 200일 이평선 지지 여부 체크.",
      strategy: "메모리 가격 사이클 상단 근처 비중 축소, 하락 사이클 진입 시 분할매수.",
    },
    witchDayStrategy: "만기일 전후 거래량 증가로 방향성 더 명확해짐. 포지션 유지하되 스탑로스 타이트하게 관리.",
    entryRecommendation: "5% 하락(₩917,000) 1차 매수 적절. 반도체 사이클 상승 국면 초입 구간.",
  },
  {
    id: "eon",
    name: "EON 리소시스",
    ticker: "EONR",
    market: "NASDAQ",
    region: "미국장",
    grade: "소형주",
    themes: ["희토류/자원", "에너지전환", "ESG", "전기차"],
    currentPrice: 2116,
    currency: "KRW",
    description: "희토류 및 핵심광물 채굴 소형 자원기업. 에너지 전환 테마 수혜 기대주. 고위험.",
    splitEntries: [
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(2116 * 0.90) },
      { ratio: 30, dropPercent: 20, targetPrice: Math.round(2116 * 0.80) },
      { ratio: 40, dropPercent: 30, targetPrice: Math.round(2116 * 0.70) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(2116 * 1.03) },
      { percent: 8, price: Math.round(2116 * 1.08) },
      { percent: 15, price: Math.round(2116 * 1.15) },
    ],
    boxRange: {
      support: 1500,
      resistance: 3500,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 2150, changePercent: 1.6 },
      { period: "1주 후", price: 2250, changePercent: 6.3 },
      { period: "1개월 후", price: 2500, changePercent: 18.1 },
      { period: "3개월 후", price: 2900, changePercent: 37.1 },
      { period: "6개월 후", price: 3300, changePercent: 55.9 },
      { period: "12개월 후", price: 4000, changePercent: 89.0 },
      { period: "1800일",   price: 12500, changePercent: 490.0 },
    ],
    financials: {
      per: -5.2,
      pbr: 4.8,
      roe: -78.4,
      debtRatio: 62.1,
      revenueGrowth: 145.2,
      evaluation: "거품",
      summary: "적자 초기 자원 기업. 테마 수혜로 과대평가 가능성. 실체 매출 확인 전 투기적 요소 강함. 소액 투자만 권장.",
    },
    dayFeatures: [
      { day: "월요일", feature: "원자재 가격 주간 동향 반영", caution: "갭 상승/하락 매우 빈번" },
      { day: "화요일", feature: "투기적 매수 유입", caution: "변동성 극심" },
      { day: "수요일", feature: "숨고르기", caution: "거래량 감소 시 하락 전조" },
      { day: "목요일", feature: "희토류 관련 뉴스 반응", caution: "정책 발표에 급등락" },
      { day: "금요일", feature: "주말 포지션 대량 정리", caution: "소형주 금요일 오후 매도 폭탄 주의" },
    ],
    risk: {
      geopolitical: "중국의 희토류 수출 제한 역설적 수혜 가능성. 단, 채굴 허가 규제 리스크.",
      technicalBounce: "30% 이상 급락 시 단기 반등 가능하나 추세 반전 확인 필요. 손절 30% 필수.",
      strategy: "전체 포트폴리오의 3% 이하. 테마 뉴스 주도 단기 매매에 적합. 장기 보유 비권장.",
    },
    witchDayStrategy: "극소형주로 옵션 영향 적으나 시장 전반 불안 시 급락 취약. 만기 전후 전량 정리 고려.",
    entryRecommendation: "10% 하락(₩1,904) 1차 진입. 전체 포트의 3% 이내 소액으로만 접근.",
  },
  {
    id: "samsung",
    name: "삼성전자",
    ticker: "005930",
    market: "KOSPI",
    region: "국내장",
    grade: "우량주",
    themes: ["반도체", "스마트폰", "디스플레이", "가전"],
    currentPrice: 184000,
    currency: "KRW",
    description: "국내 대표 우량주. HBM 경쟁력 회복 관건. 메모리 사이클 반등과 함께 주가 반등 기대.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(184000 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(184000 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(184000 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(184000 * 1.03) },
      { percent: 8, price: Math.round(184000 * 1.08) },
      { percent: 15, price: Math.round(184000 * 1.15) },
    ],
    boxRange: {
      support: 165000,
      resistance: 210000,
      currentPosition: "저점권",
    },
    forecasts: [
      { period: "1일 후", price: 185500, changePercent: 0.8 },
      { period: "1주 후", price: 188000, changePercent: 2.2 },
      { period: "1개월 후", price: 196000, changePercent: 6.5 },
      { period: "3개월 후", price: 208000, changePercent: 13.0 },
      { period: "6개월 후", price: 220000, changePercent: 19.6 },
      { period: "12개월 후", price: 250000, changePercent: 35.9 },
      { period: "1800일",   price: 490000, changePercent: 165.9 },
    ],
    financials: {
      per: 12.8,
      pbr: 1.2,
      roe: 9.8,
      debtRatio: 35.4,
      revenueGrowth: 3.2,
      evaluation: "강한 저평가",
      summary: "PBR 1.2배, PER 12배로 역사적 저평가 구간. HBM 경쟁력 회복 시 강력한 재평가 기대. 배당 수익률 2.5%로 방어적 매력.",
    },
    dayFeatures: [
      { day: "월요일", feature: "외국인 수급 방향 결정적", caution: "환율 및 원자재 주시" },
      { day: "화요일", feature: "기관 순매수 집중 요일", caution: "거래량 증가 시 추세 형성" },
      { day: "수요일", feature: "코스피 지수 동반 움직임 강함", caution: "지수 약세 시 함께 하락" },
      { day: "목요일", feature: "외국인 매매 활발", caution: "선물 만기 영향 확인" },
      { day: "금요일", feature: "프로그램 매매 집중", caution: "오후 3시 동시호가 변동 주의" },
    ],
    risk: {
      geopolitical: "미-중 반도체 규제 직격탄. 중국 의존도 높아 수출 제한 시 매출 타격.",
      technicalBounce: "52주 신저가 근처 현재 강한 지지 구간. 외국인 순매수 전환 시 기술적 반등 강력.",
      strategy: "현재 저점권 진입 구간. 외국인 순매수 + 메모리 가격 반등 시 적극 매수 전략.",
    },
    witchDayStrategy: "코스피 선물옵션 동시만기일(3·6·9·12월 둘째 목요일) 전후 변동성 급증. 만기 전날 포지션 정리 일부 권장. 당일 오전 급락 시 분할 저점 매수 기회.",
    entryRecommendation: "현재 저점권! 5% 하락(₩174,800) 1차 진입 최적. 외국인 순매수 전환 시그널 동반 확인 권장.",
  },
  {
    id: "skhynix",
    name: "SK하이닉스",
    ticker: "000660",
    market: "KOSPI",
    region: "국내장",
    grade: "우량주",
    themes: ["HBM/AI반도체", "메모리", "반도체"],
    currentPrice: 915000,
    currency: "KRW",
    description: "HBM 세계 1위. AI 수요 폭발로 엔비디아 독점 공급. 국내 AI 반도체 최고 수혜주.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(915000 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(915000 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(915000 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(915000 * 1.03) },
      { percent: 8, price: Math.round(915000 * 1.08) },
      { percent: 15, price: Math.round(915000 * 1.15) },
    ],
    boxRange: {
      support: 820000,
      resistance: 1050000,
      currentPosition: "저점권",
    },
    forecasts: [
      { period: "1일 후", price: 920000, changePercent: 0.5 },
      { period: "1주 후", price: 935000, changePercent: 2.2 },
      { period: "1개월 후", price: 970000, changePercent: 6.0 },
      { period: "3개월 후", price: 1020000, changePercent: 11.5 },
      { period: "6개월 후", price: 1100000, changePercent: 20.2 },
      { period: "12개월 후", price: 1250000, changePercent: 36.6 },
      { period: "1800일",   price: 2800000, changePercent: 206.0 },
    ],
    financials: {
      per: 14.2,
      pbr: 1.8,
      roe: 32.4,
      debtRatio: 45.2,
      revenueGrowth: 98.3,
      evaluation: "저평가",
      summary: "HBM 독점 공급 프리미엄 감안 시 PER 14배는 명백한 저평가. 매출 성장률 98%에 밸류 추종 속도가 늦음.",
    },
    dayFeatures: [
      { day: "월요일", feature: "AI 테마 주간 방향성 결정", caution: "주말 NVDA 흐름 연동" },
      { day: "화요일", feature: "외국인 집중 매매", caution: "환율 변동 주의" },
      { day: "수요일", feature: "코스피 대장주 역할", caution: "HBM 뉴스 민감도 높음" },
      { day: "목요일", feature: "선물 만기 전 포지션 조정", caution: "급격한 수급 변화 경계" },
      { day: "금요일", feature: "프로그램 매도 집중", caution: "오후 약세 경향, 고점 주의" },
    ],
    risk: {
      geopolitical: "NVDA 수출 규제 강화 시 수혜 감소 역설. 삼성의 HBM 추격 리스크.",
      technicalBounce: "120만원 전고점 대비 현재 저점권. 외국인 순매수 전환 시 강한 반등 기대.",
      strategy: "현재 HBM 사이클 호황 국면, 적극 매수 전략 유효. NVDA 분기 실적 발표 연동 확인.",
    },
    witchDayStrategy: "코스피 만기일 전후 외국인 선물 포지션 청산으로 급락 가능. 만기일 당일 오전 10시 전후 저점 분할 매수 기회 포착.",
    entryRecommendation: "현재 저점권! 지금도 매력적이나 5% 추가 하락(₩869,250) 시 최적 진입. HBM 사이클 최대 수혜주.",
  },
  {
    id: "hanwha",
    name: "한화에로스페이스",
    ticker: "012450",
    market: "KOSPI",
    region: "국내장",
    grade: "우량주",
    themes: ["방산", "항공우주", "K-방산", "유럽 재무장"],
    currentPrice: 1474000,
    currency: "KRW",
    description: "국내 방산 최대 수혜주. 유럽 재무장 트렌드와 K-방산 수출 호조로 실적 폭발적 성장.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(1474000 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(1474000 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(1474000 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(1474000 * 1.03) },
      { percent: 8, price: Math.round(1474000 * 1.08) },
      { percent: 15, price: Math.round(1474000 * 1.15) },
    ],
    boxRange: {
      support: 1200000,
      resistance: 1700000,
      currentPosition: "고점권",
    },
    forecasts: [
      { period: "1일 후", price: 1480000, changePercent: 0.4 },
      { period: "1주 후", price: 1500000, changePercent: 1.8 },
      { period: "1개월 후", price: 1560000, changePercent: 5.8 },
      { period: "3개월 후", price: 1650000, changePercent: 11.9 },
      { period: "6개월 후", price: 1800000, changePercent: 22.1 },
      { period: "12개월 후", price: 2100000, changePercent: 42.5 },
      { period: "1800일",   price: 4200000, changePercent: 184.6 },
    ],
    financials: {
      per: 38.5,
      pbr: 8.2,
      roe: 28.7,
      debtRatio: 68.4,
      revenueGrowth: 52.3,
      evaluation: "적정",
      summary: "방산 프리미엄 반영 PER 38배는 성장성 감안 시 적정. K-방산 수출 모멘텀 지속 시 추가 재평가 여지.",
    },
    dayFeatures: [
      { day: "월요일", feature: "지정학적 뉴스 급반응", caution: "주말 전쟁·분쟁 뉴스 직결" },
      { day: "화요일", feature: "방산 수주 발표 빈번", caution: "계약 금액 규모 확인" },
      { day: "수요일", feature: "기관 매매 집중", caution: "외국인 방향 추종" },
      { day: "목요일", feature: "NATO 관련 발표 민감", caution: "유럽 재무장 예산 뉴스 체크" },
      { day: "금요일", feature: "주간 방산 수주 정리", caution: "지정학 리스크 완화 시 차익 실현 주의" },
    ],
    risk: {
      geopolitical: "우크라이나-러시아 전쟁 종전 시 방산 모멘텀 약화 리스크. 역설적으로 평화 뉴스에 약세.",
      technicalBounce: "현재 박스권 상단 근처. 조정 시 1,200만원 지지선 체크.",
      strategy: "지정학 리스크 완화 뉴스 시 일부 익절. 전쟁 지속 뉴스에 추가 매수 전략.",
    },
    witchDayStrategy: "방산 테마 특성상 지정학 뉴스 부재 시 만기일 변동성 제한적. 평온한 시장에서 만기일 정상 매매 가능.",
    entryRecommendation: "현재 고점권 주의! 5% 하락(₩1,400,300) 후 진입 권장. 박스권 상단 근처는 신규 매수 자제.",
  },
  {
    id: "hyundai",
    name: "현대차",
    ticker: "005380",
    market: "KOSPI",
    region: "국내장",
    grade: "우량주",
    themes: ["전기차", "자동차", "로보틱스", "수소"],
    currentPrice: 519000,
    currency: "KRW",
    description: "글로벌 5위권 완성차. 전기차 전환 가속화, 로보틱스(보스턴다이나믹스) 미래 성장 기대.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(519000 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(519000 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(519000 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(519000 * 1.03) },
      { percent: 8, price: Math.round(519000 * 1.08) },
      { percent: 15, price: Math.round(519000 * 1.15) },
    ],
    boxRange: {
      support: 460000,
      resistance: 580000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 521000, changePercent: 0.4 },
      { period: "1주 후", price: 526000, changePercent: 1.3 },
      { period: "1개월 후", price: 540000, changePercent: 4.0 },
      { period: "3개월 후", price: 560000, changePercent: 7.9 },
      { period: "6개월 후", price: 590000, changePercent: 13.7 },
      { period: "12개월 후", price: 650000, changePercent: 25.2 },
      { period: "1800일",   price: 1200000, changePercent: 131.1 },
    ],
    financials: {
      per: 6.8,
      pbr: 0.7,
      roe: 14.2,
      debtRatio: 178.3,
      revenueGrowth: 7.8,
      evaluation: "강한 저평가",
      summary: "PBR 0.7배로 자산가치 이하 거래 중. PER 6.8배는 역사적 저평가. 전기차 전환 불확실성 반영이나 과도한 할인.",
    },
    dayFeatures: [
      { day: "월요일", feature: "주간 판매 데이터 반영", caution: "전기차 시장 뉴스 주의" },
      { day: "화요일", feature: "기관 순매수 빈번", caution: "환율 1400원 이상 시 수혜" },
      { day: "수요일", feature: "안정적 거래 패턴", caution: "코스피 전반 흐름 추종" },
      { day: "목요일", feature: "외국인 매매 집중", caution: "글로벌 자동차 뉴스 확인" },
      { day: "금요일", feature: "주말 포지션 정리", caution: "차익 실현 매물 소화 필요" },
    ],
    risk: {
      geopolitical: "미국 관세 정책 변화(IRA 수혜 축소) 리스크. 중국 전기차 경쟁 심화.",
      technicalBounce: "PBR 0.7배 극단적 저평가로 하방 지지 강함. 외국인 순매수 전환 시 강력 반등.",
      strategy: "현재 밸류 매력 높음. 전기차 판매 데이터 개선 + 외국인 순매수 시 적극 매수.",
    },
    witchDayStrategy: "대형 우량주로 만기일 영향 제한적. 평소 대비 거래량 증가 시 방향성 추종 전략 유효.",
    entryRecommendation: "현재도 저평가 구간! 5% 하락(₩493,050) 진입 시 더욱 매력적. 중장기 비중 확대 적기.",
  },
  {
    id: "doosan",
    name: "두산에너빌리티",
    ticker: "034020",
    market: "KOSPI",
    region: "국내장",
    grade: "중형주",
    themes: ["원자력", "SMR", "수소", "에너지전환"],
    currentPrice: 106100,
    currency: "KRW",
    description: "국내 원전 및 SMR(소형모듈원전) 핵심 기업. 글로벌 원전 르네상스와 AI 전력 수요로 주목.",
    splitEntries: [
      { ratio: 30, dropPercent: 5, targetPrice: Math.round(106100 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(106100 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(106100 * 0.85) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(106100 * 1.03) },
      { percent: 8, price: Math.round(106100 * 1.08) },
      { percent: 15, price: Math.round(106100 * 1.15) },
    ],
    boxRange: {
      support: 88000,
      resistance: 130000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 107000, changePercent: 0.8 },
      { period: "1주 후", price: 109500, changePercent: 3.2 },
      { period: "1개월 후", price: 116000, changePercent: 9.3 },
      { period: "3개월 후", price: 125000, changePercent: 17.8 },
      { period: "6개월 후", price: 138000, changePercent: 30.1 },
      { period: "12개월 후", price: 165000, changePercent: 55.5 },
      { period: "1800일",   price: 430000, changePercent: 305.9 },
    ],
    financials: {
      per: 42.3,
      pbr: 2.8,
      roe: 8.2,
      debtRatio: 195.4,
      revenueGrowth: 18.7,
      evaluation: "적정",
      summary: "원전 테마 프리미엄 반영 중. SMR 상용화 시점이 밸류 결정적. 부채비율 높으나 대규모 수주로 개선 기대.",
    },
    dayFeatures: [
      { day: "월요일", feature: "원전 정책 뉴스 즉시 반응", caution: "에너지 정책 주말 발표 확인" },
      { day: "화요일", feature: "수주 발표 빈번한 요일", caution: "계약 규모 확인" },
      { day: "수요일", feature: "중간 흐름 안정적", caution: "미국 원전 뉴스 주시" },
      { day: "목요일", feature: "외국인 매매 변동", caution: "SMR 글로벌 동향 체크" },
      { day: "금요일", feature: "주간 정리, 테마 강도 확인", caution: "테마 약화 시 차익 실현 압박" },
    ],
    risk: {
      geopolitical: "한국 원전 정책 변화 리스크. 수출 원전의 지정학적 리스크(체코, 폴란드).",
      technicalBounce: "88,000원 지지선 이탈 시 추가 하락. 상승 추세선 이탈 여부 체크.",
      strategy: "SMR 글로벌 수주 발표 시 단기 급등. 뉴스 선반영 후 조정 시 분할매수.",
    },
    witchDayStrategy: "중형주로 만기일 영향 보통. 원전 테마 강세 시 만기일 변동성 크지 않음. 일반 대응 전략 적용.",
    entryRecommendation: "5% 하락(₩100,795) 1차 진입 적절. SMR 수주 소식과 연계한 모멘텀 투자 전략 유효.",
  },
  {
    id: "woritech",
    name: "우리기술",
    ticker: "032820",
    market: "KOSDAQ",
    region: "국내장",
    grade: "소형주",
    themes: ["원자력/SMR", "방산전자", "소형주 테마"],
    currentPrice: 24450,
    currency: "KRW",
    description: "원전 계측제어 전문 코스닥 소형주. 두산에너빌리티 관련주로 원전 테마 동반 상승.",
    splitEntries: [
      { ratio: 30, dropPercent: 8, targetPrice: Math.round(24450 * 0.92) },
      { ratio: 30, dropPercent: 15, targetPrice: Math.round(24450 * 0.85) },
      { ratio: 40, dropPercent: 25, targetPrice: Math.round(24450 * 0.75) },
    ],
    profitTargets: [
      { percent: 3, price: Math.round(24450 * 1.03) },
      { percent: 8, price: Math.round(24450 * 1.08) },
      { percent: 15, price: Math.round(24450 * 1.15) },
    ],
    boxRange: {
      support: 18000,
      resistance: 32000,
      currentPosition: "중간권",
    },
    forecasts: [
      { period: "1일 후", price: 24800, changePercent: 1.4 },
      { period: "1주 후", price: 25500, changePercent: 4.3 },
      { period: "1개월 후", price: 27500, changePercent: 12.5 },
      { period: "3개월 후", price: 30000, changePercent: 22.7 },
      { period: "6개월 후", price: 33000, changePercent: 35.0 },
      { period: "12개월 후", price: 40000, changePercent: 63.6 },
      { period: "1800일",   price: 105000, changePercent: 329.4 },
    ],
    financials: {
      per: 25.3,
      pbr: 3.1,
      roe: 15.8,
      debtRatio: 42.1,
      revenueGrowth: 35.4,
      evaluation: "적정",
      summary: "코스닥 중소형 원전주로 테마 프리미엄 반영. 실적 꾸준히 개선 중. 두산에너빌리티 수주 연동 성장 기대.",
    },
    dayFeatures: [
      { day: "월요일", feature: "테마 관련주 동반 급등락", caution: "모기업(두산) 뉴스 연동" },
      { day: "화요일", feature: "소형주 투기적 매수", caution: "변동성 매우 높음" },
      { day: "수요일", feature: "숨고르기", caution: "추세 확인 후 대응" },
      { day: "목요일", feature: "수주 발표 연동 급등 빈번", caution: "급등 후 차익 실현 압박 강함" },
      { day: "금요일", feature: "소형주 금요일 오후 약세", caution: "주말 포지션 정리 물량 주의" },
    ],
    risk: {
      geopolitical: "원전 정책 변화에 직결. 관련주 특성상 테마 소멸 시 급락 위험.",
      technicalBounce: "RSI 25 이하 극단적 과매도 시 단기 반등. 18,000원 강한 지지선.",
      strategy: "전체 포트의 5% 이하. 두산에너빌리티 수주 발표 시 단기 매매. 장기 보유 부적합.",
    },
    witchDayStrategy: "코스닥 소형주로 만기일 영향 제한적이나 시장 전반 변동 시 급락 취약. 만기일 전날 포지션 축소 권장.",
    entryRecommendation: "8% 하락(₩22,494) 1차 진입. 원전 테마 관련주 특성상 모기업 뉴스 연동 단기 매매 전략.",
  },

  // ─── 제주반도체 ─────────────────────────────────────────────────────────────
  {
    id: "jeju_semi",
    name: "제주반도체",
    ticker: "080220",
    market: "KOSDAQ",
    region: "국내장",
    grade: "중형주",
    themes: ["반도체", "메모리", "낸드플래시", "중소형반도체"],
    currentPrice: 43750,
    currency: "KRW",
    description: "NAND Flash 컨트롤러·임베디드 메모리 전문 팹리스. 스마트기기·IoT 수요 확대로 성장 중. 삼성·SK하이닉스 공급망 외 독립 벨류체인 확보.",
    splitEntries: [
      { ratio: 30, dropPercent: 5,  targetPrice: Math.round(43750 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(43750 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(43750 * 0.85) },
    ],
    profitTargets: [
      { percent: 3,  price: Math.round(43750 * 1.03) },
      { percent: 8,  price: Math.round(43750 * 1.08) },
      { percent: 15, price: Math.round(43750 * 1.15) },
    ],
    boxRange: {
      support:          11290,
      resistance:       50900,
      currentPosition:  "고점권",
    },
    forecasts: [
      { period: "1일 후",    price: 44100,  changePercent: 0.8  },
      { period: "1주 후",    price: 44800,  changePercent: 2.4  },
      { period: "1개월 후",  price: 46500,  changePercent: 6.3  },
      { period: "3개월 후",  price: 49000,  changePercent: 12.0 },
      { period: "6개월 후",  price: 53000,  changePercent: 21.1 },
      { period: "12개월 후", price: 60000,  changePercent: 37.1 },
      { period: "1800일",    price: 150000, changePercent: 242.9 },
    ],
    financials: {
      per: 18.2,
      pbr: 2.1,
      roe: 12.4,
      debtRatio: 28.5,
      revenueGrowth: 22.3,
      evaluation: "적정",
      summary: "팹리스 반도체 기업으로 마진 구조 양호. AI·IoT 기기 확산에 따른 수혜 예상. 52주 고점 근접으로 단기 조정 가능성 주의.",
    },
    dayFeatures: [
      { day: "월요일", feature: "반도체 섹터 동조 갭 변동", caution: "미국 반도체 지수 주말 흐름 반영" },
      { day: "화요일", feature: "기관·외국인 순매수 확인일", caution: "수급 공백 시 급락 주의" },
      { day: "수요일", feature: "중립적 흐름", caution: "거래량 감소 구간 진입 자제" },
      { day: "목요일", feature: "수주·계약 발표 빈도 높음", caution: "공시 직후 급등 추격매수 금지" },
      { day: "금요일", feature: "코스닥 소형주 약세 패턴", caution: "오후 매도 압력 증가, 포지션 조절" },
    ],
    risk: {
      geopolitical: "미-중 반도체 규제 영향권. 수출통제 강화 시 부품 조달 차질 위험.",
      technicalBounce: "RSI 30 이하 과매도 구간(35,000원대) 진입 시 강한 반등 기대. 11,290원이 연간 저점 강한 지지.",
      strategy: "52주 고점(50,900원) 근처이므로 신규 진입 시 분할 접근. 전체 포트 7% 이내 제한.",
    },
    witchDayStrategy: "코스닥 중형 반도체주로 만기일 영향 보통 수준. 만기일 전일 오후 2시 이후 변동성 증가, 절반 익절 검토.",
    entryRecommendation: "현재 고점권 인접, 5% 조정(₩41,563) 후 1차 진입 권장. RSI 50 이하 + 거래량 수반 하락 시 매수 기회.",
  },

  // ─── 한화솔루션 ─────────────────────────────────────────────────────────────
  {
    id: "hanwha_sol",
    name: "한화솔루션",
    ticker: "009830",
    market: "KOSPI",
    region: "국내장",
    grade: "중형주",
    themes: ["태양광", "에너지전환", "케미컬", "수소"],
    currentPrice: 48700,
    currency: "KRW",
    description: "한화그룹 태양광·케미컬 계열사. 미국 IRA 수혜로 태양광 모듈 수요 급증. PVC·가성소다 케미컬 부문 안정적 수익 기반.",
    splitEntries: [
      { ratio: 30, dropPercent: 5,  targetPrice: Math.round(48700 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(48700 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(48700 * 0.85) },
    ],
    profitTargets: [
      { percent: 3,  price: Math.round(48700 * 1.03) },
      { percent: 8,  price: Math.round(48700 * 1.08) },
      { percent: 15, price: Math.round(48700 * 1.15) },
    ],
    boxRange: {
      support:          18410,
      resistance:       58500,
      currentPosition:  "중간권",
    },
    forecasts: [
      { period: "1일 후",    price: 49100,  changePercent: 0.8  },
      { period: "1주 후",    price: 50200,  changePercent: 3.1  },
      { period: "1개월 후",  price: 53000,  changePercent: 8.8  },
      { period: "3개월 후",  price: 56000,  changePercent: 14.9 },
      { period: "6개월 후",  price: 60000,  changePercent: 23.2 },
      { period: "12개월 후", price: 68000,  changePercent: 39.6 },
      { period: "1800일",    price: 160000, changePercent: 228.5 },
    ],
    financials: {
      per: 14.8,
      pbr: 0.9,
      roe: 6.3,
      debtRatio: 68.2,
      revenueGrowth: 8.1,
      evaluation: "저평가",
      summary: "PBR 1배 미만으로 자산 대비 저평가. IRA 혜택으로 미국 태양광 사업 성장 가속. 케미컬 수익성 개선 중.",
    },
    dayFeatures: [
      { day: "월요일", feature: "에너지 정책 뉴스 반응 빠름", caution: "주말 에너지 정책 변화 체크 필수" },
      { day: "화요일", feature: "외국인 수급 유입 활발", caution: "환율 변동에 민감, USD 확인" },
      { day: "수요일", feature: "섹터 로테이션 중간점", caution: "에너지 섹터 전반 흐름 확인" },
      { day: "목요일", feature: "계열사 실적 연동 반응", caution: "한화그룹 뉴스 연동 위험 관리" },
      { day: "금요일", feature: "코스피 대형주 오후 약세", caution: "기관 포지션 정리 물량 주의" },
    ],
    risk: {
      geopolitical: "미국 IRA 정책 변화 시 태양광 수익성 급락 위험. 중국 태양광 덤핑 경쟁 심화.",
      technicalBounce: "RSI 35 이하(43,000원대) 과매도 구간 반등 기대. 18,410원 연간 저점이 강한 지지.",
      strategy: "IRA 정책 유지 시 중장기 보유 유효. PBR 0.9배 저평가 매력. 전체 포트 10% 이내.",
    },
    witchDayStrategy: "코스피 중형주로 만기일 영향 일반 수준. 만기일 오전 변동성 활용한 단기 매매 또는 신규 진입 기회.",
    entryRecommendation: "현재 52주 저점 대비 회복 중. 5% 조정(₩46,265) 시 1차 분할 진입. PBR 저평가 감안 장기 보유 적합.",
  },

  // ─── 케이바이오 ─────────────────────────────────────────────────────────────
  {
    id: "kbio",
    name: "케이바이오",
    ticker: "038530",
    market: "KOSDAQ",
    region: "국내장",
    grade: "소형주",
    themes: ["바이오", "의료기기", "진단키트", "헬스케어"],
    currentPrice: 346,
    currency: "KRW",
    description: "의료기기·바이오헬스 전문 기업. 체외진단 제품 및 의료소모품 제조. 코스닥 소형 바이오주로 정책·테마에 민감한 종목.",
    splitEntries: [
      { ratio: 30, dropPercent: 5,  targetPrice: Math.round(346 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(346 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(346 * 0.85) },
    ],
    profitTargets: [
      { percent: 3,  price: Math.round(346 * 1.03) },
      { percent: 8,  price: Math.round(346 * 1.08) },
      { percent: 15, price: Math.round(346 * 1.15) },
    ],
    boxRange: {
      support:          225,
      resistance:       516,
      currentPosition:  "중간권",
    },
    forecasts: [
      { period: "1일 후",    price: 349,  changePercent: 0.9  },
      { period: "1주 후",    price: 358,  changePercent: 3.5  },
      { period: "1개월 후",  price: 380,  changePercent: 9.8  },
      { period: "3개월 후",  price: 420,  changePercent: 21.4 },
      { period: "6개월 후",  price: 460,  changePercent: 33.0 },
      { period: "12개월 후", price: 520,  changePercent: 50.3 },
      { period: "1800일",    price: 1200, changePercent: 246.8 },
    ],
    financials: {
      per: 0,
      pbr: 0.8,
      roe: -5.2,
      debtRatio: 45.3,
      revenueGrowth: 12.1,
      evaluation: "적정",
      summary: "소형 바이오 특성상 적자 지속 구간. PBR 0.8배로 자산 대비 저평가. 임상·인허가 이벤트 발생 시 급등 가능성 보유.",
    },
    dayFeatures: [
      { day: "월요일", feature: "바이오 테마 동반 급등락", caution: "주말 임상 결과 발표 영향 큼" },
      { day: "화요일", feature: "개인 투기 매수 집중", caution: "거래량 급증 시 단기 고점 주의" },
      { day: "수요일", feature: "숨고르기, 낮은 변동성", caution: "방향성 미정 구간, 추격 자제" },
      { day: "목요일", feature: "임상·특허 공시 빈발", caution: "공시 직후 급등락 극단적" },
      { day: "금요일", feature: "소형 바이오 주말 청산 매도", caution: "오후 2시 이후 급락 패턴 주의" },
    ],
    risk: {
      geopolitical: "규제기관 정책·인허가 리스크 상존. 임상 실패 시 주가 50% 이상 급락 위험.",
      technicalBounce: "RSI 25 이하 극단 과매도 시 단기 반등. 225원 연간 저점 붕괴 시 추가 하락 위험.",
      strategy: "소형 바이오 특성상 전체 포트 3% 이하 제한. 이벤트 드리븐 단기 매매 전략 적합. 장기 보유 비권장.",
    },
    witchDayStrategy: "소형 코스닥주로 만기일 직접 영향 최소. 그러나 시장 전반 패닉 시 유동성 부족으로 급락 취약. 만기일 포지션 최소화 권장.",
    entryRecommendation: "소형 바이오 특성상 임상·공시 이벤트 대기 전략. 225원 저점 확인 후 RSI 30 이하에서 소량 진입. 손절 225원 설정 필수.",
  },

  // ─── 한화생명 ────────────────────────────────────────────────────────────────
  {
    id: "hanwha_life",
    name: "한화생명",
    ticker: "088350",
    market: "KOSPI",
    region: "국내장",
    grade: "중형주",
    themes: ["보험", "금융", "생명보험", "IFRS17"],
    currentPrice: 4770,
    currency: "KRW",
    description: "한화그룹 생명보험 계열사. IFRS17 도입으로 계약서비스마진(CSM) 기반 수익 가시화. 금리 상승 시 운용이익 개선.",
    splitEntries: [
      { ratio: 30, dropPercent: 5,  targetPrice: Math.round(4770 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(4770 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(4770 * 0.85) },
    ],
    profitTargets: [
      { percent: 3,  price: Math.round(4770 * 1.03) },
      { percent: 8,  price: Math.round(4770 * 1.08) },
      { percent: 15, price: Math.round(4770 * 1.15) },
    ],
    boxRange: {
      support:          2400,
      resistance:       6600,
      currentPosition:  "중간권",
    },
    forecasts: [
      { period: "1일 후",    price: 4810,  changePercent: 0.8  },
      { period: "1주 후",    price: 4920,  changePercent: 3.1  },
      { period: "1개월 후",  price: 5200,  changePercent: 9.0  },
      { period: "3개월 후",  price: 5600,  changePercent: 17.4 },
      { period: "6개월 후",  price: 6000,  changePercent: 25.8 },
      { period: "12개월 후", price: 6800,  changePercent: 42.6 },
      { period: "1800일",    price: 16000, changePercent: 235.4 },
    ],
    financials: {
      per: 5.2,
      pbr: 0.4,
      roe: 8.1,
      debtRatio: 920.0,
      revenueGrowth: 4.3,
      evaluation: "저평가",
      summary: "보험사 특성상 부채비율 높으나 정상 범위. PBR 0.4배로 심한 저평가. IFRS17 기준 CSM 증가로 이익 가시성 향상.",
    },
    dayFeatures: [
      { day: "월요일", feature: "금리 변동 민감 반응", caution: "미 국채 금리 주말 흐름 체크" },
      { day: "화요일", feature: "보험·금융 섹터 연동", caution: "KB·삼성생명 방향성 선반영" },
      { day: "수요일", feature: "중립적 흐름", caution: "외국인 수급 변화 주목" },
      { day: "목요일", feature: "배당·실적 기대감 반영", caution: "분기 실적 발표 전후 변동 큼" },
      { day: "금요일", feature: "저PBR 배당주 방어 수요", caution: "시장 약세 시 방어적 수급 유입" },
    ],
    risk: {
      geopolitical: "금리 인하 기조 전환 시 운용이익 감소. 저출산·인구 감소로 장기 성장성 제한.",
      technicalBounce: "RSI 35 이하(4,200원대) 과매도 반등 기대. 2,400원 연간 저점 강한 지지선.",
      strategy: "PBR 0.4배 극단 저평가, 배당 수익률 목적 중장기 보유 적합. 전체 포트 8% 이내.",
    },
    witchDayStrategy: "코스피 중형 금융주로 만기일 영향 일반. 만기일 오전 변동성 이용한 저점 분할 매수 전략 유효.",
    entryRecommendation: "현재 52주 저점 대비 회복 중. 5% 조정(₩4,532) 시 1차 분할 진입. PBR·배당 감안 중장기 보유 전략.",
  },

  // ─── SG세계물산 ─────────────────────────────────────────────────────────────
  {
    id: "sg_world",
    name: "SG세계물산",
    ticker: "004840",
    market: "KOSPI",
    region: "국내장",
    grade: "중형주",
    themes: ["건설", "주택", "부동산개발", "공공공사"],
    currentPrice: 5600,
    currency: "KRW",
    description: "주택·공공 건설 및 부동산 개발 전문 기업. 정부 SOC 예산·주택 공급 정책 수혜 가능. 부동산 경기 회복 시 수주 확대 기대.",
    splitEntries: [
      { ratio: 30, dropPercent: 5,  targetPrice: Math.round(5600 * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(5600 * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(5600 * 0.85) },
    ],
    profitTargets: [
      { percent: 3,  price: Math.round(5600 * 1.03) },
      { percent: 8,  price: Math.round(5600 * 1.08) },
      { percent: 15, price: Math.round(5600 * 1.15) },
    ],
    boxRange: {
      support:          3850,
      resistance:       6250,
      currentPosition:  "고점권",
    },
    forecasts: [
      { period: "1일 후",    price: 5650,  changePercent: 0.9  },
      { period: "1주 후",    price: 5760,  changePercent: 2.9  },
      { period: "1개월 후",  price: 6000,  changePercent: 7.1  },
      { period: "3개월 후",  price: 6400,  changePercent: 14.3 },
      { period: "6개월 후",  price: 7000,  changePercent: 25.0 },
      { period: "12개월 후", price: 7800,  changePercent: 39.3 },
      { period: "1800일",    price: 18000, changePercent: 221.4 },
    ],
    financials: {
      per: 8.3,
      pbr: 0.6,
      roe: 7.2,
      debtRatio: 185.4,
      revenueGrowth: 6.5,
      evaluation: "저평가",
      summary: "PBR 0.6배 저평가, PER 8배 수준의 낮은 밸류. 부동산 경기 의존도 높으나 공공공사 기반 안정적. 정책 수주 증가 시 이익 개선 가능.",
    },
    dayFeatures: [
      { day: "월요일", feature: "부동산·건설 정책 뉴스 반응", caution: "주말 정부 정책 발표 모니터링" },
      { day: "화요일", feature: "수주 발표 공시 빈발", caution: "공시 직후 급등 추격 금지" },
      { day: "수요일", feature: "건설 섹터 중간 흐름", caution: "금리 방향성에 민감" },
      { day: "목요일", feature: "분양·착공 데이터 발표 연동", caution: "부동산 지표 악화 시 급락" },
      { day: "금요일", feature: "건설주 주간 포지션 정리", caution: "오후 매도 압력, 포지션 일부 축소" },
    ],
    risk: {
      geopolitical: "고금리 지속 시 주택 수요 감소, 건설사 유동성 위험. 원자재 가격 상승 시 수익성 악화.",
      technicalBounce: "RSI 30 이하(4,700원대) 과매도 구간 반등 기대. 3,850원 연간 저점 붕괴 시 추가 하락.",
      strategy: "52주 고점 근접으로 신규 진입 시 분할 접근. 부동산 경기 회복 사이클 감안 중기 보유. 전체 포트 7% 이내.",
    },
    witchDayStrategy: "코스피 중소형 건설주로 만기일 영향 보통. 시장 변동성 증가 시 건설 섹터 동반 하락 가능. 만기일 전날 포지션 조절 권장.",
    entryRecommendation: "현재 52주 고점권 인접. 5% 조정(₩5,320) 후 1차 분할 진입. 금리 인하 사이클 및 SOC 예산 확대 수혜 감안 중기 보유.",
  },
];
