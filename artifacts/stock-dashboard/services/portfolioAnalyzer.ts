import {
  Portfolio,
  Position,
  HealthCheck,
  Issue,
  Sector,
} from "@/types/portfolio";
import {
  ABSOLUTE_LIMITS,
  CATEGORY_LIMITS,
  SECTOR_LIMITS,
} from "@/constants/rules";

function positionValue(p: Position, fxRateUSDKRW: number): number {
  const v = p.avgPrice * p.quantity;
  return p.currency === "USD" ? v * fxRateUSDKRW : v;
}

export function analyzePortfolio(portfolio: Portfolio, fxRateUSDKRW: number = 1400): HealthCheck {
  const issues: Issue[] = [];
  let score = 100;

  if (portfolio.totalValue <= 0) {
    return {
      healthScore: 100,
      issues: [],
      recommendations: ["보유 종목을 등록하면 헬스 스코어가 계산됩니다."],
    };
  }

  // 1. 단일 종목 집중도
  for (const pos of portfolio.positions) {
    const pct = (positionValue(pos, fxRateUSDKRW) / portfolio.totalValue) * 100;
    if (pct > ABSOLUTE_LIMITS.MAX_SINGLE_POSITION) {
      issues.push({
        severity:        "CRITICAL",
        category:        "CONCENTRATION",
        message:         `${pos.name} ${pct.toFixed(1)}% (상한 ${ABSOLUTE_LIMITS.MAX_SINGLE_POSITION}% 초과)`,
        suggestedAction: `${(pct - ABSOLUTE_LIMITS.MAX_SINGLE_POSITION).toFixed(1)}%p 이상 익절 또는 매도`,
      });
      score -= 20;
    } else if (pct > 20) {
      issues.push({
        severity: "WARN",
        category: "CONCENTRATION",
        message:  `${pos.name} ${pct.toFixed(1)}% (주의 구간)`,
      });
      score -= 5;
    }
  }

  // 2. 섹터 집중도
  for (const [sector, alloc] of Object.entries(portfolio.sectorAllocation)) {
    const limit = SECTOR_LIMITS.find(s => s.sector === sector as Sector);
    if (limit && (alloc as number) > limit.maxAllocation) {
      issues.push({
        severity: "WARN",
        category: "SECTOR",
        message:  `${sector} 섹터 ${(alloc as number).toFixed(1)}% (상한 ${limit.maxAllocation}%)`,
      });
      score -= 10;
    }
  }

  // 3. 카테고리 비중 편향
  for (const cl of CATEGORY_LIMITS) {
    const alloc = portfolio.categoryAllocation[cl.category] ?? 0;
    if (alloc > cl.targetAllocation * 1.3) {
      issues.push({
        severity: "WARN",
        category: "CONCENTRATION",
        message:  `${cl.category} ${alloc.toFixed(1)}% (목표 ${cl.targetAllocation}% 대비 과대)`,
      });
      score -= 5;
    }
  }

  // 4. 뇌동 포지션
  const impulse = portfolio.positions.filter(p => p.isImpulseBuy);
  if (impulse.length > 0) {
    const totalPct = impulse.reduce(
      (s, p) => s + (positionValue(p, fxRateUSDKRW) / portfolio.totalValue) * 100, 0,
    );
    if (totalPct > 10) {
      issues.push({
        severity:        "CRITICAL",
        category:        "IMPULSE",
        message:         `뇌동 포지션 ${totalPct.toFixed(1)}% — 정리 필요`,
        suggestedAction: "각 종목별 정리 플랜 수립",
      });
      score -= 15;
    } else {
      issues.push({
        severity: "INFO",
        category: "IMPULSE",
        message:  `뇌동 포지션 ${impulse.length}건 잔존 (${totalPct.toFixed(1)}%)`,
      });
      score -= 3;
    }
  }

  // 5. 월간 손실
  if (portfolio.monthlyPnLPercent < ABSOLUTE_LIMITS.MONTHLY_LOSS_CRITICAL) {
    issues.push({
      severity: "CRITICAL",
      category: "LOSS",
      message:  `월간 손실 ${portfolio.monthlyPnLPercent.toFixed(1)}% — 포트 재점검`,
    });
    score -= 20;
  } else if (portfolio.monthlyPnLPercent < ABSOLUTE_LIMITS.MONTHLY_LOSS_WARNING) {
    issues.push({
      severity: "WARN",
      category: "LOSS",
      message:  `월간 손실 ${portfolio.monthlyPnLPercent.toFixed(1)}% — 신규 진입 자제`,
    });
    score -= 10;
  }

  // 6. 손절선 미설정
  const noStop = portfolio.positions.filter(p => !p.stopLoss || p.stopLoss <= 0);
  if (noStop.length > 0) {
    issues.push({
      severity:        "CRITICAL",
      category:        "RULE_VIOLATION",
      message:         `손절선 미설정 종목 ${noStop.length}개`,
      suggestedAction: "즉시 손절선 지정",
    });
    score -= 15;
  }

  return {
    healthScore: Math.max(0, score),
    issues,
    recommendations: generateRecommendations(issues),
  };
}

function generateRecommendations(issues: Issue[]): string[] {
  const recs: string[] = [];
  if (issues.some(i => i.category === "CONCENTRATION" && i.severity === "CRITICAL")) {
    recs.push("단일 종목 25% 초과 종목부터 즉시 분할 매도하세요.");
  }
  if (issues.some(i => i.category === "IMPULSE")) {
    recs.push("뇌동 라벨이 붙은 종목은 별도 정리 플랜이 필요합니다.");
  }
  if (issues.some(i => i.category === "LOSS")) {
    recs.push("월간 손실 구간에선 신규 진입을 멈추고 보유 종목을 점검하세요.");
  }
  if (issues.some(i => i.category === "RULE_VIOLATION")) {
    recs.push("손절선이 없는 종목은 평단 -7% 기본값으로라도 즉시 설정하세요.");
  }
  if (recs.length === 0) {
    recs.push("핵심 룰을 잘 지키고 있습니다. 다음 주간 점검까지 유지하세요.");
  }
  return recs;
}
