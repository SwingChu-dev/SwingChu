import { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";

export interface EarningsInfo {
  ticker: string;
  market: string;
  nextEarningsDate: string | null;
  daysUntilEarnings: number | null;
  exDividendDate: string | null;
  dividendDate: string | null;
  daysUntilExDividend: number | null;
  asOf: string;
}

const memCache = new Map<string, { data: EarningsInfo; expiresAt: number }>();
const TTL_MS = 6 * 60 * 60 * 1000;

export function useEarnings(ticker: string | undefined, market: string | undefined) {
  const [data, setData]       = useState<EarningsInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker || !market) return;
    const key = `${ticker.toUpperCase()}:${market}`;
    const hit = memCache.get(key);
    if (hit && hit.expiresAt > Date.now()) { setData(hit.data); return; }

    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/earnings?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: EarningsInfo | null) => {
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
