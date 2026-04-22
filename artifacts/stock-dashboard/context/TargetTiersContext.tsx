import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { USD_KRW_RATE } from "@/constants/stockData";
import { enrichTierContext } from "@/utils/tierContextEnrichment";

export type TierKey = "tier1" | "tier2" | "tier3";

export interface TargetTierSet {
  ticker:    string;             // upper-case
  market:    string;             // NASDAQ / KOSPI / KOSDAQ
  name:      string;
  currency:  "USD" | "KRW";      // 입력한 가격의 통화
  tier1:     number | null;      // 1차 탐색 (-4% 수준)
  tier2:     number | null;      // 2차 확신 (-7% 수준)
  tier3:     number | null;      // 3차 기회 (목표가)
  enabled:   boolean;
  lastTriggered: { tier1?: number; tier2?: number; tier3?: number };  // ms timestamp
  armed:        { tier1?: boolean; tier2?: boolean; tier3?: boolean }; // re-arm 상태
  updatedAt: string;
}

type TierMap = Record<string, TargetTierSet>;  // key = `${ticker}:${market}`

interface TargetTiersValue {
  tiers: TierMap;
  loaded: boolean;
  getTiers:    (ticker: string, market: string) => TargetTierSet | null;
  saveTiers:   (input: Omit<TargetTierSet, "updatedAt" | "lastTriggered" | "armed">) => void;
  clearTiers:  (ticker: string, market: string) => void;
  toggleEnabled: (ticker: string, market: string) => void;
  checkPricesForTiers: (prices: Record<string, { priceKRW: number }>) => void;
}

const TargetTiersContext = createContext<TargetTiersValue>({
  tiers: {}, loaded: false,
  getTiers: () => null, saveTiers: () => {}, clearTiers: () => {},
  toggleEnabled: () => {}, checkPricesForTiers: () => {},
});

const STORAGE_KEY = "@target_tiers_v1";
const RE_ARM_BUFFER_PCT = 2;       // 가격이 타겟+2% 위로 회복하면 다시 무장
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6시간 내 같은 티어 재발사 금지

const TIER_META: Record<TierKey, { label: string; emoji: string }> = {
  tier1: { label: "1차 탐색", emoji: "🟢" },
  tier2: { label: "2차 확신", emoji: "🟡" },
  tier3: { label: "3차 기회", emoji: "🔥" },
};

function tierPriceKRW(set: TargetTierSet, tier: TierKey): number | null {
  const v = set[tier];
  if (v == null) return null;
  return set.currency === "USD" ? v * USD_KRW_RATE : v;
}

async function fireTierNotification(
  set: TargetTierSet, tier: TierKey, currentPriceKRW: number,
) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const meta = TIER_META[tier];
    const isUSD = set.currency === "USD";
    const tierVal = set[tier];
    const tierStr = tierVal == null ? "—" : isUSD ? `$${tierVal.toFixed(2)}` : `₩${Math.round(tierVal).toLocaleString()}`;
    const curStr  = isUSD
      ? `$${(currentPriceKRW / USD_KRW_RATE).toFixed(2)}`
      : `₩${Math.round(currentPriceKRW).toLocaleString()}`;

    // 컨텍스트 합성 (실적·FOMC·애널리스트). 실패해도 기본 알림은 발송.
    let contextBlock = "";
    let severity: "clear" | "caution" | "warn" = "clear";
    try {
      const ctx = await enrichTierContext({ ticker: set.ticker, market: set.market, currentPriceKRW });
      severity = ctx.severity;
      contextBlock = "\n" + ctx.flags.join(" · ") + "\n" + ctx.recommendation;
    } catch {}

    const sevEmoji = severity === "warn" ? "🛑" : severity === "caution" ? "⚠️" : meta.emoji;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${sevEmoji} ${meta.label} 도달 — ${set.name}`,
        body:  `${set.ticker} 현재가 ${curStr} · 타겟 ${tierStr}${contextBlock}`,
        sound: true,
        data:  { type: "tier_trigger", ticker: set.ticker, market: set.market, tier, severity },
      },
      trigger: Platform.OS === "android"
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: "price-alerts" } as Notifications.TimeIntervalTriggerInput
        : null,
    });
  } catch {}
}

export function TargetTiersProvider({ children }: { children: React.ReactNode }) {
  const [tiers, setTiers]   = useState<TierMap>({});
  const [loaded, setLoaded] = useState(false);
  const tiersRef            = useRef<TierMap>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed: TierMap = JSON.parse(raw);
          setTiers(parsed);
          tiersRef.current = parsed;
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = (next: TierMap) => {
    tiersRef.current = next;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const keyOf = (ticker: string, market: string) => `${ticker.toUpperCase()}:${market}`;

  const getTiers = useCallback((ticker: string, market: string) => {
    return tiers[keyOf(ticker, market)] ?? null;
  }, [tiers]);

  const saveTiers = useCallback((input: Omit<TargetTierSet, "updatedAt" | "lastTriggered" | "armed">) => {
    setTiers(prev => {
      const k = keyOf(input.ticker, input.market);
      const existing = prev[k];
      // 가격이 바뀐 티어는 무장 + 쿨다운 리셋 (새 타겟에 대해 즉시 발사 가능하게)
      const armed: TargetTierSet["armed"] = {
        tier1: existing?.tier1 === input.tier1 ? (existing?.armed.tier1 ?? true) : true,
        tier2: existing?.tier2 === input.tier2 ? (existing?.armed.tier2 ?? true) : true,
        tier3: existing?.tier3 === input.tier3 ? (existing?.armed.tier3 ?? true) : true,
      };
      const lastTriggered: TargetTierSet["lastTriggered"] = {
        tier1: existing?.tier1 === input.tier1 ? existing?.lastTriggered.tier1 : undefined,
        tier2: existing?.tier2 === input.tier2 ? existing?.lastTriggered.tier2 : undefined,
        tier3: existing?.tier3 === input.tier3 ? existing?.lastTriggered.tier3 : undefined,
      };
      const next: TargetTierSet = {
        ...input,
        ticker: input.ticker.toUpperCase(),
        lastTriggered,
        armed,
        updatedAt: new Date().toISOString(),
      };
      const updated = { ...prev, [k]: next };
      persist(updated);
      return updated;
    });
  }, []);

  const clearTiers = useCallback((ticker: string, market: string) => {
    setTiers(prev => {
      const next = { ...prev };
      delete next[keyOf(ticker, market)];
      persist(next);
      return next;
    });
  }, []);

  const toggleEnabled = useCallback((ticker: string, market: string) => {
    setTiers(prev => {
      const k = keyOf(ticker, market);
      const cur = prev[k];
      if (!cur) return prev;
      const next = { ...prev, [k]: { ...cur, enabled: !cur.enabled, updatedAt: new Date().toISOString() } };
      persist(next);
      return next;
    });
  }, []);

  const checkPricesForTiers = useCallback((prices: Record<string, { priceKRW: number }>) => {
    const current = tiersRef.current;
    let changed = false;
    const next: TierMap = { ...current };
    const now = Date.now();

    for (const [k, set] of Object.entries(current)) {
      const info = prices[k];
      if (!info || !set.enabled) continue;
      const priceKRW = info.priceKRW;

      const armed = { ...set.armed };
      const lastTriggered = { ...set.lastTriggered };
      let touched = false;

      (["tier1", "tier2", "tier3"] as TierKey[]).forEach((t) => {
        const targetKRW = tierPriceKRW(set, t);
        if (targetKRW == null) return;

        // 가격이 타겟+버퍼 이상으로 회복 → 재무장
        if (!armed[t] && priceKRW > targetKRW * (1 + RE_ARM_BUFFER_PCT / 100)) {
          armed[t] = true;
          touched = true;
        }

        // 무장 상태 + 가격이 타겟 이하로 진입 + 쿨다운 종료 → 발사
        const lastT = lastTriggered[t] ?? 0;
        if (armed[t] && priceKRW <= targetKRW && (now - lastT) > COOLDOWN_MS) {
          armed[t] = false;
          lastTriggered[t] = now;
          touched = true;
          fireTierNotification(set, t, priceKRW).catch(() => {});
        }
      });

      if (touched) {
        next[k] = { ...set, armed, lastTriggered };
        changed = true;
      }
    }

    if (changed) {
      setTiers(next);
      persist(next);
    }
  }, []);

  return (
    <TargetTiersContext.Provider value={{
      tiers, loaded, getTiers, saveTiers, clearTiers, toggleEnabled, checkPricesForTiers,
    }}>
      {children}
    </TargetTiersContext.Provider>
  );
}

export const useTargetTiers = () => useContext(TargetTiersContext);
export const TIER_LABELS: Record<TierKey, string> = {
  tier1: "1차 탐색",
  tier2: "2차 확신",
  tier3: "3차 기회",
};
