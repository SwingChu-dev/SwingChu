import { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";

export interface AnalystInfo {
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
  source: string;
  asOf: string;
}

const memCache = new Map<string, { data: AnalystInfo; expiresAt: number }>();
const TTL_MS = 6 * 60 * 60 * 1000;

export function useAnalyst(ticker: string | undefined, market: string | undefined) {
  const [data, setData] = useState<AnalystInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker || !market) return;
    const key = `${ticker.toUpperCase()}:${market}`;
    const hit = memCache.get(key);
    if (hit && hit.expiresAt > Date.now()) { setData(hit.data); return; }

    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/analyst?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: AnalystInfo | null) => {
        if (cancelled || !d) return;
        memCache.set(key, { data: d, expiresAt: Date.now() + TTL_MS });
        setData(d);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ticker, market]);

  return { data, loading };
}
