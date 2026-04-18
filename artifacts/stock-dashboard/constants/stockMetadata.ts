import { Category, Sector } from "@/types/portfolio";

export interface StockMetadata {
  category:    Category;
  sectors:     Sector[];
  actionLabel?: string;
}

/**
 * 종목별 카테고리 및 섹터 매핑.
 * 아직 등록되지 않은 종목은 기본값 (B_EVENT / 빈 섹터)으로 처리.
 */
export const STOCK_METADATA: Record<string, StockMetadata> = {
  // ── 카테고리 A: 코어 장기 ──
  nvda:           { category: "A_CORE", sectors: ["SEMICONDUCTOR", "BIGTECH_AI"] },
  googl:          { category: "A_CORE", sectors: ["BIGTECH_AI"] },
  msft:           { category: "A_CORE", sectors: ["BIGTECH_AI"] },
  amzn:           { category: "A_CORE", sectors: ["BIGTECH_AI"] },
  avgo:           { category: "A_CORE", sectors: ["SEMICONDUCTOR", "BIGTECH_AI"] },
  hdhi:           { category: "A_CORE", sectors: ["SHIPBUILDING"] },
  hanwha:         { category: "A_CORE", sectors: ["DEFENSE"] },
  doosan:         { category: "A_CORE", sectors: ["NUCLEAR"] },
  hyundairotem:   { category: "A_CORE", sectors: ["DEFENSE"] },
  hdelectric:     { category: "A_CORE", sectors: ["POWER_INFRA"] },
  ligdefense:     { category: "A_CORE", sectors: ["DEFENSE"] },

  // ── 카테고리 B: 중기 이벤트 ──
  skhynix: {
    category: "B_EVENT",
    sectors: ["SEMICONDUCTOR"],
    actionLabel: "뇌동 포지션 · 정리 모드",
  },
  sandisk: {
    category: "B_EVENT",
    sectors: ["SEMICONDUCTOR"],
    actionLabel: "익절 완료 · 재진입 자제",
  },
  pltr:   { category: "B_EVENT", sectors: ["BIGTECH_AI", "DEFENSE"] },
  crm:    { category: "B_EVENT", sectors: ["BIGTECH_AI"] },

  // ── 카테고리 C: 단기 역발상 ──
  eon: {
    category: "C_CONTRARIAN",
    sectors: ["ENERGY", "MICROCAP"],
    actionLabel: "추가매수 금지 · WTI 이탈 시 손절",
  },
  batl: {
    category: "C_CONTRARIAN",
    sectors: ["ENERGY", "MICROCAP"],
    actionLabel: "추가매수 금지 · WTI $75 이탈 시 손절",
  },
  lmt: {
    category: "C_CONTRARIAN",
    sectors: ["DEFENSE"],
    actionLabel: "방향성 확인 대기",
  },

  // ── 카테고리 D: 투기 테마 ──
  ionq:   { category: "D_SPECULATIVE", sectors: ["QUANTUM"] },
  bwxt:   { category: "D_SPECULATIVE", sectors: ["NUCLEAR", "DEFENSE"] },
  bnai: {
    category: "D_SPECULATIVE",
    sectors: ["MICROCAP"],
    actionLabel: "투자 X · 관찰만",
  },

  // ── 기존 더미 종목 (매핑만 유지, 추후 정리) ──
  samsung:       { category: "A_CORE",        sectors: ["SEMICONDUCTOR"] },
  hyundai:       { category: "B_EVENT",       sectors: ["AUTO"] },
  woritech:      { category: "D_SPECULATIVE", sectors: ["MICROCAP", "NUCLEAR"] },
  xel:           { category: "A_CORE",        sectors: ["ENERGY", "POWER_INFRA"] },
  gev:           { category: "B_EVENT",       sectors: ["ENERGY", "NUCLEAR"] },
  hanwhaocean:   { category: "A_CORE",        sectors: ["SHIPBUILDING", "DEFENSE"] },
  samsunghi:     { category: "A_CORE",        sectors: ["SHIPBUILDING"] },
  samsungsdi:    { category: "B_EVENT",       sectors: ["BATTERY"] },
  hyundaimarine: { category: "C_CONTRARIAN",  sectors: ["INSURANCE"] },
};

export function getStockMetadata(stockId: string): StockMetadata {
  return STOCK_METADATA[stockId] ?? { category: "B_EVENT", sectors: [] };
}
