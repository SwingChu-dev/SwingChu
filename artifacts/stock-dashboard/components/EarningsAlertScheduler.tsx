import React, { useEffect, useRef } from "react";
import { useWatchlist } from "@/context/WatchlistContext";
import { API_BASE } from "@/utils/apiBase";
import { syncEarningsAlerts, type EarningsLite } from "@/utils/earningsNotifications";

const REFRESH_MS = 6 * 60 * 60 * 1000;  // 6시간마다 동기화

export default function EarningsAlertScheduler() {
  const { watchlistStocks } = useWatchlist();
  const lastRunRef = useRef(0);

  useEffect(() => {
    if (watchlistStocks.length === 0) return;

    const now = Date.now();
    if (now - lastRunRef.current < REFRESH_MS) return;
    lastRunRef.current = now;

    let cancelled = false;
    (async () => {
      const lite: EarningsLite[] = [];
      // 순차 호출 (rate limit 회피, 6h 캐시라 부담 적음)
      for (const s of watchlistStocks) {
        if (cancelled) return;
        try {
          const r = await fetch(
            `${API_BASE}/earnings?ticker=${encodeURIComponent(s.ticker)}&market=${encodeURIComponent(s.market)}`
          );
          if (!r.ok) continue;
          const d = await r.json();
          lite.push({
            ticker: s.ticker,
            market: s.market,
            name:   s.name,
            earningsDateISO: d.nextEarningsDate ?? null,
            timeOfDay: d.earningsTimeOfDay ?? null,
          });
        } catch {}
      }
      if (cancelled) return;
      await syncEarningsAlerts(lite).catch(() => {});
    })();

    return () => { cancelled = true; };
  }, [watchlistStocks.length]);

  return null;
}
