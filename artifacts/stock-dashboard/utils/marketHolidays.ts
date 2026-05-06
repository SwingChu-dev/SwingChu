/**
 * 한국·미국 주식시장 휴장일 캘린더 (2026~2027).
 *
 * 휴장 사유 라벨로 노출. 주말(토·일)은 모든 시장 휴장으로 처리.
 * 시간대는 단순화: 거래일 여부만 본다 (장중·장마감 시각은 별도 로직 필요).
 */

export type MarketKey = "KOSPI" | "KOSDAQ" | "NASDAQ";

export interface MarketStatus {
  closed: boolean;
  reason?: string;
}

// YYYY-MM-DD: 사유
const KRX_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-02": "삼일절 대체",
  "2026-05-05": "어린이날",
  "2026-05-25": "부처님오신날",
  "2026-06-03": "선거일",
  "2026-06-08": "현충일 대체",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-10-05": "개천절 대체",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  "2026-12-31": "연말 폐장",

  "2027-01-01": "신정",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "설날 연휴",
  "2027-03-01": "삼일절",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-07": "현충일 대체",
  "2027-09-15": "추석 연휴",
  "2027-09-16": "추석",
  "2027-09-17": "추석 연휴",
  "2027-10-04": "개천절 대체",
  "2027-10-11": "한글날 대체",
  "2027-12-31": "연말 폐장",
};

const NYSE_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "MLK Day",
  "2026-02-16": "Presidents Day",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (관측)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving",
  "2026-12-25": "Christmas",

  "2027-01-01": "New Year's Day",
  "2027-01-18": "MLK Day",
  "2027-02-15": "Presidents Day",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth (관측)",
  "2027-07-05": "Independence Day (관측)",
  "2027-09-06": "Labor Day",
  "2027-11-25": "Thanksgiving",
  "2027-12-24": "Christmas (관측)",
};

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getMarketStatus(market: MarketKey, date: Date = new Date()): MarketStatus {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return { closed: true, reason: "주말" };

  const key = isoDate(date);
  if (market === "NASDAQ") {
    const reason = NYSE_HOLIDAYS[key];
    return reason ? { closed: true, reason } : { closed: false };
  }
  const reason = KRX_HOLIDAYS[key];
  return reason ? { closed: true, reason } : { closed: false };
}
