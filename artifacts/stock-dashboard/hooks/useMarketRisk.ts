import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/utils/apiBase";

export type RiskLevel = "낮음" | "보통" | "높음" | "위험";

export interface MarketRiskData {
  score:        number;
  level:        RiskLevel;
  components: {
    vix:        number;
    oil:        number;
    gold:       number;
    dxy:        number;
    oilPrice:   number;
    goldPrice:  number;
    dxyLevel:   number;
  };
  recommendation: string;
  actions:        string[];
  updatedAt:      string;
}

const CACHE_TTL = 15 * 60 * 1000; // 15분
let _cache: { data: MarketRiskData; ts: number } | null = null;

export function useMarketRisk() {
  const [data,    setData]    = useState<MarketRiskData | null>(_cache?.data ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetch_ = useCallback(async (force = false) => {
    if (!force && _cache && Date.now() - _cache.ts < CACHE_TTL) {
      setData(_cache.data);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/market/risk`);
      const json = (await res.json()) as MarketRiskData;
      _cache = { data: json, ts: Date.now() };
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "fetch error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refresh: () => fetch_(true) };
}
