export type Category = "A_CORE" | "B_EVENT" | "C_CONTRARIAN" | "D_SPECULATIVE";

export const CATEGORY_LABEL: Record<Category, string> = {
  A_CORE:        "코어 장기",
  B_EVENT:       "중기 이벤트",
  C_CONTRARIAN:  "단기 역발상",
  D_SPECULATIVE: "투기 테마",
};

export const CATEGORY_COLOR: Record<Category, string> = {
  A_CORE:        "#22C55E",
  B_EVENT:       "#F59E0B",
  C_CONTRARIAN:  "#FF6B00",
  D_SPECULATIVE: "#F04452",
};

export type Sector =
  | "SEMICONDUCTOR"
  | "ENERGY"
  | "DEFENSE"
  | "SHIPBUILDING"
  | "NUCLEAR"
  | "BIGTECH_AI"
  | "QUANTUM"
  | "MICROCAP"
  | "POWER_INFRA"
  | "BATTERY"
  | "AUTO"
  | "INSURANCE";

export const SECTOR_LABEL: Record<Sector, string> = {
  SEMICONDUCTOR: "반도체",
  ENERGY:        "에너지",
  DEFENSE:       "방산",
  SHIPBUILDING:  "조선",
  NUCLEAR:       "원전",
  BIGTECH_AI:    "AI/빅테크",
  QUANTUM:       "양자컴퓨팅",
  MICROCAP:      "마이크로캡",
  POWER_INFRA:   "전력인프라",
  BATTERY:       "배터리",
  AUTO:          "자동차",
  INSURANCE:     "보험",
};

export interface Position {
  id:                  string;
  ticker:              string;
  name:                string;
  market:              "KOSPI" | "KOSDAQ" | "NASDAQ";
  category:            Category;
  sectors:             Sector[];
  avgPrice:            number;
  quantity:            number;
  currency:            "KRW" | "USD";
  entryDate:           number;
  entryReason:         string;
  stopLoss:            number;
  takeProfitLevels:    number[];
  executedTakeProfits: number[];
  isImpulseBuy:        boolean;
  isInLiquidationMode: boolean;
  notes:               string[];
  /** 진입 시점 시장 국면 (BULL_EARLY / BULL_HOT / SIDEWAYS / BEAR) */
  entryRegime?:        "BULL_EARLY" | "BULL_HOT" | "SIDEWAYS" | "BEAR";
  /** 손절 알림 발사 시각 (중복 방지) */
  firedStopLossAt?:    number;
  /** 알림 발사된 익절 레벨 (예: [3, 5]) */
  firedTakeProfitAlerts?: number[];
}

export interface Portfolio {
  totalValue:          number;
  cashBalance:         number;
  positions:           Position[];
  categoryAllocation:  Record<Category, number>;
  sectorAllocation:    Partial<Record<Sector, number>>;
  monthlyPnL:          number;
  monthlyPnLPercent:   number;
  monthStartValue:     number;
}

export interface CategoryLimit {
  category:           Category;
  targetAllocation:   number;
  maxSinglePosition:  number;
}

export interface SectorLimit {
  sector:         Sector;
  maxAllocation:  number;
}

export interface EntryRequest {
  ticker:                   string;
  name:                     string;
  category:                 Category;
  sectors:                  Sector[];
  targetAmount:             number;
  entryReason:              string;
  stopLoss:                 number | null;
  takeProfitLevels:         number[];
  userAckImpulseChecklist:  boolean[];
}

export interface ValidationResult {
  passed:                  boolean;
  blockers:                string[];
  warnings:                string[];
  requiredCooldownHours:   number;
}

export interface PendingEntry {
  id:               string;
  request:          EntryRequest;
  createdAt:        number;
  cooldownUntil:    number;
  status:           "PENDING" | "APPROVED" | "CANCELLED" | "EXECUTED";
  notificationId?:  string;
}

export interface CooldownSave {
  id:                 string;
  pendingEntryId:     string;
  ticker:             string;
  targetAmount:       number;
  cancelReason:       string;
  estimatedSaved:     number | null;
  createdAt:          number;
}

export interface Issue {
  severity:         "INFO" | "WARN" | "CRITICAL";
  category:         "CONCENTRATION" | "SECTOR" | "IMPULSE" | "LOSS" | "RULE_VIOLATION";
  message:          string;
  suggestedAction?: string;
}

export interface HealthCheck {
  healthScore:     number;
  issues:          Issue[];
  recommendations: string[];
}

// ── 청산(매도) 기록 ──
export type ExitType =
  | "TAKE_PROFIT_PARTIAL"   // 부분 익절 (사다리)
  | "TAKE_PROFIT_FULL"      // 목표 도달 전량 익절
  | "STOP_LOSS"             // 손절
  | "BREAK_EVEN"            // 본전 청산
  | "DISCRETIONARY";        // 재량 청산 (시나리오 변경/리밸런싱 등)

export const EXIT_TYPE_LABEL: Record<ExitType, string> = {
  TAKE_PROFIT_PARTIAL: "부분 익절",
  TAKE_PROFIT_FULL:    "전량 익절",
  STOP_LOSS:           "손절",
  BREAK_EVEN:          "본전",
  DISCRETIONARY:       "재량 청산",
};

export const EXIT_TYPE_COLOR: Record<ExitType, string> = {
  TAKE_PROFIT_PARTIAL: "#22C55E",
  TAKE_PROFIT_FULL:    "#FF3B30", // 토스 빨강(수익)
  STOP_LOSS:           "#3478F6", // 토스 파랑(손실)
  BREAK_EVEN:          "#A1A1AA",
  DISCRETIONARY:       "#F59E0B",
};

export type DeviationReason = "FOMO" | "FEAR" | "NEWS_REACTION" | "OTHER";

export const DEVIATION_LABEL: Record<DeviationReason, string> = {
  FOMO:          "FOMO (놓칠까봐)",
  FEAR:          "공포 (더 떨어질까봐)",
  NEWS_REACTION: "뉴스 반응",
  OTHER:         "기타",
};

export interface ClosedTrade {
  id:                string;
  /** 매도 시점에 보유 포지션과 연결된 ID (전량 청산 후 삭제돼도 기록은 유지) */
  positionId:        string | null;
  ticker:            string;
  name:              string;
  market:            "KOSPI" | "KOSDAQ" | "NASDAQ";
  category:          Category;
  sectors:           Sector[];
  currency:          "KRW" | "USD";
  /** 진입 정보 (스냅샷) */
  avgEntryPrice:     number;
  entryDate:         number;
  entryReason:       string;
  /** 청산 정보 */
  exitDate:          number;
  exitPrice:         number;
  quantitySold:      number;
  exitType:          ExitType;
  /** 결과 (포지션 통화 기준) */
  realizedPnL:       number;
  /** KRW 환산 (당시 환율) */
  realizedPnLKRW:    number;
  pnlPercent:        number;
  holdingDays:       number;
  /** 사후 메모 */
  followedRules:     boolean;
  deviationReason:   DeviationReason | null;
  deviationNote:     string;
  nextChange:        string;
  isImpulseEntry:    boolean;
  /** 진입 시점 시장 국면 (Position에서 복사) */
  entryRegime?:      "BULL_EARLY" | "BULL_HOT" | "SIDEWAYS" | "BEAR";
}

export interface TradeStats {
  totalCount:        number;
  winCount:          number;
  lossCount:         number;
  breakEvenCount:    number;
  winRate:           number;          // 0–1
  avgWinKRW:         number;
  avgLossKRW:        number;          // 음수 (예: -120,000)
  totalPnLKRW:       number;
  /** 손익비 = avgWin / |avgLoss|. avgLoss==0 일 때 +Infinity */
  payoffRatio:       number;
  /** 기대값(KRW) = winRate * avgWin + (1-winRate) * avgLoss */
  expectancyKRW:     number;
  /** 트레이드당 평균 보유일수 */
  avgHoldingDays:    number;
  /** 원칙 준수 비율 0–1 */
  ruleAdherence:     number;
}
