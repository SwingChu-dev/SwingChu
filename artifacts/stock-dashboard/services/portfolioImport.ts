import { API_BASE } from "@/utils/apiBase";
import { STOCKS } from "@/constants/stockData";

export interface ParsedPosition {
  nameKrShown:    string;
  ticker:         string | null;
  market:         "KOSPI" | "KOSDAQ" | "NASDAQ" | null;
  currency:       "KRW" | "USD" | null;
  quantity:       number;
  marketValueKRW: number;
  pnlPercent:     number | null;
  matched:        boolean;
}

export async function parsePortfolioImage(
  base64:   string,
  mimeType: string,
): Promise<ParsedPosition[]> {
  const catalog = STOCKS.map(s => ({
    ticker:   s.ticker,
    nameKr:   s.name,
    market:   s.market,
    currency: s.currency,
  }));
  const resp = await fetch(`${API_BASE}/portfolio/parse-image`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ image: base64, mimeType, catalog }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error ?? `parse-image ${resp.status}`);
  }
  const data = await resp.json() as { positions?: ParsedPosition[] };
  return Array.isArray(data.positions) ? data.positions : [];
}

export interface ParsedTrade {
  side:           "BUY" | "SELL";
  nameKrShown:    string;
  ticker:         string | null;
  market:         "KOSPI" | "KOSDAQ" | "NASDAQ" | null;
  currency:       "KRW" | "USD" | null;
  quantity:       number;
  price:          number;
  totalKRW:       number | null;
  executedAt:     string | null;
  matched:        boolean;
}

export async function parseTradeImage(
  base64:   string,
  mimeType: string,
): Promise<ParsedTrade | null> {
  const catalog = STOCKS.map(s => ({
    ticker:   s.ticker,
    nameKr:   s.name,
    market:   s.market,
    currency: s.currency,
  }));
  const resp = await fetch(`${API_BASE}/portfolio/parse-trade`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ image: base64, mimeType, catalog }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error ?? `parse-trade ${resp.status}`);
  }
  const data = await resp.json() as { trade?: ParsedTrade | null };
  return data.trade ?? null;
}
