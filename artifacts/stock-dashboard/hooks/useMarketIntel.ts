import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/utils/apiBase";

export type CyclePhase =
  | "DISBELIEF" | "HOPE" | "OPTIMISM" | "BELIEF" | "THRILL" | "EUPHORIA"
  | "COMPLACENCY" | "ANXIETY" | "DENIAL" | "PANIC" | "CAPITULATION";

export type FgLevel = "EXTREME_FEAR" | "FEAR" | "NEUTRAL" | "GREED" | "EXTREME_GREED";
export type Severity = "HIGH" | "MEDIUM" | "LOW";

export interface MarketIntel {
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
  spx: { price: number; changePercent: number };
  vix: { price: number; changePercent: number };
  asOf: string;
}

const CACHE_TTL = 15 * 60 * 1000;
let _cache: { data: MarketIntel; ts: number } | null = null;

export function useMarketIntel() {
  const [data,    setData]    = useState<MarketIntel | null>(_cache?.data ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!force && _cache && Date.now() - _cache.ts < CACHE_TTL) {
      setData(_cache.data); return;
    }
    setLoading(true);
    try {
      const url  = `${API_BASE}/market/intel${force ? "?refresh=1" : ""}`;
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
      _cache = { data: json, ts: Date.now() };
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "fetch error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: () => load(true) };
}
