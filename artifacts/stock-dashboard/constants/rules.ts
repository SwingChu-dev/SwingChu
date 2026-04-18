import { CategoryLimit, SectorLimit } from "@/types/portfolio";

export const CATEGORY_LIMITS: CategoryLimit[] = [
  { category: "A_CORE",        targetAllocation: 60, maxSinglePosition: 20 },
  { category: "B_EVENT",       targetAllocation: 20, maxSinglePosition: 15 },
  { category: "C_CONTRARIAN",  targetAllocation: 12, maxSinglePosition: 10 },
  { category: "D_SPECULATIVE", targetAllocation: 5,  maxSinglePosition: 5  },
];

export const SECTOR_LIMITS: SectorLimit[] = [
  { sector: "SEMICONDUCTOR", maxAllocation: 35 },
  { sector: "ENERGY",        maxAllocation: 20 },
  { sector: "DEFENSE",       maxAllocation: 20 },
  { sector: "SHIPBUILDING",  maxAllocation: 25 },
  { sector: "NUCLEAR",       maxAllocation: 15 },
  { sector: "QUANTUM",       maxAllocation: 5  },
  { sector: "MICROCAP",      maxAllocation: 5  },
  { sector: "BIGTECH_AI",    maxAllocation: 40 },
  { sector: "POWER_INFRA",   maxAllocation: 20 },
  { sector: "BATTERY",       maxAllocation: 15 },
  { sector: "AUTO",          maxAllocation: 15 },
  { sector: "INSURANCE",     maxAllocation: 10 },
];

export const ABSOLUTE_LIMITS = {
  MAX_SINGLE_POSITION:        25,
  COOLDOWN_HOURS_NORMAL:      24,
  COOLDOWN_HOURS_LARGE:       48,
  MAX_POSITION_MULTIPLIER:    1.5,
  MONTHLY_LOSS_WARNING:      -5,
  MONTHLY_LOSS_CRITICAL:    -10,
  STOP_LOSS_DEFAULT:         -7,
  MIN_ENTRY_REASON_LENGTH:  100,
} as const;

export const TAKE_PROFIT_LADDER = [
  { trigger: 3,  sellPercent: 25 },
  { trigger: 5,  sellPercent: 25 },
  { trigger: 8,  sellPercent: 25 },
  { trigger: 15, sellPercent: 25 },
];

export const IMPULSE_TRIGGER_WORDS = [
  "반드시", "확실", "역대급", "무조건", "놓치면",
  "지금 안 사면", "무조건 간다", "오른다", "가즈아",
];

export const IMPULSE_CHECKLIST_ITEMS = [
  "\"놓치면 안 될 것 같다\"는 초조함이 있다 (FOMO)",
  "평소 포지션보다 큰 사이즈를 고려 중이다",
  "매수 근거가 3문장 이상 명확히 설명되지 않는다",
  "손절 가격을 아직 정하지 않았다",
  "\"반드시\", \"확실히\", \"역대급\" 같은 감정어를 쓰고 있다",
  "최근 수익을 많이 낸 후 자신감 과잉 상태다",
  "최근 손실을 회복하고 싶은 심리가 있다",
];

export const IMPULSE_BLOCK_THRESHOLD = 3;
