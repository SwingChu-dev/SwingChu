import { API_BASE } from "@/utils/apiBase";

export interface SearchHit {
  ticker:   string;
  name:     string;
  market:   "NASDAQ" | "KOSPI" | "KOSDAQ" | "NYSE" | "OTHER";
  currency: "USD" | "KRW";
  exchange: string;
}

export async function searchStocks(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const resp = await fetch(`${API_BASE}/stocks/search?q=${encodeURIComponent(q)}`);
  if (!resp.ok) return [];
  const data = await resp.json() as { hits?: SearchHit[] };
  return Array.isArray(data.hits) ? data.hits : [];
}
