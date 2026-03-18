import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STOCKS, StockInfo, Market } from "@/constants/stockData";
import { UniverseStock } from "@/constants/stockUniverse";

const STORAGE_KEY    = "@watchlist_ids_v3";
const CUSTOM_KEY     = "@custom_stocks_v3";
const STORAGE_KEY_V2 = "@watchlist_ids_v2";
const CUSTOM_KEY_V2  = "@custom_stocks_v2";
const DEFAULT_IDS    = STOCKS.map((s) => s.id);

function createStubFromUniverse(us: UniverseStock): StockInfo {
  const cp = us.currentPrice;
  return {
    id: us.id,
    name: us.name,
    ticker: us.ticker,
    market: us.market as Market,
    region: (us.market === "KOSPI" || us.market === "KOSDAQ") ? "국내장" : "미국장",
    grade: "중형주",
    themes: [us.sector],
    currentPrice: cp,
    currency: "KRW",
    description: `${us.name}(${us.ticker}) — ${us.sector} · 시총 ${us.marketCap}. 탐색 탭에서 추가한 종목입니다.`,
    splitEntries: [
      { ratio: 30, dropPercent: 5,  targetPrice: Math.round(cp * 0.95) },
      { ratio: 30, dropPercent: 10, targetPrice: Math.round(cp * 0.90) },
      { ratio: 40, dropPercent: 15, targetPrice: Math.round(cp * 0.85) },
    ],
    profitTargets: [
      { percent: 3,  price: Math.round(cp * 1.03) },
      { percent: 8,  price: Math.round(cp * 1.08) },
      { percent: 15, price: Math.round(cp * 1.15) },
    ],
    boxRange: {
      support:          Math.round(cp * 0.80),
      resistance:       Math.round(cp * 1.20),
      currentPosition:  "중간권",
    },
    forecasts: [
      { period: "1일 후",    price: Math.round(cp * 1.003),  changePercent: 0.3 },
      { period: "1주 후",    price: Math.round(cp * 1.012),  changePercent: 1.2 },
      { period: "1개월 후",  price: Math.round(cp * 1.035),  changePercent: 3.5 },
      { period: "3개월 후",  price: Math.round(cp * 1.08),   changePercent: 8.0 },
      { period: "6개월 후",  price: Math.round(cp * 1.15),   changePercent: 15.0 },
      { period: "12개월 후", price: Math.round(cp * 1.25),   changePercent: 25.0 },
      { period: "1800일",    price: Math.round(cp * 2.2),    changePercent: 120.0 },
    ],
    financials: {
      per: 0, pbr: 0, roe: 0, debtRatio: 0, revenueGrowth: 0,
      evaluation: "적정",
      summary: "탐색 탭에서 추가된 종목으로 상세 재무 데이터가 제한됩니다. 직접 분석을 권장합니다.",
    },
    dayFeatures: [],
    risk: {
      geopolitical:    "사용자 추가 종목 — 직접 리스크 분석 필요.",
      technicalBounce: "기술적 데이터가 제한됩니다.",
      strategy:        "직접 분석이 필요합니다.",
    },
    witchDayStrategy:    "사용자 추가 종목으로 상세 전략이 제한됩니다.",
    entryRecommendation: "직접 분석이 필요합니다.",
  };
}

interface WatchlistContextType {
  watchlistIds:    string[];
  watchlistStocks: StockInfo[];
  allKnownStocks:  StockInfo[];
  addStock:        (id: string) => void;
  removeStock:     (id: string) => void;
  addFromUniverse: (us: UniverseStock) => void;
  isInWatchlist:   (id: string) => boolean;
  reorder:         (newIds: string[]) => void;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlistIds,  setWatchlistIds]  = useState<string[]>(DEFAULT_IDS);
  const [customStocks,  setCustomStocks]  = useState<Record<string, StockInfo>>({});

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, CUSTOM_KEY, STORAGE_KEY_V2, CUSTOM_KEY_V2]).then(
      ([[, rawIds], [, rawCustom], [, rawIdsV2], [, rawCustomV2]]) => {
        let loadedIds: string[] | null  = null;
        let loadedCustom: Record<string, StockInfo> | null = null;

        // v3 우선 로드
        if (rawIds) {
          try {
            const parsed = JSON.parse(rawIds);
            if (Array.isArray(parsed)) loadedIds = parsed;
          } catch {}
        }
        if (rawCustom) {
          try {
            const parsed = JSON.parse(rawCustom);
            if (parsed && typeof parsed === "object") loadedCustom = parsed;
          } catch {}
        }

        // v3 없으면 v2에서 마이그레이션 (병합 로직 제거하고 그대로 로드)
        if (!loadedIds && rawIdsV2) {
          try {
            const parsed = JSON.parse(rawIdsV2);
            if (Array.isArray(parsed)) {
              loadedIds = parsed;
              AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
          } catch {}
        }
        if (!loadedCustom && rawCustomV2) {
          try {
            const parsed = JSON.parse(rawCustomV2);
            if (parsed && typeof parsed === "object") {
              loadedCustom = parsed;
              AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(parsed));
            }
          } catch {}
        }

        if (loadedIds) setWatchlistIds(loadedIds);
        if (loadedCustom) setCustomStocks(loadedCustom);
      }
    );
  }, []);

  const saveIds = useCallback((ids: string[]) => {
    setWatchlistIds(ids);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const saveCustom = useCallback((custom: Record<string, StockInfo>) => {
    setCustomStocks(custom);
    AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
  }, []);

  const addStock = useCallback((id: string) => {
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

  const addFromUniverse = useCallback((us: UniverseStock) => {
    const predefined = STOCKS.find((s) => s.ticker === us.ticker);
    const targetId   = predefined ? predefined.id : us.id;
    if (!predefined) {
      setCustomStocks((prev) => {
        if (prev[targetId]) return prev;
        const next = { ...prev, [targetId]: createStubFromUniverse({ ...us, id: targetId }) };
        AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
        return next;
      });
    }
    setWatchlistIds((prev) => {
      if (prev.includes(targetId)) return prev;
      const next = [...prev, targetId];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchlist = useCallback(
    (id: string) => watchlistIds.includes(id),
    [watchlistIds]
  );

  const reorder = useCallback((newIds: string[]) => saveIds(newIds), [saveIds]);

  const allKnownStocks: StockInfo[] = [
    ...STOCKS,
    ...Object.values(customStocks),
  ];

  const watchlistStocks = watchlistIds
    .map((id) => allKnownStocks.find((s) => s.id === id))
    .filter((s): s is StockInfo => s !== undefined);

  return (
    <WatchlistContext.Provider
      value={{ watchlistIds, watchlistStocks, allKnownStocks, addStock, removeStock, addFromUniverse, isInWatchlist, reorder }}
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
