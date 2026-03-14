import { Router } from "express";
import YahooFinanceClass from "yahoo-finance2";

const router = Router();
const yahooFinance = new (YahooFinanceClass as any)();

function toYahooTicker(ticker: string, market: string): string {
  if (market === "KOSPI")  return `${ticker}.KS`;
  if (market === "KOSDAQ") return `${ticker}.KQ`;
  return ticker;
}

router.get("/stocks/quotes", async (req, res) => {
  const raw = (req.query.items as string) ?? "";
  const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return res.json([]);

  const parsed = items.map((item) => {
    const [ticker, market = "NASDAQ"] = item.split(":");
    return { ticker, market, yahooTicker: toYahooTicker(ticker, market) };
  });

  try {
    const results = await Promise.all(
      parsed.map(async (p) => {
        try {
          const q = await yahooFinance.quote(p.yahooTicker);
          const priceKRW =
            p.market === "KOSPI" || p.market === "KOSDAQ"
              ? q.regularMarketPrice ?? 0
              : Math.round((q.regularMarketPrice ?? 0) * 1450);
          return {
            ticker:        p.ticker,
            market:        p.market,
            price:         q.regularMarketPrice ?? 0,
            priceKRW,
            changePercent: q.regularMarketChangePercent ?? 0,
            change:        q.regularMarketChange ?? 0,
            volume:        q.regularMarketVolume ?? 0,
            high:          q.regularMarketDayHigh ?? 0,
            low:           q.regularMarketDayLow ?? 0,
            prevClose:     q.regularMarketPreviousClose ?? 0,
            currency:      q.currency ?? "USD",
            name:          q.shortName ?? q.longName ?? p.ticker,
            ok:            true,
          };
        } catch {
          return { ticker: p.ticker, market: p.market, ok: false };
        }
      })
    );
    return res.json(results);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

router.get("/stocks/search", async (req, res) => {
  const q = (req.query.q as string) ?? "";
  if (q.length < 1) return res.json([]);

  try {
    const result = await yahooFinance.search(q, {
      quotesCount: 20,
      newsCount: 0,
    });
    const quotes = result.quotes
      .filter((r: any) => r.quoteType === "EQUITY")
      .map((r: any) => ({
        ticker:   r.symbol,
        name:     r.shortname ?? r.longname ?? r.symbol,
        exchange: r.exchange,
        market:   r.exchDisp ?? r.exchange,
      }));
    return res.json(quotes);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

export default router;
