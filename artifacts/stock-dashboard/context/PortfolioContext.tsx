import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PortfolioPosition {
  id: string;
  stockId: string;
  ticker: string;
  market: string;
  name: string;
  shares: number;
  avgPrice: number;
  addedAt: string;
}

interface PortfolioContextValue {
  positions: PortfolioPosition[];
  addPosition: (pos: Omit<PortfolioPosition, "id" | "addedAt">) => void;
  updatePosition: (id: string, shares: number, avgPrice: number) => void;
  removePosition: (id: string) => void;
}

const PortfolioContext = createContext<PortfolioContextValue>({
  positions: [],
  addPosition: () => {},
  updatePosition: () => {},
  removePosition: () => {},
});

const STORAGE_KEY = "@portfolio_v2";

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setPositions(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = (list: PortfolioPosition[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  };

  const addPosition = useCallback((pos: Omit<PortfolioPosition, "id" | "addedAt">) => {
    setPositions((prev) => {
      const existing = prev.find(
        (p) => p.ticker === pos.ticker && p.market === pos.market
      );
      let next: PortfolioPosition[];
      if (existing) {
        const totalCost = existing.avgPrice * existing.shares + pos.avgPrice * pos.shares;
        const totalShares = existing.shares + pos.shares;
        next = prev.map((p) =>
          p.id === existing.id
            ? { ...p, shares: totalShares, avgPrice: Math.round(totalCost / totalShares) }
            : p
        );
      } else {
        next = [
          ...prev,
          { ...pos, id: Date.now().toString(), addedAt: new Date().toISOString() },
        ];
      }
      persist(next);
      return next;
    });
  }, []);

  const updatePosition = useCallback((id: string, shares: number, avgPrice: number) => {
    setPositions((prev) => {
      const next = prev.map((p) =>
        p.id === id ? { ...p, shares, avgPrice } : p
      );
      persist(next);
      return next;
    });
  }, []);

  const removePosition = useCallback((id: string) => {
    setPositions((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return (
    <PortfolioContext.Provider value={{ positions, addPosition, updatePosition, removePosition }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);
