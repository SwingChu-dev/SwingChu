import { Router } from "express";
import YahooFinanceClass from "yahoo-finance2";

const router = Router();
const yahooFinance = new (YahooFinanceClass as any)({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

interface CacheEntry { data: EarningsResponse; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const TTL_MS = 6 * 60 * 60 * 1000;

interface EarningsResponse {
  ticker: string;
  market: string;
  nextEarningsDate: string | null;
  daysUntilEarnings: number | null;
  earningsTimeOfDay: "BMO" | "AMC" | null;
  exDividendDate: string | null;
  dividendDate: string | null;
  daysUntilExDividend: number | null;
  asOf: string;
}

function toYahooSymbol(ticker: string, market: string): string {
  if (market === "KOSPI")  return `${ticker}.KS`;
  if (market === "KOSDAQ") return `${ticker}.KQ`;
  return ticker.toUpperCase();
}

function diffDays(future: Date | string | null | undefined): number | null {
  if (!future) return null;
  const d = future instanceof Date ? future : new Date(future);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

router.get("/earnings", async (req, res) => {
  const ticker = String(req.query.ticker ?? "").trim();
  const market = String(req.query.market ?? "NASDAQ").trim();
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const key = `${ticker.toUpperCase()}:${market}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return res.json(hit.data);

  try {
    const symbol = toYahooSymbol(ticker, market);
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["calendarEvents", "earnings"],
    });

    const calendar = summary?.calendarEvents;
    const earnings = calendar?.earnings;

    let nextEarningsDate: Date | null = null;
    if (earnings?.earningsDate && Array.isArray(earnings.earningsDate) && earnings.earningsDate.length > 0) {
      const first = earnings.earningsDate[0];
      nextEarningsDate = first instanceof Date ? first : new Date(first);
      if (isNaN(nextEarningsDate.getTime())) nextEarningsDate = null;
    }

    const exDiv = calendar?.exDividendDate ?? null;
    const divPay = calendar?.dividendDate ?? null;

    const data: EarningsResponse = {
      ticker: ticker.toUpperCase(),
      market,
      nextEarningsDate: nextEarningsDate ? nextEarningsDate.toISOString() : null,
      daysUntilEarnings: diffDays(nextEarningsDate),
      earningsTimeOfDay: null,
      exDividendDate: exDiv ? new Date(exDiv).toISOString() : null,
      dividendDate:   divPay ? new Date(divPay).toISOString() : null,
      daysUntilExDividend: diffDays(exDiv),
      asOf: new Date().toISOString(),
    };

    cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: "earnings fetch failed", detail: String(e?.message ?? e) });
  }
});

export default router;
