import type { ClosedTrade } from "@/types/portfolio";

/**
 * 한국 양도소득세 계산.
 *
 * 규칙 (2026 기준 일반 투자자):
 * - 해외주식: 양도소득세 22% (소득세 20% + 지방세 2%). 연 250만원 기본공제. 손익통산.
 * - 국내주식: 대주주 아닌 일반 투자자는 양도세 비과세 (참고로 손익만 표시).
 *   거래세 0.18% (코스피/코스닥 매도가 기준) 추정.
 *
 * 한계:
 * - 청산 시점 환율로 KRW 환산된 realizedPnLKRW를 그대로 사용. 실제 신고 시
 *   국세청 고시 환율과 다를 수 있음 → 참고용.
 * - 대주주(보유율·시총 기준)는 미반영.
 * - 금투세(금융투자소득세) 시행 시 룰이 바뀌므로 그때 업데이트 필요.
 */

export const OVERSEAS_TAX_RATE = 0.22;
export const OVERSEAS_DEDUCTION_KRW = 2_500_000;
export const DOMESTIC_TX_TAX_RATE = 0.0018;

export interface OverseasSummary {
  totalProfit:  number;
  totalLoss:    number;  // 음수 합계
  netGain:      number;
  deduction:    number;
  taxableGain:  number;
  taxRate:      number;
  taxAmount:    number;
  tradeCount:   number;
}

export interface DomesticSummary {
  totalProfit:     number;
  totalLoss:       number;
  netGain:         number;
  tradeCount:      number;
  estTransactionTax: number;
}

export interface YearlyTaxSummary {
  year:     number;
  overseas: OverseasSummary;
  domestic: DomesticSummary;
}

function isDomestic(market: ClosedTrade["market"]): boolean {
  return market === "KOSPI" || market === "KOSDAQ";
}

export function listYearsFromTrades(trades: ClosedTrade[]): number[] {
  const years = new Set<number>();
  for (const t of trades) years.add(new Date(t.exitDate).getFullYear());
  return [...years].sort((a, b) => b - a);
}

export function calculateYearlyTax(
  trades: ClosedTrade[],
  year: number,
): YearlyTaxSummary {
  const yearTrades = trades.filter(
    (t) => new Date(t.exitDate).getFullYear() === year,
  );

  const overseasTrades = yearTrades.filter((t) => !isDomestic(t.market));
  const domesticTrades = yearTrades.filter((t) => isDomestic(t.market));

  const overseasProfit = overseasTrades
    .filter((t) => t.realizedPnLKRW > 0)
    .reduce((s, t) => s + t.realizedPnLKRW, 0);
  const overseasLoss = overseasTrades
    .filter((t) => t.realizedPnLKRW < 0)
    .reduce((s, t) => s + t.realizedPnLKRW, 0);
  const overseasNetGain = overseasProfit + overseasLoss;
  const overseasTaxable = Math.max(0, overseasNetGain - OVERSEAS_DEDUCTION_KRW);
  const overseasTax = overseasTaxable * OVERSEAS_TAX_RATE;

  const domesticProfit = domesticTrades
    .filter((t) => t.realizedPnLKRW > 0)
    .reduce((s, t) => s + t.realizedPnLKRW, 0);
  const domesticLoss = domesticTrades
    .filter((t) => t.realizedPnLKRW < 0)
    .reduce((s, t) => s + t.realizedPnLKRW, 0);
  const domesticNet = domesticProfit + domesticLoss;
  const domesticEstTxTax = domesticTrades.reduce(
    (s, t) => s + t.exitPrice * t.quantitySold * DOMESTIC_TX_TAX_RATE,
    0,
  );

  return {
    year,
    overseas: {
      totalProfit: overseasProfit,
      totalLoss:   overseasLoss,
      netGain:     overseasNetGain,
      deduction:   OVERSEAS_DEDUCTION_KRW,
      taxableGain: overseasTaxable,
      taxRate:     OVERSEAS_TAX_RATE,
      taxAmount:   overseasTax,
      tradeCount:  overseasTrades.length,
    },
    domestic: {
      totalProfit:     domesticProfit,
      totalLoss:       domesticLoss,
      netGain:         domesticNet,
      tradeCount:      domesticTrades.length,
      estTransactionTax: domesticEstTxTax,
    },
  };
}
