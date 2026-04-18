import {
  EntryRequest,
  Portfolio,
  ValidationResult,
} from "@/types/portfolio";
import {
  ABSOLUTE_LIMITS,
  CATEGORY_LIMITS,
  SECTOR_LIMITS,
  IMPULSE_TRIGGER_WORDS,
  IMPULSE_BLOCK_THRESHOLD,
} from "@/constants/rules";

export interface ValidationContext {
  /** 최근 매수 평균 사이즈 (원/USD 모두 동일 단위로 환산해서 전달) */
  avgPositionSize: number;
}

export function validateEntry(
  req:       EntryRequest,
  portfolio: Portfolio,
  ctx:       ValidationContext,
): ValidationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let cooldown: number = ABSOLUTE_LIMITS.COOLDOWN_HOURS_NORMAL;

  // BLOCKER 1 — 필수 입력값
  if (!req.entryReason || req.entryReason.trim().length < ABSOLUTE_LIMITS.MIN_ENTRY_REASON_LENGTH) {
    blockers.push(`매수 근거 ${ABSOLUTE_LIMITS.MIN_ENTRY_REASON_LENGTH}자 이상 필수`);
  }
  if (req.stopLoss === null || req.stopLoss <= 0) {
    blockers.push("손절가 미설정");
  }
  if (!req.takeProfitLevels || req.takeProfitLevels.length === 0) {
    blockers.push("익절 구간 미설정");
  }

  // 스펙: req.targetAmount / portfolio.totalValue
  // (cash + 기존 포지션 합계 대비) — 신규 진입 자체는 totalValue를 키우지 않음
  const newPositionPercent =
    portfolio.totalValue > 0 ? (req.targetAmount / portfolio.totalValue) * 100 : 100;

  // BLOCKER 2 — 단일 종목 절대 상한
  if (newPositionPercent > ABSOLUTE_LIMITS.MAX_SINGLE_POSITION) {
    blockers.push(
      `단일 종목 ${ABSOLUTE_LIMITS.MAX_SINGLE_POSITION}% 초과 (요청 ${newPositionPercent.toFixed(1)}%)`,
    );
  }

  // BLOCKER 3 — 카테고리 단일 종목 상한
  const catLimit = CATEGORY_LIMITS.find(c => c.category === req.category);
  if (catLimit && newPositionPercent > catLimit.maxSinglePosition) {
    blockers.push(
      `${req.category} 단일 종목 상한 ${catLimit.maxSinglePosition}% 초과`,
    );
  }

  // BLOCKER 4 — 섹터 집중도
  for (const sector of req.sectors) {
    const current = portfolio.sectorAllocation[sector] ?? 0;
    const next    = current + newPositionPercent;
    const limit   = SECTOR_LIMITS.find(s => s.sector === sector);
    if (limit && next > limit.maxAllocation) {
      blockers.push(
        `${sector} 섹터 상한 ${limit.maxAllocation}% 초과 (예정 ${next.toFixed(1)}%)`,
      );
    }
  }

  // BLOCKER 5 — 월간 손실 한도
  if (portfolio.monthlyPnLPercent <= ABSOLUTE_LIMITS.MONTHLY_LOSS_WARNING) {
    blockers.push(
      `월간 손실 ${portfolio.monthlyPnLPercent.toFixed(1)}% — 신규 진입 중단 구간`,
    );
  }

  // BLOCKER 6 — 뇌동 체크리스트
  const impulseHits = req.userAckImpulseChecklist.filter(Boolean).length;
  if (impulseHits >= IMPULSE_BLOCK_THRESHOLD) {
    blockers.push(
      `뇌동 체크리스트 ${impulseHits}개 해당 — 진입 보류 권장`,
    );
  }

  // BLOCKER 7 — 감정어 검출
  const emotional = IMPULSE_TRIGGER_WORDS.filter(w => req.entryReason.includes(w));
  if (emotional.length >= 2) {
    blockers.push(
      `감정어 과다 사용: ${emotional.join(", ")} — 근거 재작성 필요`,
    );
  }

  // 쿨다운
  if (ctx.avgPositionSize > 0) {
    const multiplier = req.targetAmount / ctx.avgPositionSize;
    if (multiplier > ABSOLUTE_LIMITS.MAX_POSITION_MULTIPLIER) {
      cooldown = ABSOLUTE_LIMITS.COOLDOWN_HOURS_LARGE;
      warnings.push(
        `평균 사이즈의 ${multiplier.toFixed(1)}배 — 48시간 쿨다운 적용`,
      );
    }
  }

  // 경고: 카테고리 비중 편향
  const currentCat = portfolio.categoryAllocation[req.category] ?? 0;
  const targetCat  = catLimit?.targetAllocation ?? 0;
  if (targetCat > 0 && currentCat + newPositionPercent > targetCat * 1.2) {
    warnings.push(
      `${req.category} 카테고리 목표 비중 초과 (목표 ${targetCat}%, 예정 ${(currentCat + newPositionPercent).toFixed(1)}%)`,
    );
  }

  return {
    passed:                 blockers.length === 0,
    blockers,
    warnings,
    requiredCooldownHours:  cooldown,
  };
}
