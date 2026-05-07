import { useState, useEffect } from "react";
import { API_BASE } from "@/utils/apiBase";

export type MacroEventType =
  | "FOMC"
  | "FOMC_MINUTES"
  | "WITCH_US"
  | "WITCH_KR"
  | "NFP";

export type MacroSeverity = "HIGH" | "MEDIUM" | "LOW";
export type MacroMarket   = "us" | "kr" | "global";

export interface MacroEvent {
  type:      MacroEventType;
  dateISO:   string;
  daysUntil: number;
  title:     string;
  detail:    string;
  severity:  MacroSeverity;
  market:    MacroMarket;
}

const CACHE_TTL = 60 * 60 * 1000; // 1시간 (이벤트 일정은 자주 안 바뀜)
const _cache: Record<number, { events: MacroEvent[]; ts: number }> = {};

export function useMacroEvents(days = 30): { events: MacroEvent[]; loading: boolean } {
  const cached = _cache[days];
  const initial = cached && Date.now() - cached.ts < CACHE_TTL ? cached.events : [];
  const [events, setEvents]   = useState<MacroEvent[]>(initial);
  const [loading, setLoading] = useState(initial.length === 0);

  useEffect(() => {
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setEvents(cached.events);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/macro-events?days=${days}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { events?: MacroEvent[] } | null) => {
        if (cancelled) return;
        const list = Array.isArray(data?.events) ? data!.events : [];
        _cache[days] = { events: list, ts: Date.now() };
        setEvents(list);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  return { events, loading };
}
