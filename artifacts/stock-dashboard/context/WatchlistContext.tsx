import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STOCKS, StockInfo } from "@/constants/stockData";

const STORAGE_KEY        = "@watchlist_ids_v5";
const CUSTOM_STOCKS_KEY  = "@watchlist_custom_stocks_v1";
const DEFAULT_IDS = STOCKS.map((s) => s.id);
const CATALOG_IDS = new Set(DEFAULT_IDS);

const LEGACY_KEYS = [
  "@watchlist_ids_v4", "@watchlist_ids_v3", "@watchlist_ids_v2",
  "@custom_stocks_v4", "@custom_stocks_v3", "@custom_stocks_v2",
];

interface WatchlistContextType {
  watchlistIds:    string[];
  watchlistStocks: StockInfo[];
  allKnownStocks:  StockInfo[];
  customStocks:    StockInfo[];
  addStock:        (id: string) => void;
  /** 사용자 정의 종목(Yahoo 검색 등)을 카탈로그에 추가하고 관심종목에 등록 */
  addCustomStock:  (stock: StockInfo) => void;
  removeStock:     (id: string) => void;
  isInWatchlist:   (id: string) => boolean;
  reorder:         (newIds: string[]) => void;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistIds, setWatchlistIds] = useState<string[]>(DEFAULT_IDS);
  const [customStocks, setCustomStocks] = useState<StockInfo[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, CUSTOM_STOCKS_KEY, ...LEGACY_KEYS]).then(
      ([[, rawIds], [, rawCustom], [, rawV3], [, rawV2]]) => {
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

        let loadedCustom: StockInfo[] = [];
        if (rawCustom) {
          try {
            const p = JSON.parse(rawCustom);
            if (Array.isArray(p)) loadedCustom = p;
          } catch {}
        }

        const knownIds = new Set([...CATALOG_IDS, ...loadedCustom.map((s) => s.id)]);
        if (loadedIds) {
          const cleaned = loadedIds.filter((id) => knownIds.has(id));
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          setWatchlistIds(cleaned);
        }
        if (loadedCustom.length) setCustomStocks(loadedCustom);

        AsyncStorage.multiRemove(LEGACY_KEYS);
      }
    );
  }, []);

  const saveIds = useCallback((ids: string[]) => {
    setWatchlistIds(ids);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const isKnown = useCallback(
    (id: string) => CATALOG_IDS.has(id) || customStocks.some((s) => s.id === id),
    [customStocks],
  );

  const addStock = useCallback((id: string) => {
    if (!CATALOG_IDS.has(id) && !customStocks.some((s) => s.id === id)) return;
    setWatchlistIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [customStocks]);

  const addCustomStock = useCallback((stock: StockInfo) => {
    setCustomStocks((prev) => {
      const exists = prev.some((s) => s.id === stock.id);
      const next = exists ? prev : [...prev, stock];
      if (!exists) AsyncStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(next));
      return next;
    });
    setWatchlistIds((prev) => {
      if (prev.includes(stock.id)) return prev;
      const next = [...prev, stock.id];
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

  const allKnownStocks = useMemo(() => [...STOCKS, ...customStocks], [customStocks]);

  const watchlistStocks = useMemo(
    () => watchlistIds
      .map((id) => allKnownStocks.find((s) => s.id === id))
      .filter((s): s is StockInfo => s !== undefined),
    [watchlistIds, allKnownStocks],
  );

  return (
    <WatchlistContext.Provider
      value={{
        watchlistIds,
        watchlistStocks,
        allKnownStocks,
        customStocks,
        addStock,
        addCustomStock,
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
