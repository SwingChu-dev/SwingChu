import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";

const REFRESH_INTERVAL_MS = 60_000;
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export interface LiveQuote {
  ticker:        string;
  market:        string;
  price:         number;
  priceKRW:      number;
  changePercent: number;
  change:        number;
  volume:        number;
  high:          number;
  low:           number;
  high52w:       number;
  low52w:        number;
  avgVolume10d:  number;
  fiftyDayAvg:   number;
  prevClose:     number;
  currency:      string;
  name:          string;
  ok:            boolean;
  fetchedAt:     number;
}

interface StockPriceContextType {
  quotes:     Record<string, LiveQuote>;
  loading:    boolean;
  lastUpdate: number | null;
  refresh:    () => void;
  getQuote:   (ticker: string, market: string) => LiveQuote | null;
  priceKRW:   (ticker: string, market: string, fallback: number) => number;
  changePct:  (ticker: string, market: string) => number | null;
}

const StockPriceContext = createContext<StockPriceContextType | null>(null);

interface WatchlistEntry {
  ticker: string;
  market: string;
}

interface Props {
  children: ReactNode;
  watchlist: WatchlistEntry[];
}

export function StockPriceProvider({ children, watchlist }: Props) {
  const [quotes,     setQuotes]     = useState<Record<string, LiveQuote>>({});
  const [loading,    setLoading]    = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (watchlist.length === 0) return;
    const items = watchlist.map((s) => `${s.ticker}:${s.market}`).join(",");
    try {
      setLoading(true);
      const res = await globalThis.fetch(`${API_BASE}/stocks/quotes?items=${encodeURIComponent(items)}`);
      if (!res.ok) return;
      const data: LiveQuote[] = await res.json();
      const map: Record<string, LiveQuote> = {};
      data.forEach((q) => {
        if (q.ok) map[`${q.ticker}:${q.market}`] = { ...q, fetchedAt: Date.now() };
      });
      setQuotes((prev) => ({ ...prev, ...map }));
      setLastUpdate(Date.now());
    } catch {
    } finally {
      setLoading(false);
    }
  }, [watchlist.map((s) => `${s.ticker}:${s.market}`).join(",")]);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, REFRESH_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetch]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") fetch();
    });
    return () => sub.remove();
  }, [fetch]);

  const getQuote = useCallback(
    (ticker: string, market: string) => quotes[`${ticker}:${market}`] ?? null,
    [quotes]
  );

  const priceKRW = useCallback(
    (ticker: string, market: string, fallback: number) => {
      const q = quotes[`${ticker}:${market}`];
      return q?.priceKRW ?? fallback;
    },
    [quotes]
  );

  const changePct = useCallback(
    (ticker: string, market: string) => {
      const q = quotes[`${ticker}:${market}`];
      return q ? q.changePercent : null;
    },
    [quotes]
  );

  return (
    <StockPriceContext.Provider
      value={{ quotes, loading, lastUpdate, refresh: fetch, getQuote, priceKRW, changePct }}
    >
      {children}
    </StockPriceContext.Provider>
  );
}

export function useStockPrice() {
  const ctx = useContext(StockPriceContext);
  if (!ctx) throw new Error("useStockPrice must be inside StockPriceProvider");
  return ctx;
}
