import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE } from "@/utils/apiBase";

const CACHE_KEY  = "@ai_signals_v5";
const SEEN_KEY   = "@ai_signals_seen_v5";
const CACHE_TTL  = 10 * 60 * 1000;

export type SignalType     = "세력진입" | "세력이탈" | "매집중" | "분산중" | "관망";
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
  ma60: number;
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
  loadingTicker:     string | null;
  lastFetch:         number | null;
  error:             string | null;
  newCount:          number;
  refresh:           () => void;
  markAllSeen:       () => void;
}

const AISignalContext = createContext<AISignalContextType | null>(null);

interface Props {
  children: ReactNode;
  watchlist: { ticker: string; market: string; id: string }[];
}

export function AISignalProvider({ children, watchlist }: Props) {
  const [smartMoneySignals, setSmartMoneySignals] = useState<Record<string, AISmartMoneySignal>>({});
  const [loading,       setLoading]       = useState(false);
  const [loadingTicker, setLoadingTicker] = useState<string | null>(null);
  const [lastFetch,     setLastFetch]     = useState<number | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [seenKeys,      setSeenKeys]      = useState<Set<string>>(new Set());

  const forceRef    = useRef(false);
  const abortRef    = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);

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
    AsyncStorage.getItem(SEEN_KEY).then(raw => {
      if (!raw) return;
      try { setSeenKeys(new Set(JSON.parse(raw))); } catch {}
    });
  }, []);

  const fetchSignals = useCallback(async () => {
    if (watchlist.length === 0) return;
    if (!forceRef.current && lastFetch && Date.now() - lastFetch < CACHE_TTL) return;
    if (fetchingRef.current) return;

    forceRef.current  = false;
    fetchingRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    const newSmart: Record<string, AISmartMoneySignal> = {};
    let successCount = 0;
    let errorCount = 0;

    for (const stock of watchlist) {
      if (ctrl.signal.aborted) break;
      setLoadingTicker(stock.ticker);

      try {
        const item = `${stock.ticker}:${stock.market}`;
        const resp = await fetch(
          `${API_BASE}/stocks/signals?items=${encodeURIComponent(item)}`,
          { signal: AbortSignal.timeout(90_000) },
        );

        if (!resp.ok) {
          errorCount++;
          continue;
        }

        const data: any[] = await resp.json();
        for (const d of data) {
          if (!d.smartMoney?.type) continue;
          const sig: AISmartMoneySignal = {
            ticker:           d.ticker,
            market:           d.market,
            type:             d.smartMoney.type,
            strength:         d.smartMoney.strength,
            institutionalNet: d.smartMoney.institutionalNet ?? 0,
            foreignerNet:     d.smartMoney.foreignerNet     ?? 0,
            summary:          d.smartMoney.summary          ?? "",
            signals:          d.smartMoney.signals          ?? [],
            indicators:       d.indicators,
            generatedAt:      d.generatedAt,
          };
          newSmart[d.ticker] = sig;
          setSmartMoneySignals(prev => ({ ...prev, [d.ticker]: sig }));
          successCount++;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") break;
        errorCount++;
      }
    }

    setLoadingTicker(null);

    if (successCount > 0) {
      const now = Date.now();
      setLastFetch(now);
      setError(null);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ smart: newSmart, ts: now }));
    } else if (errorCount > 0 && successCount === 0) {
      setError("AI 분석 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }

    setLoading(false);
    fetchingRef.current = false;
  }, [watchlist, lastFetch]);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(fetchSignals, CACHE_TTL);
    return () => clearInterval(id);
  }, [fetchSignals]);

  const newCount = Object.values(smartMoneySignals).filter(s => {
    const isActionable = s.type !== "관망";
    const key = `${s.ticker}:${s.generatedAt}`;
    return isActionable && !seenKeys.has(key);
  }).length;

  const markAllSeen = useCallback(() => {
    const keys = Object.values(smartMoneySignals).map(s => `${s.ticker}:${s.generatedAt}`);
    const next = new Set(keys);
    setSeenKeys(next);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
  }, [smartMoneySignals]);

  const refresh = useCallback(() => {
    forceRef.current = true;
    fetchingRef.current = false;
    setLastFetch(null);
  }, []);

  return (
    <AISignalContext.Provider value={{
      smartMoneySignals, loading, loadingTicker, lastFetch, error, newCount, refresh, markAllSeen,
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
