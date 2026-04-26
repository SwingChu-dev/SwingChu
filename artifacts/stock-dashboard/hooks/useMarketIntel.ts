import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/utils/apiBase";

export type CyclePhase =
  | "DISBELIEF" | "HOPE" | "OPTIMISM" | "BELIEF" | "THRILL" | "EUPHORIA"
  | "COMPLACENCY" | "ANXIETY" | "DENIAL" | "PANIC" | "CAPITULATION";

export type FgLevel = "EXTREME_FEAR" | "FEAR" | "NEUTRAL" | "GREED" | "EXTREME_GREED";
export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type Market = "us" | "kr";

export interface MarketIntel {
  market: Market;
  index:    { name: string; symbol: string; price: number; changePercent: number };
  volIndex: { name: string; symbol: string; price: number; changePercent: number };
  cycle: {
    phase: CyclePhase;
    phaseKr: string;
    monthAgoPhase: CyclePhase;
    monthAgoPhaseKr: string;
    nextRiskPhase: CyclePhase;
    nextRiskPhaseKr: string;
    rationale: string;
  };
  fearGreed: {
    score: number;
    level: FgLevel;
    labelKr: string;
    history: { weekAgo: number; monthAgo: number };
    components: Array<{
      key: string;
      labelKr: string;
      labelEn: string;
      level: FgLevel;
      detail: string;
    }>;
  };
  risks: Array<{
    severity: Severity;
    category: string;
    title: string;
    metric: string;
    description: string;
  }>;
  asOf: string;
}

const CACHE_TTL = 15 * 60 * 1000;
const _cache: Partial<Record<Market, { data: MarketIntel; ts: number }>> = {};

export function useMarketIntel(market: Market = "us") {
  const [data,    setData]    = useState<MarketIntel | null>(_cache[market]?.data ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    const hit = _cache[market];
    if (!force && hit && Date.now() - hit.ts < CACHE_TTL) {
      setData(hit.data); return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("market", market);
      if (force) params.set("refresh", "1");
      const url  = `${API_BASE}/market/intel?${params.toString()}`;
      const res  = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as MarketIntel;
      // 최소 형태 검증
      if (!json?.cycle?.phase || !json?.fearGreed || !Array.isArray(json?.risks)) {
        throw new Error("응답 형식 오류");
      }
      _cache[market] = { data: json, ts: Date.now() };
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "fetch error");
    } finally {
      setLoading(false);
    }
  }, [market]);

  // market이 바뀌면 해당 캐시 hit이 있으면 즉시 표시, 없으면 fetch
  useEffect(() => {
    const hit = _cache[market];
    setData(hit?.data ?? null);
    setError(null);
    load();
  }, [market, load]);

  return { data, loading, error, refresh: () => load(true) };
}
