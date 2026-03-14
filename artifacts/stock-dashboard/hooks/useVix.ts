import { useState, useEffect, useCallback } from "react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export function useVix(intervalMs = 300_000) {
  const [vix, setVix] = useState<number | null>(null);

  const fetchVix = useCallback(async () => {
    try {
      const resp = await globalThis.fetch(
        `${API_BASE}/stocks/quotes?items=${encodeURIComponent("^VIX:INDEX")}`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const q = data?.[0];
      if (q?.ok && q.price > 0) setVix(parseFloat(q.price.toFixed(2)));
    } catch {}
  }, []);

  useEffect(() => {
    fetchVix();
    const t = setInterval(fetchVix, intervalMs);
    return () => clearInterval(t);
  }, [fetchVix, intervalMs]);

  return vix;
}

export function vixLabel(vix: number | null): string {
  if (vix == null) return "—";
  if (vix >= 30) return `VIX ${vix.toFixed(2)} (매우높음)`;
  if (vix >= 25) return `VIX ${vix.toFixed(2)} (높음)`;
  if (vix >= 20) return `VIX ${vix.toFixed(2)} (주의)`;
  return `VIX ${vix.toFixed(2)} (낮음)`;
}

export function vixColor(vix: number | null, pos: string, neg: string, warn: string, muted: string): string {
  if (vix == null) return muted;
  if (vix >= 30) return neg;
  if (vix >= 20) return warn;
  return pos;
}
