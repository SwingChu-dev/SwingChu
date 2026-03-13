export type SignalType = "세력진입" | "세력이탈" | "매집중" | "분산중" | "관망";
export type SignalStrength = "강" | "중" | "약";

export interface SmartMoneySignal {
  id: string;
  stockId: string;
  stockName: string;
  ticker: string;
  market: string;
  type: SignalType;
  strength: SignalStrength;
  volumeRatio: number;
  institutionalNet: number;
  foreignerNet: number;
  priceVsSupport: number;
  signals: string[];
  summary: string;
  detectedAt: Date;
  isNew: boolean;
}

const now = new Date();
const h = (offset: number) => new Date(now.getTime() - offset * 3600000);

export const SMART_MONEY_SIGNALS: SmartMoneySignal[] = [
  {
    id: "sig_nvda_1",
    stockId: "nvda",
    stockName: "엔비디아",
    ticker: "NVDA",
    market: "NASDAQ",
    type: "매집중",
    strength: "강",
    volumeRatio: 3.2,
    institutionalNet: 4820,
    foreignerNet: 2340,
    priceVsSupport: 16.2,
    signals: ["기관 순매수 3일 연속 증가", "평균 대비 거래량 3.2배", "외국인 순매수 전환", "주요 지지선 상방 돌파"],
    summary: "AI 데이터센터 수요 급증 속 대형 기관 조용한 매집 포착. 저점 이탈 없이 거래량 동반 상승 중.",
    detectedAt: h(1.5),
    isNew: true,
  },
  {
    id: "sig_ionq_1",
    stockId: "ionq",
    stockName: "아이온큐",
    ticker: "IONQ",
    market: "NASDAQ",
    type: "세력이탈",
    strength: "강",
    volumeRatio: 5.8,
    institutionalNet: -1240,
    foreignerNet: -890,
    priceVsSupport: 78.4,
    signals: ["고점권 대량 매도 포착", "거래량 5.8배 급증 + 음봉", "기관 3일 연속 순매도", "단기 급등 후 분산 패턴"],
    summary: "양자컴퓨팅 급등 이후 세력 차익실현 구간. 고점권에서 비정상적 거래량 동반 하락 경고.",
    detectedAt: h(0.5),
    isNew: true,
  },
  {
    id: "sig_samsung_1",
    stockId: "samsung",
    stockName: "삼성전자",
    ticker: "005930",
    market: "KOSPI",
    type: "세력진입",
    strength: "중",
    volumeRatio: 2.1,
    institutionalNet: 3150,
    foreignerNet: 1820,
    priceVsSupport: 4.8,
    signals: ["52주 저점 근접 기관 매집", "외국인 순매수 5일 연속", "HBM 수주 기대 선반영", "저점권 거래량 이상 증가"],
    summary: "HBM 3세대 삼성전자 수주 기대감으로 52주 저점 부근에서 기관·외국인 동시 매집 신호.",
    detectedAt: h(2),
    isNew: false,
  },
  {
    id: "sig_hynix_1",
    stockId: "skhynix",
    stockName: "SK하이닉스",
    ticker: "000660",
    market: "KOSPI",
    type: "매집중",
    strength: "강",
    volumeRatio: 2.7,
    institutionalNet: 5640,
    foreignerNet: 4210,
    priceVsSupport: 22.1,
    signals: ["HBM4 독점 공급 확정 후 기관 대규모 매집", "외국인 4,210억 순매수", "목표주가 일제 상향", "거래량 상위 1% 진입"],
    summary: "HBM4 NVIDIA 독점 공급 확정으로 기관·외국인 동반 대규모 매집. 사상 최고가 경신 가능성.",
    detectedAt: h(3),
    isNew: false,
  },
  {
    id: "sig_hanwha_1",
    stockId: "hanwha",
    stockName: "한화에어로스페이스",
    ticker: "012450",
    market: "KOSPI",
    type: "세력진입",
    strength: "강",
    volumeRatio: 4.1,
    institutionalNet: 2890,
    foreignerNet: 1540,
    priceVsSupport: 31.5,
    signals: ["K-방산 수주 발표 직전 선매수 포착", "거래량 4.1배 + 강한 양봉", "외국인 비중 급증", "옵션 콜 매수 폭증"],
    summary: "유럽 방산 수주 기대감으로 발표 전 대규모 선매수 포착. 세력 진입 강도 매우 높음.",
    detectedAt: h(0.8),
    isNew: true,
  },
  {
    id: "sig_googl_1",
    stockId: "googl",
    stockName: "알파벳 A",
    ticker: "GOOGL",
    market: "NASDAQ",
    type: "매집중",
    strength: "약",
    volumeRatio: 1.6,
    institutionalNet: 1240,
    foreignerNet: 620,
    priceVsSupport: 14.2,
    signals: ["자사주 매입 프로그램 재개", "기관 소폭 순매수 지속", "AI 검색 점유율 방어 확인"],
    summary: "자사주 매입 재개 + 기관 꾸준한 소폭 매집. 급격한 변동 없이 조용한 저점 매수 패턴.",
    detectedAt: h(5),
    isNew: false,
  },
  {
    id: "sig_orcl_1",
    stockId: "orcl",
    stockName: "오라클",
    ticker: "ORCL",
    market: "NASDAQ",
    type: "분산중",
    strength: "중",
    volumeRatio: 2.3,
    institutionalNet: -980,
    foreignerNet: -340,
    priceVsSupport: 62.3,
    signals: ["고점권 기관 순매도 전환", "클라우드 성장 둔화 우려", "거래량 동반 하락 패턴"],
    summary: "고점권에서 기관 차익실현 분산 패턴. 클라우드 성장 둔화 우려로 매도 압력 증가.",
    detectedAt: h(4),
    isNew: false,
  },
  {
    id: "sig_doosan_1",
    stockId: "doosanenergility",
    stockName: "두산에너빌리티",
    ticker: "034020",
    market: "KOSPI",
    type: "세력진입",
    strength: "중",
    volumeRatio: 3.4,
    institutionalNet: 1650,
    foreignerNet: 890,
    priceVsSupport: 8.2,
    signals: ["원전 수주 기대 저점 매집", "거래량 3.4배 + 양봉 연속", "52주 저점 부근 대량 매수"],
    summary: "체코 원전 수주 기대감 + 소형모듈원자로(SMR) 테마로 저점권에서 기관 진입 포착.",
    detectedAt: h(6),
    isNew: false,
  },
];

export const SIGNAL_META: Record<SignalType, { color: string; bg: string; icon: string; desc: string }> = {
  세력진입: { color: "#F04452", bg: "#FEF0F1", icon: "trending-up", desc: "강한 매수세 유입" },
  세력이탈: { color: "#1B63E8", bg: "#EDF3FF", icon: "trending-down", desc: "대규모 매도세 포착" },
  매집중: { color: "#F04452", bg: "#FEF0F1", icon: "arrow-up-circle", desc: "조용한 저점 매집" },
  분산중: { color: "#1B63E8", bg: "#EDF3FF", icon: "arrow-down-circle", desc: "고점 차익실현 분산" },
  관망: { color: "#8B95A1", bg: "#F2F4F6", icon: "remove-circle-outline", desc: "특이동향 없음" },
};

export const STRENGTH_META: Record<SignalStrength, { color: string; label: string }> = {
  강: { color: "#F04452", label: "강" },
  중: { color: "#FF6B00", label: "중" },
  약: { color: "#8B95A1", label: "약" },
};
