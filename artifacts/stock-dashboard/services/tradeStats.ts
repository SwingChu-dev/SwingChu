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
