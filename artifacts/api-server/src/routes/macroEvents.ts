/**
 * 통합 매크로 이벤트 캘린더.
 *
 * 외부 API 추가 없이 deterministic 계산 + 기존 FOMC 정적 일정 재활용:
 *   - FOMC / FOMC Minutes (회의일 + 3주)
 *   - NFP — 매월 첫 번째 금요일 미국 8:30 ET 발표
 *   - WITCH_US — 매월 3번째 금요일, 분기말월(3·6·9·12)은 quad witching → HIGH
 *   - WITCH_KR — 매월 둘째 목요일 한국 옵션 만기일
 *
 * GET /api/macro-events?days=30  (기본 30, 최대 90)
 */
import { Router } from "express";
import { rateLimit } from "../lib/rateLimit";
import { FOMC_MEETINGS } from "./fomc";

const router = Router();

export type MacroEventType =
  | "FOMC"
  | "FOMC_MINUTES"
  | "WITCH_US"
  | "WITCH_KR"
  | "NFP";

export type MacroSeverity = "HIGH" | "MEDIUM" | "LOW";
export type MacroMarket   = "us" | "kr" | "global";

export interface MacroEvent {
  type:      MacroEventType;
  dateISO:   string;
  daysUntil: number;
  title:     string;
  detail:    string;
  severity:  MacroSeverity;
  market:    MacroMarket;
}

const DAY_MS = 24 * 3600_000;

function ymdMs(ymd: string): number {
  return new Date(ymd + "T00:00:00Z").getTime();
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** N월의 weekday(0=일~6=토)에 해당하는 occurrence번째 날짜 반환 (1-indexed). */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number): Date {
  // month: 0~11
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = first.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (occurrence - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}

function buildFomcEvents(now: number, windowEnd: number): MacroEvent[] {
  const events: MacroEvent[] = [];
  for (const m of FOMC_MEETINGS) {
    const decisionMs = ymdMs(m.decisionDate);
    if (decisionMs < now - DAY_MS || decisionMs > windowEnd) continue;
    events.push({
      type:      "FOMC",
      dateISO:   m.decisionDate,
      daysUntil: Math.ceil((decisionMs - now) / DAY_MS),
      title:     m.spr ? "FOMC 결정 (점도표 포함)" : "FOMC 결정",
      detail:    m.spr
        ? "Fed 기준금리 발표 + Summary of Economic Projections. 변동성 가장 큰 회의."
        : "Fed 기준금리 발표. Powell 기자회견 후 시장 변동성 ↑.",
      severity:  m.spr ? "HIGH" : "HIGH",
      market:    "global",
    });

    // FOMC Minutes — 회의일 + 3주 (수요일 14:00 ET)
    const minutesMs = decisionMs + 21 * DAY_MS;
    if (minutesMs >= now - DAY_MS && minutesMs <= windowEnd) {
      const minutesDate = ymd(new Date(minutesMs));
      events.push({
        type:      "FOMC_MINUTES",
        dateISO:   minutesDate,
        daysUntil: Math.ceil((minutesMs - now) / DAY_MS),
        title:     "FOMC 의사록 공개",
        detail:    "이전 회의 위원 코멘트 공개. 인플레·금리 톤 단서.",
        severity:  "MEDIUM",
        market:    "global",
      });
    }
  }
  return events;
}

function buildNfpEvents(now: number, windowEnd: number): MacroEvent[] {
  const events: MacroEvent[] = [];
  const nowDate = new Date(now);
  for (let monthOffset = 0; monthOffset <= 4; monthOffset++) {
    const target = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + monthOffset, 1));
    const firstFriday = nthWeekdayOfMonth(target.getUTCFullYear(), target.getUTCMonth(), 5, 1);
    const ms = firstFriday.getTime();
    if (ms < now - DAY_MS || ms > windowEnd) continue;
    events.push({
      type:      "NFP",
      dateISO:   ymd(firstFriday),
      daysUntil: Math.ceil((ms - now) / DAY_MS),
      title:     "NFP (미국 비농업 고용)",
      detail:    "8:30 ET 발표. 고용 강·약에 따라 금리 기대 + 달러 + 주가 동시 반응.",
      severity:  "HIGH",
      market:    "us",
    });
  }
  return events;
}

function buildWitchUsEvents(now: number, windowEnd: number): MacroEvent[] {
  const events: MacroEvent[] = [];
  const nowDate = new Date(now);
  for (let monthOffset = 0; monthOffset <= 4; monthOffset++) {
    const targetMonth = (nowDate.getUTCMonth() + monthOffset) % 12;
    const targetYear  = nowDate.getUTCFullYear() + Math.floor((nowDate.getUTCMonth() + monthOffset) / 12);
    const thirdFriday = nthWeekdayOfMonth(targetYear, targetMonth, 5, 3);
    const ms = thirdFriday.getTime();
    if (ms < now - DAY_MS || ms > windowEnd) continue;
    const isQuad = [2, 5, 8, 11].includes(targetMonth); // 3,6,9,12월 (0-indexed)
    events.push({
      type:      "WITCH_US",
      dateISO:   ymd(thirdFriday),
      daysUntil: Math.ceil((ms - now) / DAY_MS),
      title:     isQuad ? "미국 분기 옵션 만기 (Quad Witching)" : "미국 월간 옵션 만기",
      detail:    isQuad
        ? "주식·지수·옵션·선물 4종 동시 만기. 만기 1주 전부터 변동성 확대, 당일 거래량 폭증."
        : "지수·개별주 옵션 만기. 마감 직전 헤지 포지션 청산으로 변동성 ↑.",
      severity:  isQuad ? "HIGH" : "MEDIUM",
      market:    "us",
    });
  }
  return events;
}

function buildWitchKrEvents(now: number, windowEnd: number): MacroEvent[] {
  const events: MacroEvent[] = [];
  const nowDate = new Date(now);
  for (let monthOffset = 0; monthOffset <= 4; monthOffset++) {
    const targetMonth = (nowDate.getUTCMonth() + monthOffset) % 12;
    const targetYear  = nowDate.getUTCFullYear() + Math.floor((nowDate.getUTCMonth() + monthOffset) / 12);
    const secondThursday = nthWeekdayOfMonth(targetYear, targetMonth, 4, 2);
    const ms = secondThursday.getTime();
    if (ms < now - DAY_MS || ms > windowEnd) continue;
    events.push({
      type:      "WITCH_KR",
      dateISO:   ymd(secondThursday),
      daysUntil: Math.ceil((ms - now) / DAY_MS),
      title:     "한국 옵션 만기일 (KOSPI200)",
      detail:    "둘째 목요일. 외국인·기관 헤지 청산 + 위탁 마감 변동성 가능.",
      severity:  "MEDIUM",
      market:    "kr",
    });
  }
  return events;
}

router.get("/macro-events", rateLimit("macro-events", 200), (req, res) => {
  const daysParam = parseInt(String(req.query.days ?? "30"), 10);
  const days = Math.max(1, Math.min(90, Number.isFinite(daysParam) ? daysParam : 30));
  const now = Date.now();
  const windowEnd = now + days * DAY_MS;

  const events: MacroEvent[] = [
    ...buildFomcEvents(now, windowEnd),
    ...buildNfpEvents(now, windowEnd),
    ...buildWitchUsEvents(now, windowEnd),
    ...buildWitchKrEvents(now, windowEnd),
  ].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  return res.json({ events, asOf: new Date().toISOString() });
});

export default router;
