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
    const cur   = live ? q!.price : p.avgPrice;
    const mv    = cur * p.quantity;
    const mvKRW = p.currency === "USD" ? mv * fxRate : mv;
    const cost  = p.avgPrice * p.quantity;
    const pnl   = mv - cost;
    const pnlKRW= p.currency === "USD" ? pnl * fxRate : pnl;
    const pct   = cost > 0 ? (pnl / cost) * 100 : 0;
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
