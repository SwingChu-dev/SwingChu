/**
 * 오늘의 AI 인사이트 — 외부 API 호출 없이 로컬 데이터 조합으로 도출.
 *
 * 입력:
 *   - 현재 시장 국면 (useMarketIntel)
 *   - regime별 사용자 청산 패턴 (regimeStatsFromClosed)
 *   - 다가오는 매크로 이벤트 (useMacroEvents)
 *
 * 출력: 1~2 라인의 actionable 한 줄 요약 + 보조 디테일
 */
import { playbookFor, type RegimeKey } from "@/utils/regimePlaybook";
import type { CyclePhase } from "@/hooks/useMarketIntel";
import type { MacroEvent } from "@/hooks/useMacroEvents";
import type { RegimeStat } from "@/services/weeklyReport";

export interface DailyInsight {
  /** 카드 메인 라인 (한 줄) */
  headline: string;
  /** 보조 라인 — 본인 데이터 기반이거나 임박 이벤트 강조 */
  detail:   string | null;
  /** 색감 강도 — UI에서 border 강조 등에 사용 */
  intensity: "high" | "medium" | "low";
}

const REGIME_KR: Record<RegimeKey, string> = {
  BULL_EARLY: "회복·불장 초입",
  BULL_HOT:   "과열·불장 후반",
  SIDEWAYS:   "횡보·정체",
  BEAR:       "하락·공포",
};

export function buildDailyInsight(
  phase:     CyclePhase | null,
  regimeHistory: RegimeStat[],
  macroEvents: MacroEvent[],
): DailyInsight {
  if (!phase) {
    return {
      headline:  "AI가 시장을 분석 중입니다",
      detail:    null,
      intensity: "low",
    };
  }

  const playbook = playbookFor(phase);
  const headline = `현재 ${playbook.label} — ${playbook.summary}`;

  // 1순위: 14일 이내 HIGH severity 매크로 이벤트
  const imminentHigh = macroEvents.find(
    (e) => e.severity === "HIGH" && e.daysUntil >= 0 && e.daysUntil <= 14,
  );
  if (imminentHigh) {
    return {
      headline,
      detail:    `${imminentHigh.daysUntil <= 0 ? "오늘" : `D-${imminentHigh.daysUntil}`} ${imminentHigh.title} 임박. 신규 진입 사이즈 줄이는 게 정공.`,
      intensity: "high",
    };
  }

  // 2순위: 본인 같은 regime 진입 패턴이 약한 경우 (승률 ≤45% 또는 평균 -% 손실)
  const myRegime = regimeHistory.find((r) => r.regime === playbook.key);
  if (myRegime && myRegime.count >= 3) {
    if (myRegime.winRate <= 0.45 || myRegime.avgPnLPct < 0) {
      return {
        headline,
        detail:    `본인 ${REGIME_KR[playbook.key]} 진입 ${myRegime.count}건 — 승률 ${(myRegime.winRate * 100).toFixed(0)}% / 평균 ${myRegime.avgPnLPct >= 0 ? "+" : ""}${myRegime.avgPnLPct.toFixed(1)}%. 사이즈 절반·진입 자제 검토.`,
        intensity: "high",
      };
    }
    if (myRegime.winRate >= 0.6 && myRegime.avgPnLPct >= 3) {
      return {
        headline,
        detail:    `본인 ${REGIME_KR[playbook.key]} 진입 ${myRegime.count}건 — 승률 ${(myRegime.winRate * 100).toFixed(0)}% / 평균 +${myRegime.avgPnLPct.toFixed(1)}%. 본인이 강한 국면, 사이즈 정상 유지.`,
        intensity: "medium",
      };
    }
  }

  // 3순위: 핵심 진입 룰 1개
  const entryRule = playbook.rules.entry[0];
  return {
    headline,
    detail:    entryRule ? `오늘의 진입 룰: ${entryRule}` : null,
    intensity: "medium",
  };
}
