import { Router } from "express";
import YahooFinanceClass from "yahoo-finance2";
import { rateLimit } from "../lib/rateLimit";

const router = Router();
const yahooFinance = new (YahooFinanceClass as any)({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

interface CacheEntry { data: EarningsResponse; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const TTL_MS = 6 * 60 * 60 * 1000;

interface LastEarnings {
  date:               string;
  epsActual:          number | null;
  epsEstimate:        number | null;
  epsSurprisePct:     number | null;
  revenueActual:      number | null;
  revenueEstimate:    number | null;
  revenueSurprisePct: number | null;
}

interface EarningsResponse {
  ticker: string;
  market: string;
  nextEarningsDate: string | null;
  daysUntilEarnings: number | null;
  earningsTimeOfDay: "BMO" | "AMC" | "DMH" | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  lastEarnings: LastEarnings | null;
  exDividendDate: string | null;
  dividendDate: string | null;
  daysUntilExDividend: number | null;
  source: "finnhub" | "yahoo";
  asOf: string;
}

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE = "https://finnhub.io/api/v1";

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

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface FinnhubEarning {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string | null;        // "amc" | "bmo" | "dmh" | ""
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

function pctSurprise(actual: number | null, estimate: number | null): number | null {
  if (actual == null || estimate == null) return null;
  if (estimate === 0) return null;
  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

async function fetchFinnhubEarnings(ticker: string): Promise<{
  nextEarningsDate: string | null;
  earningsTimeOfDay: "BMO" | "AMC" | "DMH" | null;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  lastEarnings: LastEarnings | null;
} | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const from = ymd(new Date(Date.now() - 7 * 86400_000));
    const to   = ymd(new Date(Date.now() + 120 * 86400_000));
    const url = `${FINNHUB_BASE}/calendar/earnings?from=${from}&to=${to}&symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json() as { earningsCalendar?: FinnhubEarning[] };
    const list = (json.earningsCalendar ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const now = new Date();
    const upcoming = list.find(e => new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const target = upcoming ?? list[list.length - 1];
    if (!target) return null;

    const hour = (target.hour ?? "").toLowerCase();
    const tod: "BMO" | "AMC" | "DMH" | null =
      hour === "bmo" ? "BMO" : hour === "amc" ? "AMC" : hour === "dmh" ? "DMH" : null;

    // 가장 최근의 발표 완료 분기 (epsActual !== null) — 컨센 vs 실제 비교용
    const past = list.filter((e) => e.epsActual != null && new Date(e.date) <= now);
    const lastReported = past[past.length - 1] ?? null;
    const lastEarnings: LastEarnings | null = lastReported
      ? {
          date:               lastReported.date,
          epsActual:          lastReported.epsActual,
          epsEstimate:        lastReported.epsEstimate,
          epsSurprisePct:     pctSurprise(lastReported.epsActual, lastReported.epsEstimate),
          revenueActual:      lastReported.revenueActual,
          revenueEstimate:    lastReported.revenueEstimate,
          revenueSurprisePct: pctSurprise(lastReported.revenueActual, lastReported.revenueEstimate),
        }
      : null;

    return {
      nextEarningsDate: new Date(target.date + "T00:00:00.000Z").toISOString(),
      earningsTimeOfDay: tod,
      epsEstimate: target.epsEstimate ?? null,
      revenueEstimate: target.revenueEstimate ?? null,
      lastEarnings,
    };
  } catch {
    return null;
  }
}

async function fetchYahooData(ticker: string, market: string): Promise<{
  nextEarningsDate: string | null;
  exDividendDate:   string | null;
  dividendDate:     string | null;
  lastEarnings:     LastEarnings | null;
}> {
  try {
    const symbol = toYahooSymbol(ticker, market);
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["calendarEvents", "earningsHistory"],
    });
    const calendar = summary?.calendarEvents;
    const earnings = calendar?.earnings;

    let nextEarningsDate: Date | null = null;
    if (earnings?.earningsDate && Array.isArray(earnings.earningsDate) && earnings.earningsDate.length > 0) {
      const first = earnings.earningsDate[0];
      nextEarningsDate = first instanceof Date ? first : new Date(first);
      if (isNaN(nextEarningsDate.getTime())) nextEarningsDate = null;
    }

    // earningsHistory: history[] 가장 마지막 항목이 가장 최근 발표 분기
    let lastEarnings: LastEarnings | null = null;
    const history = (summary as any)?.earningsHistory?.history;
    if (Array.isArray(history) && history.length > 0) {
      const last = history[history.length - 1];
      const dt = last.quarter instanceof Date ? last.quarter : new Date(last.quarter);
      const dateIso = !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : null;
      const epsActual = typeof last.epsActual?.raw === "number" ? last.epsActual.raw : (typeof last.epsActual === "number" ? last.epsActual : null);
      const epsEstimate = typeof last.epsEstimate?.raw === "number" ? last.epsEstimate.raw : (typeof last.epsEstimate === "number" ? last.epsEstimate : null);
      const surprisePct = typeof last.surprisePercent?.raw === "number"
        ? last.surprisePercent.raw * 100
        : (typeof last.surprisePercent === "number" ? last.surprisePercent * 100 : pctSurprise(epsActual, epsEstimate));
      if (dateIso && (epsActual != null || epsEstimate != null)) {
        lastEarnings = {
          date:               dateIso,
          epsActual,
          epsEstimate,
          epsSurprisePct:     surprisePct,
          revenueActual:      null,
          revenueEstimate:    null,
          revenueSurprisePct: null,
        };
      }
    }

    return {
      nextEarningsDate: nextEarningsDate ? nextEarningsDate.toISOString() : null,
      exDividendDate:   calendar?.exDividendDate ? new Date(calendar.exDividendDate).toISOString() : null,
      dividendDate:     calendar?.dividendDate   ? new Date(calendar.dividendDate).toISOString()   : null,
      lastEarnings,
    };
  } catch {
    return { nextEarningsDate: null, exDividendDate: null, dividendDate: null, lastEarnings: null };
  }
}

router.get("/earnings", rateLimit("earnings", 100), async (req, res) => {
  const ticker = String(req.query.ticker ?? "").trim();
  const market = String(req.query.market ?? "NASDAQ").trim();
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const key = `${ticker.toUpperCase()}:${market}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return res.json(hit.data);

  // Finnhub은 미국 주식만 지원하므로 KR 시장은 Yahoo만 사용
  const isUS = market === "NASDAQ" || market === "NYSE";
  const yahoo = await fetchYahooData(ticker, market);
  const finnhub = isUS ? await fetchFinnhubEarnings(ticker.toUpperCase()) : null;

  // 실적: Finnhub 우선, 없으면 Yahoo
  const nextEarningsDate = finnhub?.nextEarningsDate ?? yahoo.nextEarningsDate;

  const data: EarningsResponse = {
    ticker: ticker.toUpperCase(),
    market,
    nextEarningsDate,
    daysUntilEarnings: diffDays(nextEarningsDate),
    earningsTimeOfDay: finnhub?.earningsTimeOfDay ?? null,
    epsEstimate:       finnhub?.epsEstimate ?? null,
    revenueEstimate:   finnhub?.revenueEstimate ?? null,
    lastEarnings:      finnhub?.lastEarnings ?? yahoo.lastEarnings,
    exDividendDate:    yahoo.exDividendDate,
    dividendDate:      yahoo.dividendDate,
    daysUntilExDividend: diffDays(yahoo.exDividendDate),
    source: finnhub ? "finnhub" : "yahoo",
    asOf:   new Date().toISOString(),
  };

  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
  return res.json(data);
});

export default router;
