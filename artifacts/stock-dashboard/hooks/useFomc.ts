import { useEffect, useState } from "react";
import { API_BASE } from "@/utils/apiBase";

export interface FomcMeeting {
  startDate: string;
  decisionDate: string;
  hasSEP: boolean;
  daysUntilDecision: number;
}

export interface FomcInfo {
  nextMeeting: FomcMeeting | null;
  upcoming: FomcMeeting[];
  asOf: string;
}

let cached: { data: FomcInfo; expiresAt: number } | null = null;
const TTL_MS = 6 * 60 * 60 * 1000;

export function useFomc() {
  const [data, setData] = useState<FomcInfo | null>(cached?.data ?? null);

  useEffect(() => {
    if (cached && cached.expiresAt > Date.now()) { setData(cached.data); return; }
    let cancelled = false;
    fetch(`${API_BASE}/fomc`)
      .then(r => r.ok ? r.json() : null)
      .then((d: FomcInfo | null) => {
        if (cancelled || !d) return;
        cached = { data: d, expiresAt: Date.now() + TTL_MS };
        setData(d);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return data;
}
