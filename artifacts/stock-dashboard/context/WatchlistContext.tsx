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

const STORAGE_KEY = "@watchlist_ids_v5";
const DEFAULT_IDS = STOCKS.map((s) => s.id);
const VALID_IDS   = new Set(DEFAULT_IDS);

const LEGACY_KEYS = [
  "@watchlist_ids_v4", "@watchlist_ids_v3", "@watchlist_ids_v2",
  "@custom_stocks_v4", "@custom_stocks_v3", "@custom_stocks_v2",
];

interface WatchlistContextType {
  watchlistIds:    string[];
  watchlistStocks: StockInfo[];
  allKnownStocks:  StockInfo[];
  addStock:        (id: string) => void;
  removeStock:     (id: string) => void;
  isInWatchlist:   (id: string) => boolean;
  reorder:         (newIds: string[]) => void;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistIds, setWatchlistIds] = useState<string[]>(DEFAULT_IDS);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, ...LEGACY_KEYS]).then(
      ([[, rawIds], [, rawV3], [, rawV2]]) => {
        let loadedIds: string[] | null = null;

        if (rawIds) {
          try {
            const p = JSON.parse(rawIds);
            if (Array.isArray(p)) loadedIds = p;
          } catch {}
        }
        if (!loadedIds && rawV3) {
          try {
            const p = JSON.parse(rawV3);
            if (Array.isArray(p)) loadedIds = p;
          } catch {}
        }
        if (!loadedIds && rawV2) {
          try {
            const p = JSON.parse(rawV2);
            if (Array.isArray(p)) loadedIds = p;
          } catch {}
        }

        if (loadedIds) {
          const cleaned = loadedIds.filter((id) => VALID_IDS.has(id));
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          setWatchlistIds(cleaned);
        }

        AsyncStorage.multiRemove(LEGACY_KEYS);
      }
    );
  }, []);

  const saveIds = useCallback((ids: string[]) => {
    setWatchlistIds(ids);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const addStock = useCallback((id: string) => {
    if (!VALID_IDS.has(id)) return;
    setWatchlistIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeStock = useCallback((id: string) => {
    setWatchlistIds((prev) => {
      const next = prev.filter((x) => x !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchlist = useCallback(
    (id: string) => watchlistIds.includes(id),
    [watchlistIds]
  );

  const reorder = useCallback((newIds: string[]) => saveIds(newIds), [saveIds]);

  const watchlistStocks = watchlistIds
    .map((id) => STOCKS.find((s) => s.id === id))
    .filter((s): s is StockInfo => s !== undefined);

  return (
    <WatchlistContext.Provider
      value={{
        watchlistIds,
        watchlistStocks,
        allKnownStocks: STOCKS,
        addStock,
        removeStock,
        isInWatchlist,
        reorder,
      }}
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
