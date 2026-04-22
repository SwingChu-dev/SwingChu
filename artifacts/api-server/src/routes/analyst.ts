import { Router } from "express";

const router = Router();

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface AnalystResponse {
  ticker: string;
  recommendation: {
    period: string;
    strongBuy: number; buy: number; hold: number; sell: number; strongSell: number;
    total: number;
    consensusLabel: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell" | null;
  } | null;
  priceTarget: {
    targetHigh:   number | null;
    targetLow:    number | null;
    targetMean:   number | null;
    targetMedian: number | null;
    lastUpdated:  string | null;
    numberOfAnalysts: number | null;
  } | null;
  source: "finnhub";
  asOf: string;
}

interface CacheEntry { data: AnalystResponse; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const TTL_MS = 6 * 60 * 60 * 1000;

interface FinnhubRecommendation {
  buy: number; hold: number; sell: number; strongBuy: number; strongSell: number;
  period: string; symbol: string;
}

interface FinnhubPriceTarget {
  lastUpdated: string;
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  numberOfAnalysts?: number;
}

type ConsensusLabel = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";

function consensusFromCounts(r: FinnhubRecommendation): ConsensusLabel | null {
  const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
  if (total === 0) return null;
  const score = (r.strongBuy * 5 + r.buy * 4 + r.hold * 3 + r.sell * 2 + r.strongSell * 1) / total;
  if (score >= 4.5) return "Strong Buy";
  if (score >= 3.5) return "Buy";
  if (score >= 2.5) return "Hold";
  if (score >= 1.5) return "Sell";
  return                "Strong Sell";
}

router.get("/analyst", async (req, res) => {
  const ticker = String(req.query.ticker ?? "").trim().toUpperCase();
  const market = String(req.query.market ?? "NASDAQ").trim();
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  // Finnhub 무료 티어는 미국 주식만
  const isUS = market === "NASDAQ" || market === "NYSE";
  if (!isUS || !FINNHUB_KEY) {
    return res.json({
      ticker, recommendation: null, priceTarget: null,
      source: "finnhub", asOf: new Date().toISOString(),
    } as AnalystResponse);
  }

  const key = `${ticker}:${market}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return res.json(hit.data);

  try {
    const [recRes, ptRes] = await Promise.all([
      fetch(`${FINNHUB_BASE}/stock/recommendation?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`),
      fetch(`${FINNHUB_BASE}/stock/price-target?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`),
    ]);
    const recList = recRes.ok ? await recRes.json() as FinnhubRecommendation[] : [];
    const pt      = ptRes.ok  ? await ptRes.json()  as FinnhubPriceTarget       : null;

    const latest = recList.sort((a, b) => b.period.localeCompare(a.period))[0];

    const data: AnalystResponse = {
      ticker,
      recommendation: latest ? {
        period:    latest.period,
        strongBuy: latest.strongBuy ?? 0,
        buy:       latest.buy       ?? 0,
        hold:      latest.hold      ?? 0,
        sell:      latest.sell      ?? 0,
        strongSell:latest.strongSell?? 0,
        total: (latest.strongBuy ?? 0) + (latest.buy ?? 0) + (latest.hold ?? 0) + (latest.sell ?? 0) + (latest.strongSell ?? 0),
        consensusLabel: consensusFromCounts(latest),
      } : null,
      priceTarget: pt && pt.targetMean ? {
        targetHigh:   pt.targetHigh   ?? null,
        targetLow:    pt.targetLow    ?? null,
        targetMean:   pt.targetMean   ?? null,
        targetMedian: pt.targetMedian ?? null,
        lastUpdated:  pt.lastUpdated  ?? null,
        numberOfAnalysts: pt.numberOfAnalysts ?? null,
      } : null,
      source: "finnhub",
      asOf:   new Date().toISOString(),
    };

    cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: "analyst fetch failed", detail: String(e?.message ?? e) });
  }
});

export default router;
