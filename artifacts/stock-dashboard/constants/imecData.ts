// IMEC (India-Middle East-Europe Corridor) 수혜/소외 분류
// 인도·중동·유럽을 잇는 새 물류 루트 기반 섹터 분류

export type ImecExposure = "수혜" | "중립" | "소외";

export interface ImecStock {
  ticker:   string;
  exposure: ImecExposure;
  reason:   string;
}

export const IMEC_MAP: Record<string, ImecStock> = {
  // ── 미국 기술주 ───────────────────────────────────────────
  NVDA: {
    ticker:   "NVDA",
    exposure: "수혜",
    reason:   "AI 데이터센터 인프라 핵심 — IMEC 경로 중동·인도 AI 허브에 GPU 독점 공급",
  },
  GOOGL: {
    ticker:   "GOOGL",
    exposure: "수혜",
    reason:   "인도 클라우드 1위, 사우디·UAE 데이터센터 대규모 투자. IMEC 디지털 인프라 핵심",
  },
  ORCL: {
    ticker:   "ORCL",
    exposure: "수혜",
    reason:   "사우디 아람코·UAE 클라우드 계약 체결. IMEC 경로 국가 디지털 전환 수혜",
  },
  IONQ: {
    ticker:   "IONQ",
    exposure: "중립",
    reason:   "양자 컴퓨팅은 IMEC 물류 루트 직접 영향 없음. 미·중 기술 경쟁 변수",
  },
  SNDK: {
    ticker:   "SNDK",
    exposure: "중립",
    reason:   "낸드 스토리지 수요는 글로벌 데이터센터 확장 수혜이나 IMEC 직접 연계 제한적",
  },
  EONR: {
    ticker:   "EONR",
    exposure: "수혜",
    reason:   "중동·인도 재생에너지 인프라 확장 수혜. IMEC 그린에너지 코리더 연계 가능",
  },
  CRML: {
    ticker:   "CRML",
    exposure: "중립",
    reason:   "그린란드 중희토류 광산은 미·EU 탈중국 공급망 핵심이나 IMEC 물류 루트와는 직접 연계 약함. 서방 핵심광물 정책에 더 민감",
  },
  NVA: {
    ticker:   "NVA",
    exposure: "중립",
    reason:   "알래스카 안티몬·금 광산은 미국 국방 비축 정책 수혜이나 IMEC 인도-중동 회랑과 직접 연계 약함. 미·중 무역갈등에 더 민감",
  },
  GLND: {
    ticker:   "GLND",
    exposure: "중립",
    reason:   "그린란드 자원 개발은 북극·서방 핵심광물 정책 수혜이나 IMEC 물류 루트와 직접 연계 없음. 미국·EU 그린란드 전략에 더 민감",
  },
  BNAI: {
    ticker:   "BNAI",
    exposure: "중립",
    reason:   "AI 인프라 간접 수혜. IMEC 직접 연계는 제한적",
  },

  // ── 국내주 ────────────────────────────────────────────────
  "005930": {   // 삼성전자
    ticker:   "005930",
    exposure: "수혜",
    reason:   "인도 스마트폰 공장 확장 + 중동 반도체 수출 증가. 차이나 패싱 대안 생산기지",
  },
  "000660": {   // SK하이닉스
    ticker:   "000660",
    exposure: "수혜",
    reason:   "HBM·AI 메모리 글로벌 1위. IMEC 데이터센터 HBM 수요 폭발 직접 수혜",
  },
  "012450": {   // 한화에어로스페이스
    ticker:   "012450",
    exposure: "수혜",
    reason:   "중동 방산 수출 急증, 지정학 긴장 고조 시 방산주 수혜. IMEC 안보 루트 수혜",
  },
  "005380": {   // 현대차
    ticker:   "005380",
    exposure: "중립",
    reason:   "인도 현지 생산 확대로 간접 수혜. 전기차 전환 변수로 중립 유지",
  },
  "034020": {   // 두산에너빌리티
    ticker:   "034020",
    exposure: "수혜",
    reason:   "SMR·원전 기술로 중동 에너지 인프라 수주 기회. IMEC 에너지 코리더 수혜",
  },
  "032820": {   // 우리기술투자
    ticker:   "032820",
    exposure: "소외",
    reason:   "국내 VC 펀드 중심. IMEC 글로벌 물류 루트 수혜 직접 연계 없음",
  },
  "080220": {   // 제주반도체
    ticker:   "080220",
    exposure: "중립",
    reason:   "틈새 메모리 전문. IMEC 수혜 간접적, 직접 연계 제한",
  },
  "009830": {   // 한화솔루션
    ticker:   "009830",
    exposure: "수혜",
    reason:   "태양광·수소 에너지. 중동·인도 재생에너지 대규모 투자 수혜",
  },
  "038530": {   // 케이비오션
    ticker:   "038530",
    exposure: "소외",
    reason:   "국내 바이오 중심. IMEC 글로벌 루트와 직접 연계 없음",
  },
  "088350": {   // 한화생명
    ticker:   "088350",
    exposure: "중립",
    reason:   "국내 보험. IMEC 직접 수혜 없음",
  },
  "004840": {   // SG세계물산
    ticker:   "004840",
    exposure: "중립",
    reason:   "국내 섬유·건설. IMEC 수혜 제한적",
  },
};

export function getImecExposure(ticker: string): ImecStock | null {
  return IMEC_MAP[ticker] ?? null;
}

export const IMEC_COLORS: Record<ImecExposure, string> = {
  수혜: "#2DB55D",
  중립: "#8E8E93",
  소외: "#F04452",
};
