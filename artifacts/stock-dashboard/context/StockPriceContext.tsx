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

const REFRESH_INTERVAL_MS = 30_000;
const USD_KRW_FALLBACK    = 1450;
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
  usdKrw:     number;
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
  const [usdKrw,     setUsdKrw]     = useState<number>(USD_KRW_FALLBACK);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (watchlist.length === 0) return;
    // Include USD/KRW rate in the same batch request
    const stockItems  = watchlist.map((s) => `${s.ticker}:${s.market}`).join(",");
    const allItems    = `${stockItems},USDKRW=X:INDEX`;
    try {
      setLoading(true);
      const res = await globalThis.fetch(
        `${API_BASE}/stocks/quotes?items=${encodeURIComponent(allItems)}`
      );
      if (!res.ok) return;
      const data: LiveQuote[] = await res.json();
      const now = Date.now();

      // Extract USD/KRW rate
      const fxQuote = data.find((q) => q.ticker === "USDKRW=X");
      if (fxQuote?.ok && fxQuote.price > 100) {
        setUsdKrw(Math.round(fxQuote.price));
      }

      // Update only quotes that changed (minimise re-renders)
      setQuotes((prev) => {
        const next: Record<string, LiveQuote> = { ...prev };
        let changed = false;
        data.forEach((q) => {
          if (!q.ok || q.ticker === "USDKRW=X") return;
          const key     = `${q.ticker}:${q.market}`;
          const prevQ   = prev[key];
          const updated = { ...q, fetchedAt: now };
          if (!prevQ || prevQ.price !== q.price || prevQ.changePercent !== q.changePercent) {
            next[key] = updated;
            changed   = true;
          }
        });
        return changed ? next : prev;
      });
      setLastUpdate(now);
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
      value={{ quotes, loading, lastUpdate, usdKrw, refresh: fetch, getQuote, priceKRW, changePct }}
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
