import { Router } from "express";

const router = Router();

// 공식 FOMC 일정 (2026-2027). 결정일 = 2일 회의의 둘째 날 (보통 발표 시각 14:00 ET)
// 출처: Federal Reserve official calendar
const FOMC_MEETINGS: Array<{ start: string; decisionDate: string; spr: boolean }> = [
  { start: "2026-01-27", decisionDate: "2026-01-28", spr: false },
  { start: "2026-03-17", decisionDate: "2026-03-18", spr: true  },
  { start: "2026-04-28", decisionDate: "2026-04-29", spr: false },
  { start: "2026-06-09", decisionDate: "2026-06-10", spr: true  },
  { start: "2026-07-28", decisionDate: "2026-07-29", spr: false },
  { start: "2026-09-15", decisionDate: "2026-09-16", spr: true  },
  { start: "2026-10-27", decisionDate: "2026-10-28", spr: false },
  { start: "2026-12-08", decisionDate: "2026-12-09", spr: true  },
  { start: "2027-01-26", decisionDate: "2027-01-27", spr: false },
  { start: "2027-03-16", decisionDate: "2027-03-17", spr: true  },
  { start: "2027-04-27", decisionDate: "2027-04-28", spr: false },
  { start: "2027-06-15", decisionDate: "2027-06-16", spr: true  },
];

router.get("/fomc", (_req, res) => {
  const now = Date.now();
  const upcoming = FOMC_MEETINGS
    .map(m => ({ ...m, decisionMs: new Date(m.decisionDate + "T18:00:00Z").getTime() }))
    .filter(m => m.decisionMs >= now - 24 * 3600_000)  // 결정일 1일 후까지
    .sort((a, b) => a.decisionMs - b.decisionMs);

  const next = upcoming[0] ?? null;
  const daysUntil = next ? Math.ceil((next.decisionMs - now) / (24 * 3600_000)) : null;

  return res.json({
    nextMeeting: next ? {
      startDate: next.start,
      decisionDate: next.decisionDate,
      hasSEP: next.spr,           // Summary of Economic Projections (점도표)
      daysUntilDecision: daysUntil,
    } : null,
    upcoming: upcoming.slice(0, 4).map(m => ({
      startDate: m.start, decisionDate: m.decisionDate, hasSEP: m.spr,
      daysUntilDecision: Math.ceil((m.decisionMs - now) / (24 * 3600_000)),
    })),
    asOf: new Date().toISOString(),
  });
});

export default router;
