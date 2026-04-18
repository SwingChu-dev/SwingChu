import {
  Position, CooldownSave, Portfolio, Category, Sector,
  CATEGORY_LABEL, SECTOR_LABEL,
} from "@/types/portfolio";
import { API_BASE } from "@/utils/apiBase";

export interface CoachComment {
  praise:   string;
  warning:  string;
  nextWeek: string[];
  provider?: "claude" | "gemini";
}

export async function fetchWeeklyCoach(
  report: WeeklyReport,
  portfolio: Portfolio,
  healthScore: number,
): Promise<CoachComment> {
  const body = {
    newPositions:         report.newPositions.length,
    cooldownSaves:        report.cooldownSaves.length,
    totalSavedKRW:        report.totalSavedKRW,
    firedStopLossCount:   report.firedStopLossCount,
    firedTakeProfitCount: report.firedTakeProfitCount,
    impulseCount:         report.impulseCount,
    monthlyPnLPercent:    portfolio.monthlyPnLPercent,
    healthScore,
    topCategories:        report.topCategories.map(c => ({ label: c.label, pct: c.pct })),
    topSectors:           report.topSectors.map(s => ({ label: s.label, pct: s.pct })),
    recentTickers:        report.newPositions.map(p => p.ticker.toUpperCase()),
  };
  const resp = await fetch(`${API_BASE}/weekly-coach`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`coach ${resp.status}`);
  return resp.json();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface WeeklyReport {
  period:               { from: number; to: number };
  newPositions:         Position[];
  cooldownSaves:        CooldownSave[];
  totalSavedKRW:        number;
  firedStopLossCount:   number;
  firedTakeProfitCount: number;
  impulseCount:         number;
  topCategories:        Array<{ category: Category; label: string; pct: number }>;
  topSectors:           Array<{ sector: Sector;     label: string; pct: number }>;
  highlights:           string[];
  warnings:             string[];
}

export function buildWeeklyReport(
  portfolio:     Portfolio,
  cooldownSaves: CooldownSave[],
  now:           number = Date.now(),
): WeeklyReport {
  const from = now - WEEK_MS;

  const newPositions = portfolio.positions
    .filter(p => p.entryDate >= from)
    .sort((a, b) => b.entryDate - a.entryDate);

  const recentSaves = cooldownSaves
    .filter(s => s.createdAt >= from)
    .sort((a, b) => b.createdAt - a.createdAt);

  const totalSavedKRW = recentSaves.reduce(
    (s, x) => s + (x.estimatedSaved ?? 0), 0,
  );

  const firedStopLossCount = portfolio.positions
    .filter(p => p.firedStopLossAt && p.firedStopLossAt >= from).length;

  const firedTakeProfitCount = portfolio.positions
    .filter(p => p.firedTakeProfitAlerts && p.firedTakeProfitAlerts.length > 0)
    .reduce((s, p) => s + (p.firedTakeProfitAlerts?.length ?? 0), 0);

  const impulseCount = portfolio.positions.filter(p => p.isImpulseBuy).length;

  const topCategories = (Object.entries(portfolio.categoryAllocation) as Array<[Category, number]>)
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, pct]) => ({ category, label: CATEGORY_LABEL[category], pct }));

  const topSectors = (Object.entries(portfolio.sectorAllocation) as Array<[Sector, number]>)
    .filter(([_, v]) => (v ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 5)
    .map(([sector, pct]) => ({ sector, label: SECTOR_LABEL[sector], pct: pct ?? 0 }));

  const highlights: string[] = [];
  const warnings:   string[] = [];

  if (recentSaves.length > 0) {
    highlights.push(`이번 주 뇌동 진입 ${recentSaves.length}건을 차단했습니다.`);
    if (totalSavedKRW > 0) {
      highlights.push(`추정 절약 손실: 약 ${Math.round(totalSavedKRW / 10000).toLocaleString()}만 원.`);
    }
  }
  if (firedTakeProfitCount > 0) {
    highlights.push(`익절 알림 ${firedTakeProfitCount}회 발사 — 분할 익절 원칙 점검.`);
  }

  if (firedStopLossCount > 0) {
    warnings.push(`손절 알림 ${firedStopLossCount}회 — 진입 근거 회고 필요.`);
  }
  if (impulseCount >= 2) {
    warnings.push(`뇌동 라벨 포지션 ${impulseCount}개 — 비중 축소 검토.`);
  }
  if (portfolio.monthlyPnLPercent <= -5) {
    warnings.push(`이달 손실 ${portfolio.monthlyPnLPercent.toFixed(1)}% — 신규 진입 자제.`);
  }
  if (newPositions.length === 0 && recentSaves.length === 0) {
    highlights.push("이번 주 신규 진입 없음 — 시장 관망도 전략입니다.");
  }

  return {
    period: { from, to: now },
    newPositions,
    cooldownSaves: recentSaves,
    totalSavedKRW,
    firedStopLossCount,
    firedTakeProfitCount,
    impulseCount,
    topCategories,
    topSectors,
    highlights,
    warnings,
  };
}
