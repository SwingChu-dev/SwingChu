/**
 * 오늘의 AI 인사이트 — 외부 API 호출 없이 로컬 데이터 조합으로 도출.
 *
 * 입력:
 *   - 현재 시장 국면 (useMarketIntel)
 *   - 다가오는 매크로 이벤트 (useMacroEvents)
 *
 * 출력: 1~2 라인의 actionable 한 줄 요약 + 보조 디테일
 */
import { playbookFor } from "@/utils/regimePlaybook";
import type { CyclePhase } from "@/hooks/useMarketIntel";
import type { MacroEvent } from "@/hooks/useMacroEvents";

export interface DailyInsight {
  /** 카드 메인 라인 (한 줄) */
  headline: string;
  /** 보조 라인 — 임박 이벤트 강조 또는 진입 룰 */
  detail:   string | null;
  /** 색감 강도 — UI에서 border 강조 등에 사용 */
  intensity: "high" | "medium" | "low";
}

export function buildDailyInsight(
  phase:     CyclePhase | null,
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

  // 2순위: 핵심 진입 룰 1개
  const entryRule = playbook.rules.entry[0];
  return {
    headline,
    detail:    entryRule ? `오늘의 진입 룰: ${entryRule}` : null,
    intensity: "medium",
  };
}
