import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PriceAlert {
  id: string;
  ticker: string;
  market: string;
  name: string;
  type: "above" | "below" | "rsi_overbought" | "rsi_oversold";
  targetPrice?: number;
  targetRsi?: number;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface TriggeredAlert {
  alert: PriceAlert;
  currentPrice: number;
}

interface AlertContextValue {
  alerts: PriceAlert[];
  triggeredAlert: TriggeredAlert | null;
  addAlert: (alert: Omit<PriceAlert, "id" | "triggered" | "createdAt">) => void;
  removeAlert: (id: string) => void;
  dismissTriggered: () => void;
  checkPrices: (prices: Record<string, { priceKRW: number; rsi?: number }>) => void;
}

const AlertContext = createContext<AlertContextValue>({
  alerts: [],
  triggeredAlert: null,
  addAlert: () => {},
  removeAlert: () => {},
  dismissTriggered: () => {},
  checkPrices: () => {},
});

const STORAGE_KEY = "@price_alerts_v1";

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [triggeredAlert, setTriggeredAlert] = useState<TriggeredAlert | null>(null);
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setAlerts(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = (list: PriceAlert[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  };

  const addAlert = useCallback((alert: Omit<PriceAlert, "id" | "triggered" | "createdAt">) => {
    setAlerts((prev) => {
      const next = [
        ...prev,
        { ...alert, id: Date.now().toString(), triggered: false, createdAt: new Date().toISOString() },
      ];
      persist(next);
      return next;
    });
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      persist(next);
      checkedRef.current.delete(id);
      return next;
    });
  }, []);

  const dismissTriggered = useCallback(() => {
    setTriggeredAlert(null);
  }, []);

  const checkPrices = useCallback(
    (prices: Record<string, { priceKRW: number; rsi?: number }>) => {
      setAlerts((prev) => {
        let changed = false;
        const next = prev.map((alert) => {
          if (alert.triggered) return alert;
          if (checkedRef.current.has(alert.id)) return alert;

          const key = `${alert.ticker}:${alert.market}`;
          const info = prices[key];
          if (!info) return alert;

          let shouldTrigger = false;
          if (alert.type === "above" && alert.targetPrice && info.priceKRW >= alert.targetPrice) {
            shouldTrigger = true;
          } else if (alert.type === "below" && alert.targetPrice && info.priceKRW <= alert.targetPrice) {
            shouldTrigger = true;
          } else if (alert.type === "rsi_overbought" && info.rsi && info.rsi >= (alert.targetRsi ?? 70)) {
            shouldTrigger = true;
          } else if (alert.type === "rsi_oversold" && info.rsi && info.rsi <= (alert.targetRsi ?? 30)) {
            shouldTrigger = true;
          }

          if (shouldTrigger) {
            checkedRef.current.add(alert.id);
            setTriggeredAlert({ alert: { ...alert, triggered: true }, currentPrice: info.priceKRW });
            changed = true;
            return { ...alert, triggered: true, triggeredAt: new Date().toISOString() };
          }
          return alert;
        });
        if (changed) persist(next);
        return next;
      });
    },
    []
  );

  return (
    <AlertContext.Provider value={{ alerts, triggeredAlert, addAlert, removeAlert, dismissTriggered, checkPrices }}>
      {children}
    </AlertContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertContext);
