export type ScalpType = "급등포착" | "고점위험" | "눌림목" | "관망";
export type UrgencyType = "즉시" | "당일" | "이번주";
export type RiskLevel = "위험" | "주의" | "안전";

export interface ProfitPct {
  label: string;
  percent: number; // 현재가 대비 퍼센트 (음수 = 하락 목표)
}

// 모든 가격은 현재가(currentPrice) 대비 % 기반으로 정의.
// 실제 절대 가격은 scalping.tsx에서 동적으로 계산함.
export interface ScalpSignal {
  stockId: string;
  stockName: string;
  ticker: string;
  market: string;
  type: ScalpType;
  urgency: UrgencyType;
  riskLevel: RiskLevel;
  surgeScore: number;
  riskScore: number;
  rsi: number;
  volumeSpike: number;
  distanceFrom52High: number;
  expectedMovePercent: number;
  // 진입 구간 (현재가 대비 %)
  entryLowPct: number;  // 음수 = 현재가보다 낮은 진입, 0 = 없음
  entryHighPct: number; // 양수 = 현재가보다 높은 진입, 0 = 없음
  // 손절/탈출 (항상 양수, 하락 방향)
  stopLossPct: number;
  // 익절/탈출 라인 (퍼센트)
  profitPcts: ProfitPct[];
  signals: string[];
  summary: string;
  caution?: string;
}

export const SCALP_SIGNALS: ScalpSignal[] = [
  {
    stockId: "skhynix",
    stockName: "SK하이닉스",
    ticker: "000660",
    market: "KOSPI",
    type: "급등포착",
    urgency: "즉시",
    riskLevel: "안전",
    surgeScore: 91,
    riskScore: 18,
    rsi: 62,
    volumeSpike: 2.7,
    distanceFrom52High: -8.2,
    expectedMovePercent: 12.5,
    entryLowPct: -2,
    entryHighPct: 0.5,
    stopLossPct: 6,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
      { label: "3차 익절", percent: 15 },
    ],
    signals: ["HBM4 독점 수주 확정", "기관 5,640억 순매수", "거래량 2.7배 급증", "52주 신고가 돌파 임박"],
    summary: "HBM4 엔비디아 독점 수주 + 기관 대규모 매집. 신고가 돌파 시 추가 급등 기대.",
  },
  {
    stockId: "hanwha",
    stockName: "한화에어로스페이스",
    ticker: "012450",
    market: "KOSPI",
    type: "급등포착",
    urgency: "당일",
    riskLevel: "주의",
    surgeScore: 84,
    riskScore: 32,
    rsi: 58,
    volumeSpike: 4.1,
    distanceFrom52High: -15.3,
    expectedMovePercent: 10,
    entryLowPct: -3,
    entryHighPct: 1,
    stopLossPct: 7,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
      { label: "3차 익절", percent: 15 },
    ],
    signals: ["유럽 방산 수주 발표 임박", "거래량 4.1배 선매수", "기관·외국인 동반 순매수", "K-방산 테마 강세"],
    summary: "수주 발표 전 선매수 세력 포착. 이벤트 드리븐 단타 기회. 발표 후 익절 전략 필수.",
    caution: "이벤트 발표 없을 시 빠른 손절 필요",
  },
  {
    stockId: "doosan",
    stockName: "두산에너빌리티",
    ticker: "034020",
    market: "KOSPI",
    type: "급등포착",
    urgency: "이번주",
    riskLevel: "안전",
    surgeScore: 76,
    riskScore: 24,
    rsi: 44,
    volumeSpike: 3.4,
    distanceFrom52High: -31.2,
    expectedMovePercent: 15,
    entryLowPct: -4,
    entryHighPct: 1,
    stopLossPct: 8,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
      { label: "3차 익절", percent: 15 },
    ],
    signals: ["52주 저점 부근 기관 매집", "체코 원전 수주 기대", "RSI 44 과매도 회복 중", "SMR 테마 재점화"],
    summary: "원전·SMR 테마 저점 진입 기회. 저점권에서 기관 조용한 매집 확인. 중장기 관점 단타.",
  },
  {
    stockId: "samsung",
    stockName: "삼성전자",
    ticker: "005930",
    market: "KOSPI",
    type: "눌림목",
    urgency: "이번주",
    riskLevel: "안전",
    surgeScore: 68,
    riskScore: 20,
    rsi: 42,
    volumeSpike: 2.1,
    distanceFrom52High: -28.5,
    expectedMovePercent: 8,
    entryLowPct: -3,
    entryHighPct: 1,
    stopLossPct: 7,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
      { label: "3차 익절", percent: 15 },
    ],
    signals: ["52주 저점 근접 반등", "외국인 순매수 5일 연속", "RSI 과매도 회복", "HBM 수주 기대 선반영"],
    summary: "52주 저점 부근 기술적 반등 구간. 외국인 5일 연속 매수. 단기 3-8% 반등 목표 단타.",
  },
  {
    stockId: "nvda",
    stockName: "엔비디아",
    ticker: "NVDA",
    market: "NASDAQ",
    type: "눌림목",
    urgency: "당일",
    riskLevel: "안전",
    surgeScore: 72,
    riskScore: 22,
    rsi: 52,
    volumeSpike: 3.2,
    distanceFrom52High: -12.4,
    expectedMovePercent: 8,
    entryLowPct: -3,
    entryHighPct: 0.5,
    stopLossPct: 7,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
      { label: "3차 익절", percent: 15 },
    ],
    signals: ["조정 후 재매집 신호", "기관 매집 3일 연속", "AI 수요 지속 성장", "중간권 지지선 확인"],
    summary: "5% 조정 후 기관 재매집. AI 서버 수요 증가 뉴스 대기 중. 단기 3~8% 반등 단타 유효.",
  },
  {
    stockId: "googl",
    stockName: "알파벳 A",
    ticker: "GOOGL",
    market: "NASDAQ",
    type: "눌림목",
    urgency: "이번주",
    riskLevel: "안전",
    surgeScore: 61,
    riskScore: 18,
    rsi: 48,
    volumeSpike: 1.6,
    distanceFrom52High: -14.8,
    expectedMovePercent: 7,
    entryLowPct: -4,
    entryHighPct: 1,
    stopLossPct: 8,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
      { label: "3차 익절", percent: 15 },
    ],
    signals: ["자사주 매입 재개 확인", "AI 검색 점유율 방어", "저PER 저평가 구간"],
    summary: "자사주 매입 + 저PER 구간. 급등보다 안정적 상승 기대. 중장기 단타 관점 추천.",
  },
  {
    stockId: "ionq",
    stockName: "아이온큐",
    ticker: "IONQ",
    market: "NASDAQ",
    type: "고점위험",
    urgency: "즉시",
    riskLevel: "위험",
    surgeScore: 15,
    riskScore: 88,
    rsi: 78,
    volumeSpike: 5.8,
    distanceFrom52High: -3.2,
    expectedMovePercent: -15,
    entryLowPct: 0,
    entryHighPct: 0,
    stopLossPct: 5,
    profitPcts: [
      { label: "숏 1차", percent: -5 },
      { label: "숏 2차", percent: -10 },
      { label: "숏 3차", percent: -15 },
    ],
    signals: ["RSI 78 심각한 과매수", "세력 이탈 신호 포착", "52주 고점 근접", "거래량 5.8배 + 음봉"],
    summary: "양자컴퓨팅 급등 후 세력 이탈. RSI 78 극도 과매수. 현재 보유자 즉시 익절 고려.",
    caution: "신규 진입 절대 금지. 보유자 즉시 익절 권장.",
  },
  {
    stockId: "orcl",
    stockName: "오라클",
    ticker: "ORCL",
    market: "NASDAQ",
    type: "고점위험",
    urgency: "당일",
    riskLevel: "주의",
    surgeScore: 28,
    riskScore: 67,
    rsi: 71,
    volumeSpike: 2.3,
    distanceFrom52High: -5.1,
    expectedMovePercent: -8,
    entryLowPct: 0,
    entryHighPct: 0,
    stopLossPct: 4,
    profitPcts: [
      { label: "익절 목표 1", percent: -4 },
      { label: "익절 목표 2", percent: -8 },
    ],
    signals: ["기관 순매도 전환", "클라우드 성장 둔화 우려", "RSI 71 과매수", "고점권 분산 패턴"],
    summary: "고점권에서 기관 차익실현. 클라우드 경쟁 심화로 성장 둔화 우려. 보유자 분할 익절 권장.",
    caution: "신규 매수 비추천. 기존 보유분 분할 매도 고려.",
  },
  {
    stockId: "eon",
    stockName: "EON 리소시스",
    ticker: "EONR",
    market: "NASDAQ",
    type: "고점위험",
    urgency: "즉시",
    riskLevel: "위험",
    surgeScore: 10,
    riskScore: 92,
    rsi: 82,
    volumeSpike: 7.2,
    distanceFrom52High: 2.1,
    expectedMovePercent: -20,
    entryLowPct: 0,
    entryHighPct: 0,
    stopLossPct: 8,
    profitPcts: [
      { label: "탈출 목표", percent: -8 },
      { label: "최대 하락", percent: -25 },
    ],
    signals: ["RSI 82 극단적 과매수", "소형주 펌핑 패턴", "52주 고점 돌파 후 매도세", "세력 단기 급등 후 이탈 전형"],
    summary: "소형 투기주 급등 후 고점. 극단적 과매수 + 세력 이탈 전형 패턴. 보유자 즉시 탈출.",
    caution: "⚠️ 투기성 종목. 신규 진입 절대 금지. 보유 시 즉시 손절.",
  },
  {
    stockId: "woritech",
    stockName: "우리기술",
    ticker: "032820",
    market: "KOSDAQ",
    type: "고점위험",
    urgency: "즉시",
    riskLevel: "위험",
    surgeScore: 12,
    riskScore: 85,
    rsi: 76,
    volumeSpike: 6.1,
    distanceFrom52High: -1.8,
    expectedMovePercent: -12,
    entryLowPct: 0,
    entryHighPct: 0,
    stopLossPct: 6,
    profitPcts: [
      { label: "탈출 목표", percent: -6 },
      { label: "2차 하락", percent: -15 },
    ],
    signals: ["KOSDAQ 소형주 급등", "거래량 6배 이상 급증", "RSI 76 과매수", "고점권 대량 매도 출현"],
    summary: "소형 KOSDAQ 주 급등 후 고점 도달. 거래량 급증 동반 음봉. 차익실현 물량 출회 조짐.",
    caution: "고점권 신규 진입 위험. 보유자 빠른 익절 권장.",
  },
  {
    stockId: "sandisk",
    stockName: "샌디스크",
    ticker: "SNDK",
    market: "NASDAQ",
    type: "관망",
    urgency: "이번주",
    riskLevel: "주의",
    surgeScore: 45,
    riskScore: 41,
    rsi: 55,
    volumeSpike: 1.3,
    distanceFrom52High: -22.1,
    expectedMovePercent: 5,
    entryLowPct: -5,
    entryHighPct: -1,
    stopLossPct: 10,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
    ],
    signals: ["낸드 시황 회복 기대", "방향성 불명확", "중간권 박스 횡보"],
    summary: "낸드 시황 불확실성으로 방향성 없음. 명확한 트리거 없이 관망 유지.",
  },
  {
    stockId: "hyundai",
    stockName: "현대자동차",
    ticker: "005380",
    market: "KOSPI",
    type: "눌림목",
    urgency: "이번주",
    riskLevel: "안전",
    surgeScore: 58,
    riskScore: 28,
    rsi: 46,
    volumeSpike: 1.8,
    distanceFrom52High: -19.4,
    expectedMovePercent: 8,
    entryLowPct: -3,
    entryHighPct: 1,
    stopLossPct: 8,
    profitPcts: [
      { label: "1차 익절", percent: 3 },
      { label: "2차 익절", percent: 8 },
      { label: "3차 익절", percent: 15 },
    ],
    signals: ["전기차 수출 증가 기대", "저PBR 저평가 구간", "외국인 소폭 순매수 전환"],
    summary: "전기차 수출 호조 + 저PBR 구간. 눌림목 매수 후 단기 반등 노리기.",
  },
];

export const TYPE_META: Record<ScalpType, { color: string; bg: string; darkBg: string; icon: string; desc: string }> = {
  급등포착: { color: "#F04452", bg: "#FEF0F1", darkBg: "rgba(240,68,82,0.12)", icon: "rocket", desc: "급등 가능성 높음" },
  고점위험: { color: "#1B63E8", bg: "#EDF3FF", darkBg: "rgba(27,99,232,0.12)", icon: "warning", desc: "고점 위험 감지" },
  눌림목: { color: "#05C072", bg: "#EDFAF4", darkBg: "rgba(5,192,114,0.12)", icon: "arrow-down-circle", desc: "눌림목 매수 기회" },
  관망: { color: "#8B95A1", bg: "#F2F4F6", darkBg: "rgba(139,149,161,0.12)", icon: "pause-circle", desc: "방향성 불명확" },
};

export const URGENCY_META: Record<UrgencyType, { color: string; label: string }> = {
  즉시: { color: "#F04452", label: "즉시" },
  당일: { color: "#FF6B00", label: "당일" },
  이번주: { color: "#8B95A1", label: "이번주" },
};

export const RISK_META: Record<RiskLevel, { color: string; bg: string }> = {
  위험: { color: "#F04452", bg: "rgba(240,68,82,0.1)" },
  주의: { color: "#FF6B00", bg: "rgba(255,107,0,0.1)" },
  안전: { color: "#05C072", bg: "rgba(5,192,114,0.1)" },
};
