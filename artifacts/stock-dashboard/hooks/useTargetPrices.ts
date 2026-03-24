import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@target_prices_v1";

export interface TargetPrice {
  ticker:    string;
  buyPrice:  number | null;  // 매수 목표가 (지지선)
  sellPrice: number | null;  // 매도 목표가 (저항선)
}

type TargetMap = Record<string, TargetPrice>;

export function useTargetPrices() {
  const [targets, setTargets] = useState<TargetMap>({});
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setTargets(JSON.parse(raw)); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback((next: TargetMap) => {
    setTargets(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setTarget = useCallback((ticker: string, buy: number | null, sell: number | null) => {
    setTargets(prev => {
      const next: TargetMap = {
        ...prev,
        [ticker]: { ticker, buyPrice: buy, sellPrice: sell },
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearTarget = useCallback((ticker: string) => {
    setTargets(prev => {
      const next = { ...prev };
      delete next[ticker];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getTarget = useCallback((ticker: string): TargetPrice | null => {
    return targets[ticker] ?? null;
  }, [targets]);

  /** 신호 계산: buy/sell/hold/unset */
  const getSignal = useCallback((ticker: string, currentPrice: number): "buy" | "sell" | "hold" | "unset" => {
    const t = targets[ticker];
    if (!t || (t.buyPrice == null && t.sellPrice == null)) return "unset";
    if (t.buyPrice  != null && currentPrice <= t.buyPrice)  return "buy";
    if (t.sellPrice != null && currentPrice >= t.sellPrice) return "sell";
    return "hold";
  }, [targets]);

  return { targets, loaded, setTarget, clearTarget, getTarget, getSignal };
}
