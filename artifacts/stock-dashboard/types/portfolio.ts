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
