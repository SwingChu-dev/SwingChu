import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STOCKS, StockInfo } from "@/constants/stockData";

const STORAGE_KEY = "@watchlist_ids";
const DEFAULT_IDS = STOCKS.map((s) => s.id);

interface WatchlistContextType {
  watchlistIds: string[];
  watchlistStocks: StockInfo[];
  addStock: (id: string) => void;
  removeStock: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  reorder: (newIds: string[]) => void;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistIds, setWatchlistIds] = useState<string[]>(DEFAULT_IDS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as string[];
          const valid = parsed.filter((id) => STOCKS.some((s) => s.id === id));
          if (valid.length > 0) setWatchlistIds(valid);
        } catch {}
      }
    });
  }, []);

  const save = useCallback((ids: string[]) => {
    setWatchlistIds(ids);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const addStock = useCallback(
    (id: string) => {
      setWatchlistIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removeStock = useCallback(
    (id: string) => {
      setWatchlistIds((prev) => {
        const next = prev.filter((x) => x !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const isInWatchlist = useCallback(
    (id: string) => watchlistIds.includes(id),
    [watchlistIds]
  );

  const reorder = useCallback((newIds: string[]) => save(newIds), [save]);

  const watchlistStocks = watchlistIds
    .map((id) => STOCKS.find((s) => s.id === id))
    .filter((s): s is StockInfo => s !== undefined);

  return (
    <WatchlistContext.Provider
      value={{ watchlistIds, watchlistStocks, addStock, removeStock, isInWatchlist, reorder }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be inside WatchlistProvider");
  return ctx;
}
