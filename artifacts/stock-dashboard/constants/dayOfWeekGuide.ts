/**
 * 요일별 시장 특징 — 단일 소스. 모든 종목 공통이라 종목별 dayFeatures를 대체.
 *
 * 주말은 정의하지 않음 (시장 휴장).
 */

export type Dow = 1 | 2 | 3 | 4 | 5;

export interface DayGuideEntry {
  dow:      Dow;
  dowLabel: "월" | "화" | "수" | "목" | "금";
  emoji:    string;
  feature:  string;
  caution:  string;
}

export const DAY_GUIDE: DayGuideEntry[] = [
  {
    dow: 1, dowLabel: "월", emoji: "🌅",
    feature: "주말 글로벌 뉴스 소화 + 선물 시장 방향 선행 파악 중요.",
    caution: "갭 변동성 구간. 개장 30분 내 급등락 시 섣부른 진입 금지.",
  },
  {
    dow: 2, dowLabel: "화", emoji: "📊",
    feature: "수급 안정화 — 기술적 신호 신뢰도 상승 구간.",
    caution: "실적 발표 시즌엔 어닝 서프라이즈·쇼크 주의.",
  },
  {
    dow: 3, dowLabel: "수", emoji: "⚡",
    feature: "FOMC 발표 주에 변동성 최고조. 평소엔 추세 지속 구간.",
    caution: "FOMC 전후 ±2% 이상 변동 가능. 레버리지 축소 권장.",
  },
  {
    dow: 4, dowLabel: "목", emoji: "📋",
    feature: "주간 실업수당 청구건수 발표일 + 한국 옵션 만기일(둘째 목요일).",
    caution: "월별 CPI·PPI 발표 겹칠 시 변동성 급증.",
  },
  {
    dow: 5, dowLabel: "금", emoji: "🎯",
    feature: "NFP 발표일(매월 첫 금요일) + 미국 옵션 만기(매월 3째 금요일).",
    caution: "포지션 정리로 거래량 감소 + 주말 갭 리스크 회피 흐름.",
  },
];

/** 평일이면 오늘 요일 가이드, 주말이면 null. */
export function getTodayGuide(): DayGuideEntry | null {
  const dow = new Date().getDay(); // 0=일, 1=월, ..., 6=토
  if (dow < 1 || dow > 5) return null;
  return DAY_GUIDE.find((d) => d.dow === dow) ?? null;
}
