import { Position } from "@/types/portfolio";
import type { LiveQuote } from "@/context/StockPriceContext";

export interface PositionMarket {
  position:        Position;
  quote:           LiveQuote | null;
  /** 현재 시세 (포지션 통화 기준), 없으면 평단 사용 */
  currentPrice:    number;
  /** 평가금액 (포지션 통화 기준) = currentPrice × qty */
  marketValue:     number;
  /** 평가금액 KRW 환산 */
  marketValueKRW:  number;
  /** 평가손익 (포지션 통화) */
  unrealizedPnL:   number;
  /** 평가손익 KRW */
  unrealizedPnLKRW:number;
  /** 손익률 % */
  pnlPercent:      number;
  /** 시세 데이터 사용 가능 여부 */
  hasLivePrice:    boolean;
}

export interface MarketSnapshot {
  positions:           PositionMarket[];
  /** 보유 종목 평가금액 합계 KRW */
  positionsValueKRW:   number;
  /** 평가손익 합계 KRW */
  totalPnLKRW:         number;
  /** 보유 평균 매수금액 합계 KRW (원금) */
  totalCostKRW:        number;
  /** 손익률 % (기준: 보유 원금) */
  totalPnLPercent:     number;
  /** 원화 잔고 */
  cashKRW:             number;
  /** 달러 잔고 */
  cashUSD:             number;
  /** 달러 잔고 KRW 환산 */
  cashUSDinKRW:        number;
  /** 총 자산 = positionsValueKRW + cashKRW + cashUSDinKRW */
  totalAssetKRW:       number;
  /** USD/KRW 환율 사용값 */
  fxRate:              number;
}

export function computeMarket(
  positions:  Position[],
  quotes:     Record<string, LiveQuote>,
  fxRate:     number,
  cashKRW:    number,
  cashUSD:    number,
): MarketSnapshot {
  const items: PositionMarket[] = positions.map(p => {
    const key   = `${p.ticker.toUpperCase()}:${p.market}`;
    const q     = quotes[key] ?? null;
    const live  = q && q.ok && q.price > 0;
    // 시세는 항상 시장 통화: NASDAQ → USD, KOSPI/KOSDAQ → KRW.
    const mktCur: "USD" | "KRW" = p.market === "NASDAQ" ? "USD" : "KRW";
    // 시세 없으면 평단을 시세로 대신하되, 평단 단위(stored currency)에서
    // 시장 통화로 변환: avgPrice 가 KRW 인데 NASDAQ 이면 ÷FX.
    const fallbackCurInMkt = p.currency === mktCur
      ? p.avgPrice
      : (mktCur === "USD" ? p.avgPrice / fxRate : p.avgPrice * fxRate);
    const cur   = live ? q!.price : fallbackCurInMkt;
    const mv    = cur * p.quantity;
    const mvKRW = mktCur === "USD" ? mv * fxRate : mv;
    // 원금은 저장된 통화 그대로 해석.
    const cost    = p.avgPrice * p.quantity;
    const costKRW = p.currency === "USD" ? cost * fxRate : cost;
    // 손익은 KRW 기준으로 비교 (단위 혼합 방지).
    const pnlKRW  = mvKRW - costKRW;
    // 손익(시장 통화) — 보조용
    const pnl     = mktCur === "USD" ? pnlKRW / fxRate : pnlKRW;
    const pct     = costKRW > 0 ? (pnlKRW / costKRW) * 100 : 0;
    return {
      position:        p,
      quote:           q,
      currentPrice:    cur,
      marketValue:     mv,
      marketValueKRW:  mvKRW,
      unrealizedPnL:   pnl,
      unrealizedPnLKRW:pnlKRW,
      pnlPercent:      pct,
      hasLivePrice:    !!live,
    };
  });

  const positionsValueKRW = items.reduce((s, x) => s + x.marketValueKRW, 0);
  const totalPnLKRW       = items.reduce((s, x) => s + x.unrealizedPnLKRW, 0);
  const totalCostKRW      = items.reduce((s, x) => {
    const cost = x.position.avgPrice * x.position.quantity;
    return s + (x.position.currency === "USD" ? cost * fxRate : cost);
  }, 0);
  const totalPnLPercent   = totalCostKRW > 0 ? (totalPnLKRW / totalCostKRW) * 100 : 0;
  const cashUSDinKRW      = cashUSD * fxRate;
  const totalAssetKRW     = positionsValueKRW + cashKRW + cashUSDinKRW;

  return {
    positions:         items,
    positionsValueKRW,
    totalPnLKRW,
    totalCostKRW,
    totalPnLPercent,
    cashKRW,
    cashUSD,
    cashUSDinKRW,
    totalAssetKRW,
    fxRate,
  };
}
