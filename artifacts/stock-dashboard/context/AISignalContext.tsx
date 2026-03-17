import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE } from "@/utils/apiBase";
const CACHE_KEY   = "@ai_signals_v2";
const CACHE_TTL   = 10 * 60 * 1000;
const FETCH_CHUNK = 5;

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

export type SignalType = "세력진입" | "세력이탈" | "매집중" | "분산중" | "관망";
export type SignalStrength = "강" | "중" | "약";

export interface TechnicalIndicators {
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bbUpper: number;
  bbMid: number;
  bbLower: number;
  bbWidth: number;
  ma5: number;
  ma20: number;
  volume: number;
  volumeAvg20: number;
  volumeRatio: number;
  currentPrice: number;
  changePercent: number;
  high52w: number;
  low52w: number;
  distFrom52High: number;
  pct52Range: number;
}

export interface AISmartMoneySignal {
  ticker: string;
  market: string;
  type: SignalType;
  strength: SignalStrength;
  institutionalNet: number;
  foreignerNet: number;
  summary: string;
  signals: string[];
  indicators: TechnicalIndicators;
  generatedAt: string;
}

interface AISignalContextType {
  smartMoneySignals: Record<string, AISmartMoneySignal>;
  loading:           boolean;
  lastFetch:         number | null;
  refresh:           () => void;
}

const AISignalContext = createContext<AISignalContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  watchlist: { ticker: string; market: string; id: string }[];
}

export function AISignalProvider({ children, watchlist }: Props) {
  const [smartMoneySignals, setSmartMoneySignals] = useState<Record<string, AISmartMoneySignal>>({});
  const [loading,   setLoading]   = useState(false);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const fetchSignals = useCallback(async () => {
    if (watchlist.length === 0) return;
    if (lastFetch && Date.now() - lastFetch < CACHE_TTL) return;

    setLoading(true);
    try {
      const newSmart: Record<string, AISmartMoneySignal> = {};

      for (let i = 0; i < watchlist.length; i += FETCH_CHUNK) {
        const chunk = watchlist.slice(i, i + FETCH_CHUNK);
        const items = chunk.map(s => `${s.ticker}:${s.market}`).join(",");

        try {
          const resp = await fetch(`${API_BASE}/stocks/signals?items=${items}`, {
            signal: AbortSignal.timeout(60_000),
          });
          if (!resp.ok) continue;

          const data: any[] = await resp.json();
          for (const d of data) {
            newSmart[d.ticker] = {
              ticker:           d.ticker,
              market:           d.market,
              type:             d.smartMoney.type,
              strength:         d.smartMoney.strength,
              institutionalNet: d.smartMoney.institutionalNet ?? 0,
              foreignerNet:     d.smartMoney.foreignerNet     ?? 0,
              summary:          d.smartMoney.summary,
              signals:          d.smartMoney.signals,
              indicators:       d.indicators,
              generatedAt:      d.generatedAt,
            };
          }
        } catch {}

        if (i + FETCH_CHUNK < watchlist.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      setSmartMoneySignals(prev => ({ ...prev, ...newSmart }));
      const now = Date.now();
      setLastFetch(now);

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        smart: newSmart, ts: now,
      }));
    } catch {}
    setLoading(false);
  }, [watchlist, lastFetch]);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY).then(raw => {
      if (!raw) return;
      try {
        const { smart, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL * 3) {
          setSmartMoneySignals(smart ?? {});
          setLastFetch(ts);
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(fetchSignals, CACHE_TTL);
    return () => clearInterval(id);
  }, [fetchSignals]);

  const refresh = useCallback(() => {
    setLastFetch(null);
    fetchSignals();
  }, [fetchSignals]);

  return (
    <AISignalContext.Provider value={{
      smartMoneySignals, loading, lastFetch, refresh,
    }}>
      {children}
    </AISignalContext.Provider>
  );
}

export function useAISignals() {
  const ctx = useContext(AISignalContext);
  if (!ctx) throw new Error("useAISignals must be inside AISignalProvider");
  return ctx;
}
