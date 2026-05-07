import { API_BASE } from "@/utils/apiBase";
import { aliasLookup } from "@/constants/koreanAliases";

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

  // 한글 별칭 hit이면 영문 티커로 Yahoo 호출 (Yahoo는 한글 localization 미지원).
  const ticker = aliasLookup(q);
  const effectiveQuery = ticker ?? q;

  const resp = await fetch(`${API_BASE}/stocks/search?q=${encodeURIComponent(effectiveQuery)}`);
  if (!resp.ok) return [];
  const data = await resp.json() as { hits?: SearchHit[] };
  return Array.isArray(data.hits) ? data.hits : [];
}
