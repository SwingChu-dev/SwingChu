import {
  ClosedTrade, TradeStats, Category, ExitType, DeviationReason,
} from "@/types/portfolio";

export function computeStats(trades: ClosedTrade[]): TradeStats {
  if (trades.length === 0) {
    return {
      totalCount: 0, winCount: 0, lossCount: 0, breakEvenCount: 0,
      winRate: 0, avgWinKRW: 0, avgLossKRW: 0, totalPnLKRW: 0,
      payoffRatio: 0, expectancyKRW: 0, avgHoldingDays: 0, ruleAdherence: 0,
    };
  }

  const wins   = trades.filter(t => t.realizedPnLKRW >  0);
  const losses = trades.filter(t => t.realizedPnLKRW <  0);
  const evens  = trades.filter(t => t.realizedPnLKRW === 0);

  const totalPnL  = trades.reduce((s, t) => s + t.realizedPnLKRW, 0);
  const avgWin    = wins.length   > 0 ? wins.reduce((s, t) => s + t.realizedPnLKRW, 0) / wins.length     : 0;
  const avgLoss   = losses.length > 0 ? losses.reduce((s, t) => s + t.realizedPnLKRW, 0) / losses.length : 0;
  const winRate   = wins.length / trades.length;
  const payoff    = avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : (avgWin > 0 ? Infinity : 0);
  const expectancy= winRate * avgWin + (1 - winRate) * avgLoss;
  const avgDays   = trades.reduce((s, t) => s + t.holdingDays, 0) / trades.length;
  const adher     = trades.filter(t => t.followedRules).length / trades.length;

  return {
    totalCount:     trades.length,
    winCount:       wins.length,
    lossCount:      losses.length,
    breakEvenCount: evens.length,
    winRate,
    avgWinKRW:      avgWin,
    avgLossKRW:     avgLoss,
    totalPnLKRW:    totalPnL,
    payoffRatio:    payoff,
    expectancyKRW:  expectancy,
    avgHoldingDays: avgDays,
    ruleAdherence:  adher,
  };
}

export function statsByCategory(trades: ClosedTrade[]): Record<Category, TradeStats> {
  const cats: Category[] = ["A_CORE", "B_EVENT", "C_CONTRARIAN", "D_SPECULATIVE"];
  const out = {} as Record<Category, TradeStats>;
  for (const c of cats) out[c] = computeStats(trades.filter(t => t.category === c));
  return out;
}

export function exitTypeBreakdown(trades: ClosedTrade[]): Record<ExitType, { count: number; pnlKRW: number }> {
  const types: ExitType[] = ["TAKE_PROFIT_PARTIAL", "TAKE_PROFIT_FULL", "STOP_LOSS", "BREAK_EVEN", "DISCRETIONARY"];
  const out = {} as Record<ExitType, { count: number; pnlKRW: number }>;
  for (const t of types) {
    const filtered = trades.filter(x => x.exitType === t);
    out[t] = {
      count: filtered.length,
      pnlKRW: filtered.reduce((s, x) => s + x.realizedPnLKRW, 0),
    };
  }
  return out;
}

export function deviationBreakdown(trades: ClosedTrade[]): Array<{ reason: DeviationReason; count: number; pnlKRW: number }> {
  const reasons: DeviationReason[] = ["FOMO", "FEAR", "NEWS_REACTION", "OTHER"];
  return reasons.map(r => {
    const filtered = trades.filter(t => !t.followedRules && t.deviationReason === r);
    return {
      reason: r,
      count:  filtered.length,
      pnlKRW: filtered.reduce((s, x) => s + x.realizedPnLKRW, 0),
    };
  }).filter(x => x.count > 0);
}

export type TimeFilter = "WEEK" | "MONTH" | "QUARTER" | "ALL";

export function filterByTime(trades: ClosedTrade[], filter: TimeFilter): ClosedTrade[] {
  if (filter === "ALL") return trades;
  const now = Date.now();
  const cutoff = filter === "WEEK"   ? now - 7  * 86400_000
              : filter === "MONTH"   ? now - 30 * 86400_000
              :                        now - 90 * 86400_000;
  return trades.filter(t => t.exitDate >= cutoff);
}

// ── 요일별 청산 통계 ───────────────────────────────────────────────────────
// "본인은 어느 요일에 매매가 잘 풀리는가?"를 자기 데이터로 답함.
// 주말 청산은 (시장 휴장이라 거의 없지만) 제외.

export type Dow = 1 | 2 | 3 | 4 | 5;

export interface DowStats {
  dow:         Dow;
  dowLabel:    "월" | "화" | "수" | "목" | "금";
  totalCount:  number;
  winCount:    number;
  winRate:     number;       // 0~1
  avgPnLKRW:   number;
  totalPnLKRW: number;
}

const DOW_DEFS: Array<{ dow: Dow; dowLabel: DowStats["dowLabel"] }> = [
  { dow: 1, dowLabel: "월" },
  { dow: 2, dowLabel: "화" },
  { dow: 3, dowLabel: "수" },
  { dow: 4, dowLabel: "목" },
  { dow: 5, dowLabel: "금" },
];

export function statsByDayOfWeek(trades: ClosedTrade[]): DowStats[] {
  return DOW_DEFS.map(({ dow, dowLabel }) => {
    const subset = trades.filter(t => new Date(t.exitDate).getDay() === dow);
    const wins   = subset.filter(t => t.realizedPnLKRW > 0);
    const totalPnL = subset.reduce((s, t) => s + t.realizedPnLKRW, 0);
    return {
      dow,
      dowLabel,
      totalCount:  subset.length,
      winCount:    wins.length,
      winRate:     subset.length > 0 ? wins.length / subset.length : 0,
      avgPnLKRW:   subset.length > 0 ? totalPnL / subset.length : 0,
      totalPnLKRW: totalPnL,
    };
  }).filter(d => d.totalCount > 0);
}

// ── 매매 패턴 자동 검출 ────────────────────────────────────────────────────
// 청산 기록에서 사용자 본인의 행동 패턴을 추출해 약점을 데이터로 노출.
// "승자 빨리 팔고 패자 오래 쥔다" 같은 클래식 편향이 본인에게도 있는지 확인용.

export type PatternSeverity = "info" | "warn" | "alert";

export interface DetectedPattern {
  id:        string;
  severity:  PatternSeverity;
  title:     string;
  detail:    string;
  /** 정량 근거 (예: "승자 평균 4.2일 / 패자 평균 9.1일"). UI에서 별도 라인으로 표시 */
  evidence:  string;
}

const MIN_TRADES_FOR_PATTERN = 5;

/**
 * 패턴 검출. 청산 기록 5건 미만이면 빈 배열 (의미 있는 분석 불가).
 *
 * 검출 항목:
 * 1. 승자 보유일 < 패자 보유일 — "승자 일찍 매도" 편향
 * 2. 패자 보유일 > 평균*1.5 — "패자 너무 오래 쥠"
 * 3. 손절 알림 발사 후 미청산 — 룰 미준수
 * 4. 같은 deviationReason 반복 — 반복 편향
 * 5. 특정 regime에서만 손실 집중 — 국면 약점
 * 6. 평균 익절 < 평균 손절(절대값) — payoff < 1
 */
export function detectPatterns(trades: ClosedTrade[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (trades.length < MIN_TRADES_FOR_PATTERN) return patterns;

  const wins   = trades.filter(t => t.realizedPnLKRW > 0);
  const losses = trades.filter(t => t.realizedPnLKRW < 0);

  // 1. 승자 빨리 매도 편향 (loss aversion / disposition effect)
  if (wins.length >= 3 && losses.length >= 3) {
    const avgHoldWin  = wins.reduce((s, t) => s + t.holdingDays, 0) / wins.length;
    const avgHoldLoss = losses.reduce((s, t) => s + t.holdingDays, 0) / losses.length;
    if (avgHoldWin < avgHoldLoss * 0.7) {
      patterns.push({
        id: "early-exit-winners",
        severity: "warn",
        title: "승자를 너무 빨리 매도하는 경향",
        detail: "수익 종목은 짧게, 손실 종목은 길게 쥐는 처분효과(disposition effect). 익절 목표를 높이거나 트레일링 스탑으로 추세 끝까지 따라가는 훈련 필요.",
        evidence: `승자 평균 ${avgHoldWin.toFixed(1)}일 보유 / 패자 평균 ${avgHoldLoss.toFixed(1)}일 보유 (격차 ${((avgHoldLoss / avgHoldWin - 1) * 100).toFixed(0)}%)`,
      });
    }
  }

  // 2. payoff ratio < 1 — 손절 폭이 익절 폭보다 큼
  if (wins.length >= 3 && losses.length >= 3) {
    const avgWin  = wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length);
    if (avgWin > 0 && avgLoss > 0 && avgWin < avgLoss) {
      patterns.push({
        id: "negative-payoff",
        severity: "alert",
        title: "손익비 < 1 — 한 번 잃으면 두 번 벌어야 회복",
        detail: "평균 익절 폭이 평균 손절 폭보다 작음. 승률이 높아도 장기적으로 손실 누적. 손절은 더 타이트하게, 익절은 더 길게 가져가는 룰로 재정의 필요.",
        evidence: `평균 익절 +${avgWin.toFixed(1)}% / 평균 손절 -${avgLoss.toFixed(1)}% (손익비 ${(avgWin / avgLoss).toFixed(2)})`,
      });
    }
  }

  // 3. 룰 미준수 비율 높음
  const offRule = trades.filter(t => !t.followedRules);
  if (trades.length >= 5 && offRule.length / trades.length >= 0.4) {
    patterns.push({
      id: "low-rule-adherence",
      severity: offRule.length / trades.length >= 0.6 ? "alert" : "warn",
      title: "원칙 이탈이 잦음",
      detail: "청산 시 \"원칙대로 했다\" 비율이 60% 미만. 진입 시 시나리오를 더 구체적으로 적고, 손절·익절 가격을 미리 입력해 실행 단계에서 판단을 줄이는 훈련.",
      evidence: `${trades.length}건 중 ${offRule.length}건 원칙 이탈 (${Math.round(offRule.length / trades.length * 100)}%)`,
    });
  }

  // 4. 같은 deviation reason 반복
  const devCounts: Record<string, number> = {};
  for (const t of offRule) {
    if (t.deviationReason) {
      devCounts[t.deviationReason] = (devCounts[t.deviationReason] ?? 0) + 1;
    }
  }
  const topDev = Object.entries(devCounts).sort((a, b) => b[1] - a[1])[0];
  if (topDev && topDev[1] >= 3) {
    const labels: Record<string, string> = {
      FOMO: "놓칠까봐(FOMO)",
      FEAR: "공포",
      NEWS_REACTION: "뉴스 반응",
      OTHER: "기타",
    };
    patterns.push({
      id: `repeat-deviation-${topDev[0]}`,
      severity: "warn",
      title: `같은 사유로 ${topDev[1]}번 원칙 이탈`,
      detail: `반복되는 편향은 우연이 아니라 패턴. "${labels[topDev[0]] ?? topDev[0]}" 상황이 또 오면 진입 전 멈춰서 시나리오 재확인하는 룰을 추가.`,
      evidence: `${labels[topDev[0]] ?? topDev[0]} ${topDev[1]}회 반복`,
    });
  }

  // 5. 특정 regime에서 손실 집중
  const tagged = trades.filter(t => t.entryRegime);
  if (tagged.length >= 5) {
    type Regime = NonNullable<ClosedTrade["entryRegime"]>;
    const regimes: Regime[] = ["BULL_EARLY", "BULL_HOT", "SIDEWAYS", "BEAR"];
    const regLabels: Record<Regime, string> = {
      BULL_EARLY: "회복·불장 초입",
      BULL_HOT:   "과열·불장 후반",
      SIDEWAYS:   "횡보·정체",
      BEAR:       "하락·공포",
    };
    for (const r of regimes) {
      const sub = tagged.filter(t => t.entryRegime === r);
      if (sub.length < 3) continue;
      const wr = sub.filter(t => t.realizedPnLKRW > 0).length / sub.length;
      const totalPnL = sub.reduce((s, t) => s + t.realizedPnLKRW, 0);
      if (wr <= 0.35 && totalPnL < 0) {
        patterns.push({
          id: `regime-weakness-${r}`,
          severity: "warn",
          title: `${regLabels[r]} 국면에서 약함`,
          detail: `해당 국면 진입 분의 승률이 35% 이하 + 총 손실. 폭풍의 눈 → 행동 수칙에서 이 국면 룰 다시 확인하고, 사이즈 절반으로 줄이거나 진입 자제 검토.`,
          evidence: `${sub.length}건 / 승률 ${Math.round(wr * 100)}% / 총 ${totalPnL >= 0 ? "+" : ""}${Math.round(totalPnL).toLocaleString()}원`,
        });
      }
    }
  }

  // 6. 손절 알림은 발사됐지만 청산 안 한 종목 비율 (Position 단의 firedStopLoss를 청산 시 잃음)
  // → ClosedTrade에는 firedStopLoss 정보 없음. 룰 이탈 + STOP_LOSS 아닌 청산 타입을 근사로 사용.
  const stopLossExits  = trades.filter(t => t.exitType === "STOP_LOSS");
  const losslessExits  = losses.filter(t => t.exitType !== "STOP_LOSS" && !t.followedRules);
  if (losses.length >= 5 && losslessExits.length / Math.max(1, losses.length) >= 0.5 && stopLossExits.length === 0) {
    patterns.push({
      id: "no-stop-loss-discipline",
      severity: "alert",
      title: "손절 룰이 작동하지 않음",
      detail: "손실 청산 다수가 STOP_LOSS 타입이 아니고 원칙도 이탈. 손절가에 도달했을 때 \"조금만 더\"가 반복되고 있음. 알림 발사 시 자동 청산 룰을 머릿속에 박아두기.",
      evidence: `손실 ${losses.length}건 중 손절 청산 0건, 원칙 이탈 ${losslessExits.length}건`,
    });
  }

  return patterns;
}

