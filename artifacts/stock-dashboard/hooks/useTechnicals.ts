import { useState, useEffect } from "react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export interface Technicals {
  ma5:        number | null;
  ma20:       number | null;
  trendUp:    boolean | null;  // null = insufficient data
  disparity5: number | null;   // (price/ma5 - 1) * 100
  disparity20:number | null;   // (price/ma20 - 1) * 100
  loading:    boolean;
}

function calcSMA(closes: number[], period: number, offset = 0): number | null {
  if (closes.length < period + offset) return null;
  const slice = closes.slice(closes.length - period - offset, closes.length - offset);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function useTechnicals(ticker: string, market: string, livePrice: number): Technicals {
  const [technicals, setTechnicals] = useState<Technicals>({
    ma5: null, ma20: null, trendUp: null,
    disparity5: null, disparity20: null,
    loading: true,
  });

  useEffect(() => {
    if (!ticker || !market) return;
    setTechnicals(prev => ({ ...prev, loading: true }));

    globalThis.fetch(
      `${API_BASE}/stocks/history?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}&period=3mo`
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(payload => {
        const rows: { close: number }[] = payload?.data ?? [];
        if (rows.length < 20) {
          setTechnicals({ ma5: null, ma20: null, trendUp: null, disparity5: null, disparity20: null, loading: false });
          return;
        }

        const closes = rows.map(r => r.close);

        const ma5  = calcSMA(closes, 5);
        const ma20 = calcSMA(closes, 20);

        // MA20 추세: 최근 5일 MA20 평균 vs 5일 전 5일 MA20 평균
        const recentMa20s: number[] = [];
        const pastMa20s:   number[] = [];
        for (let i = 0; i < 5; i++) {
          const r = calcSMA(closes, 20, i);
          const p = calcSMA(closes, 20, i + 5);
          if (r !== null) recentMa20s.push(r);
          if (p !== null) pastMa20s.push(p);
        }
        const avgRecent = recentMa20s.length > 0 ? recentMa20s.reduce((a, b) => a + b, 0) / recentMa20s.length : null;
        const avgPast   = pastMa20s.length > 0   ? pastMa20s.reduce((a, b) => a + b, 0)   / pastMa20s.length   : null;
        const trendUp = avgRecent !== null && avgPast !== null ? avgRecent > avgPast : null;

        const price = livePrice > 0 ? livePrice : closes[closes.length - 1];
        const disparity5  = ma5  ? +((price / ma5  - 1) * 100).toFixed(1) : null;
        const disparity20 = ma20 ? +((price / ma20 - 1) * 100).toFixed(1) : null;

        setTechnicals({ ma5, ma20, trendUp, disparity5, disparity20, loading: false });
      })
      .catch(() => {
        setTechnicals({ ma5: null, ma20: null, trendUp: null, disparity5: null, disparity20: null, loading: false });
      });
  }, [ticker, market]);

  return technicals;
}
