import React, { useEffect, useRef } from "react";
import { useWatchlist } from "@/context/WatchlistContext";
import { usePortfolio } from "@/context/PortfolioContext";
import { API_BASE } from "@/utils/apiBase";
import { syncEarningsAlerts, type EarningsLite } from "@/utils/earningsNotifications";

const REFRESH_MS = 6 * 60 * 60 * 1000;  // 6시간마다 동기화

export default function EarningsAlertScheduler() {
  const { watchlistStocks } = useWatchlist();
  const { positions } = usePortfolio();
  const lastRunRef = useRef(0);

  useEffect(() => {
    const items = new Map<string, { ticker: string; market: string; name: string }>();
    for (const s of watchlistStocks) {
      items.set(`${s.ticker.toUpperCase()}:${s.market}`, { ticker: s.ticker, market: s.market, name: s.name });
    }
    for (const p of positions) {
      const key = `${p.ticker.toUpperCase()}:${p.market}`;
      if (!items.has(key)) items.set(key, { ticker: p.ticker, market: p.market, name: p.name });
    }

    if (items.size === 0) return;

    const now = Date.now();
    if (now - lastRunRef.current < REFRESH_MS) return;
    lastRunRef.current = now;

    let cancelled = false;
    (async () => {
      const lite: EarningsLite[] = [];
      // 순차 호출 (rate limit 회피, 6h 캐시라 부담 적음)
      for (const item of items.values()) {
        if (cancelled) return;
        try {
          const r = await fetch(
            `${API_BASE}/earnings?ticker=${encodeURIComponent(item.ticker)}&market=${encodeURIComponent(item.market)}`
          );
          if (!r.ok) continue;
          const d = await r.json();
          lite.push({
            ticker: item.ticker,
            market: item.market,
            name:   item.name,
            earningsDateISO: d.nextEarningsDate ?? null,
            timeOfDay: d.earningsTimeOfDay ?? null,
          });
        } catch {}
      }
      if (cancelled) return;
      await syncEarningsAlerts(lite).catch(() => {});
    })();

    return () => { cancelled = true; };
  }, [watchlistStocks.length, positions.length]);

  return null;
}
