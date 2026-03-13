import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SMART_MONEY_SIGNALS, SmartMoneySignal } from "@/constants/smartMoney";

const SEEN_KEY = "@seen_signal_ids";

interface SignalContextType {
  signals: SmartMoneySignal[];
  newCount: number;
  markAllSeen: () => void;
  getSignalForStock: (stockId: string) => SmartMoneySignal | undefined;
}

const SignalContext = createContext<SignalContextType | null>(null);

export function SignalProvider({ children }: { children: ReactNode }) {
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY).then((raw) => {
      if (raw) {
        try {
          setSeenIds(new Set(JSON.parse(raw)));
        } catch {}
      }
    });
  }, []);

  const signals = SMART_MONEY_SIGNALS.map((s) => ({
    ...s,
    isNew: !seenIds.has(s.id),
  }));

  const newCount = signals.filter((s) => s.isNew).length;

  const markAllSeen = useCallback(() => {
    const all = new Set(SMART_MONEY_SIGNALS.map((s) => s.id));
    setSeenIds(all);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...all]));
  }, []);

  const getSignalForStock = useCallback(
    (stockId: string) => signals.find((s) => s.stockId === stockId),
    [signals]
  );

  return (
    <SignalContext.Provider value={{ signals, newCount, markAllSeen, getSignalForStock }}>
      {children}
    </SignalContext.Provider>
  );
}

export function useSignals() {
  const ctx = useContext(SignalContext);
  if (!ctx) throw new Error("useSignals must be inside SignalProvider");
  return ctx;
}
