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
import {
  StockInfo,
  StockGrade,
  MarketRegion,
  Market,
  SplitEntry,
  ProfitTarget,
  BoxRange,
  PriceForecast,
  FinancialAnalysis,
  DayFeature,
  RiskInfo,
} from "@/constants/stockData";

const ENRICH_KEY = "@enriched_v1";
const FRESH_TTL  = 24 * 60 * 60 * 1000; // 24시간

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export interface EnrichedAnalysis {
  stockId:             string;
  enrichedAt:          number;
  ticker:              string;
  market:              string;
  name:                string;
  grade:               StockGrade;
  region:              MarketRegion;
  themes:              string[];
  description:         string;
  splitEntries:        SplitEntry[];
  profitTargets:       ProfitTarget[];
  boxRange:            BoxRange;
  forecasts:           PriceForecast[];
  financials:          FinancialAnalysis;
  dayFeatures:         DayFeature[];
  risk:                RiskInfo;
  witchDayStrategy:    string;
  entryRecommendation: string;
}

interface EnrichmentContextType {
  enrichedMap:    Record<string, EnrichedAnalysis>;
  enrichingIds:   string[];
  failedIds:      string[];
  enrichStock:    (stockId: string, ticker: string, market: string) => void;
  reEnrichStock:  (stockId: string, ticker: string, market: string) => void;
  getEnriched:    (stockId: string) => EnrichedAnalysis | null;
  isEnriching:    (stockId: string) => boolean;
  hasFailed:      (stockId: string) => boolean;
  buildStockInfo: (base: StockInfo, enriched: EnrichedAnalysis) => StockInfo;
}

const EnrichmentContext = createContext<EnrichmentContextType | null>(null);

export function EnrichmentProvider({ children }: { children: ReactNode }) {
  const [enrichedMap,  setEnrichedMap]  = useState<Record<string, EnrichedAnalysis>>({});
  const [enrichingIds, setEnrichingIds] = useState<string[]>([]);
  const [failedIds,    setFailedIds]    = useState<string[]>([]);

  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(ENRICH_KEY).then((raw) => {
      if (raw) {
        try { setEnrichedMap(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const runEnrichment = useCallback((stockId: string, ticker: string, market: string, force = false) => {
    if (inFlightRef.current.has(stockId)) return;

    if (!force) {
      const existing = enrichedMap[stockId];
      if (existing && Date.now() - existing.enrichedAt < FRESH_TTL) return;
    }

    inFlightRef.current.add(stockId);
    setEnrichingIds((prev) => [...new Set([...prev, stockId])]);
    setFailedIds((prev) => prev.filter((id) => id !== stockId));

    fetch(`${API_BASE}/stocks/analyze?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const enriched: EnrichedAnalysis = {
          ...data,
          stockId,
          enrichedAt: Date.now(),
        };
        setEnrichedMap((prev) => {
          const next = { ...prev, [stockId]: enriched };
          AsyncStorage.setItem(ENRICH_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
      })
      .catch(() => {
        setFailedIds((prev) => [...new Set([...prev, stockId])]);
      })
      .finally(() => {
        inFlightRef.current.delete(stockId);
        setEnrichingIds((prev) => prev.filter((id) => id !== stockId));
      });
  }, [enrichedMap]);

  const enrichStock = useCallback(
    (stockId: string, ticker: string, market: string) => runEnrichment(stockId, ticker, market, false),
    [runEnrichment]
  );

  const reEnrichStock = useCallback(
    (stockId: string, ticker: string, market: string) => runEnrichment(stockId, ticker, market, true),
    [runEnrichment]
  );

  const getEnriched = useCallback(
    (stockId: string): EnrichedAnalysis | null => {
      const data = enrichedMap[stockId];
      if (!data) return null;
      if (Date.now() - data.enrichedAt > FRESH_TTL) return null;
      return data;
    },
    [enrichedMap]
  );

  const isEnriching = useCallback(
    (stockId: string) => enrichingIds.includes(stockId),
    [enrichingIds]
  );

  const hasFailed = useCallback(
    (stockId: string) => failedIds.includes(stockId),
    [failedIds]
  );

  const buildStockInfo = useCallback(
    (base: StockInfo, enriched: EnrichedAnalysis): StockInfo => ({
      id:                  base.id,
      name:                enriched.name || base.name,
      ticker:              base.ticker,
      market:              base.market as Market,
      region:              enriched.region,
      grade:               enriched.grade,
      themes:              enriched.themes.length > 0 ? enriched.themes : base.themes,
      currentPrice:        base.currentPrice,
      currency:            "KRW",
      description:         enriched.description,
      splitEntries:        enriched.splitEntries,
      profitTargets:       enriched.profitTargets,
      boxRange:            enriched.boxRange,
      forecasts:           enriched.forecasts,
      financials:          enriched.financials,
      dayFeatures:         enriched.dayFeatures,
      risk:                enriched.risk,
      witchDayStrategy:    enriched.witchDayStrategy,
      entryRecommendation: enriched.entryRecommendation,
    }),
    []
  );

  return (
    <EnrichmentContext.Provider
      value={{ enrichedMap, enrichingIds, failedIds, enrichStock, reEnrichStock, getEnriched, isEnriching, hasFailed, buildStockInfo }}
    >
      {children}
    </EnrichmentContext.Provider>
  );
}

export function useEnrichment() {
  const ctx = useContext(EnrichmentContext);
  if (!ctx) throw new Error("useEnrichment must be inside EnrichmentProvider");
  return ctx;
}
