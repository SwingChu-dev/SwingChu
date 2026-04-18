import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Position,
  Portfolio,
  Category,
  Sector,
  PendingEntry,
  CooldownSave,
} from "@/types/portfolio";
import { CATEGORY_LIMITS } from "@/constants/rules";

const POSITIONS_KEY     = "@portfolio_positions_v1";
const PENDING_KEY       = "@portfolio_pending_v1";
const SAVES_KEY         = "@portfolio_cooldown_saves_v1";
const SETTINGS_KEY      = "@portfolio_settings_v1";
const MONTH_START_KEY   = "@portfolio_month_start_v1";

interface PortfolioSettings {
  cashBalanceKRW: number;
  fxRateUSDKRW:   number;
}

const DEFAULT_SETTINGS: PortfolioSettings = {
  cashBalanceKRW: 0,
  fxRateUSDKRW:   1400,
};

interface PortfolioContextValue {
  loaded:           boolean;
  positions:        Position[];
  portfolio:        Portfolio;
  settings:         PortfolioSettings;
  pendingEntries:   PendingEntry[];
  cooldownSaves:    CooldownSave[];
  /** 최근 매수 평균 사이즈 (KRW 환산) */
  avgPositionSize:  number;

  addPosition:      (p: Omit<Position, "id">) => Promise<Position>;
  updatePosition:   (id: string, patch: Partial<Position>) => Promise<void>;
  removePosition:   (id: string) => Promise<void>;
  markImpulse:      (id: string, isImpulse: boolean) => Promise<void>;

  setCashBalance:   (krw: number) => Promise<void>;
  setFxRate:        (rate: number) => Promise<void>;

  addPendingEntry:    (e: Omit<PendingEntry, "id" | "createdAt" | "status">) => Promise<PendingEntry>;
  cancelPendingEntry: (id: string, reason: string, savedKRW: number | null) => Promise<void>;
  executePendingEntry:(id: string) => Promise<void>;
}

const Ctx = createContext<PortfolioContextValue | null>(null);

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function positionValueKRW(p: Position, fx: number): number {
  const v = p.avgPrice * p.quantity;
  return p.currency === "USD" ? v * fx : v;
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded]       = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pending, setPending]     = useState<PendingEntry[]>([]);
  const [saves, setSaves]         = useState<CooldownSave[]>([]);
  const [settings, setSettings]   = useState<PortfolioSettings>(DEFAULT_SETTINGS);
  const [monthStart, setMonthStart] = useState<{ ym: string; value: number }>({
    ym: ymKey(new Date()),
    value: 0,
  });

  // ── 초기 로드 ──
  useEffect(() => {
    (async () => {
      try {
        const [rawPos, rawPend, rawSav, rawSet, rawMonth] = await Promise.all([
          AsyncStorage.getItem(POSITIONS_KEY),
          AsyncStorage.getItem(PENDING_KEY),
          AsyncStorage.getItem(SAVES_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(MONTH_START_KEY),
        ]);
        if (rawPos)  setPositions(JSON.parse(rawPos));
        if (rawPend) setPending(JSON.parse(rawPend));
        if (rawSav)  setSaves(JSON.parse(rawSav));
        if (rawSet)  setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSet) });
        if (rawMonth) setMonthStart(JSON.parse(rawMonth));
      } catch (e) {
        console.warn("[PortfolioContext] load failed", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ── 영속화 ──
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  }, [positions, loaded]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  }, [pending, loaded]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  }, [saves, loaded]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, loaded]);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(MONTH_START_KEY, JSON.stringify(monthStart));
  }, [monthStart, loaded]);

  // ── 포트폴리오 집계 ──
  const portfolio = useMemo<Portfolio>(() => {
    const fx = settings.fxRateUSDKRW;
    const positionsValue = positions.reduce((s, p) => s + positionValueKRW(p, fx), 0);
    const totalValue     = positionsValue + settings.cashBalanceKRW;

    const categoryAllocation: Record<Category, number> = {
      A_CORE: 0, B_EVENT: 0, C_CONTRARIAN: 0, D_SPECULATIVE: 0,
    };
    const sectorAllocation: Partial<Record<Sector, number>> = {};

    if (totalValue > 0) {
      for (const p of positions) {
        const pct = (positionValueKRW(p, fx) / totalValue) * 100;
        categoryAllocation[p.category] += pct;
        for (const sector of p.sectors) {
          sectorAllocation[sector] = (sectorAllocation[sector] ?? 0) + pct;
        }
      }
    }

    const monthValueRef = monthStart.value > 0 ? monthStart.value : totalValue;
    const monthlyPnL    = totalValue - monthValueRef;
    const monthlyPnLPct = monthValueRef > 0 ? (monthlyPnL / monthValueRef) * 100 : 0;

    return {
      totalValue,
      cashBalance:        settings.cashBalanceKRW,
      positions,
      categoryAllocation,
      sectorAllocation,
      monthlyPnL,
      monthlyPnLPercent:  monthlyPnLPct,
      monthStartValue:    monthValueRef,
    };
  }, [positions, settings, monthStart]);

  // 월 첫 진입 시 monthStart 자동 캡처
  useEffect(() => {
    if (!loaded) return;
    const nowKey = ymKey(new Date());
    if (monthStart.ym !== nowKey) {
      setMonthStart({ ym: nowKey, value: portfolio.totalValue });
    } else if (monthStart.value === 0 && portfolio.totalValue > 0) {
      setMonthStart({ ym: nowKey, value: portfolio.totalValue });
    }
  }, [loaded, portfolio.totalValue, monthStart.ym, monthStart.value]);

  // ── 평균 포지션 사이즈 (최근 20건) ──
  const avgPositionSize = useMemo(() => {
    const sorted = [...positions].sort((a, b) => b.entryDate - a.entryDate).slice(0, 20);
    if (sorted.length === 0) return 0;
    const sum = sorted.reduce((s, p) => s + positionValueKRW(p, settings.fxRateUSDKRW), 0);
    return sum / sorted.length;
  }, [positions, settings.fxRateUSDKRW]);

  // ── Actions ──
  const addPosition = useCallback(async (p: Omit<Position, "id">) => {
    const newPos: Position = { ...p, id: genId() };
    setPositions(prev => [newPos, ...prev]);
    return newPos;
  }, []);

  const updatePosition = useCallback(async (id: string, patch: Partial<Position>) => {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const removePosition = useCallback(async (id: string) => {
    setPositions(prev => prev.filter(p => p.id !== id));
  }, []);

  const markImpulse = useCallback(async (id: string, isImpulse: boolean) => {
    setPositions(prev => prev.map(p => p.id === id ? { ...p, isImpulseBuy: isImpulse } : p));
  }, []);

  const setCashBalance = useCallback(async (krw: number) => {
    setSettings(s => ({ ...s, cashBalanceKRW: Math.max(0, krw) }));
  }, []);
  const setFxRate = useCallback(async (rate: number) => {
    setSettings(s => ({ ...s, fxRateUSDKRW: Math.max(1, rate) }));
  }, []);

  const addPendingEntry = useCallback(async (
    e: Omit<PendingEntry, "id" | "createdAt" | "status">,
  ) => {
    const entry: PendingEntry = {
      ...e,
      id: genId(),
      createdAt: Date.now(),
      status: "PENDING",
    };
    setPending(prev => [entry, ...prev]);
    return entry;
  }, []);

  const cancelPendingEntry = useCallback(async (
    id: string, reason: string, savedKRW: number | null,
  ) => {
    const target = pending.find(p => p.id === id);
    if (!target) return;
    setPending(prev => prev.map(p =>
      p.id === id ? { ...p, status: "CANCELLED" } : p,
    ));
    setSaves(prev => ([
      {
        id:               genId(),
        pendingEntryId:   id,
        ticker:           target.request.ticker,
        targetAmount:     target.request.targetAmount,
        cancelReason:     reason,
        estimatedSaved:   savedKRW != null && Number.isFinite(savedKRW) && savedKRW >= 0
                            ? savedKRW : null,
        createdAt:        Date.now(),
      },
      ...prev,
    ]));
  }, [pending]);

  const executePendingEntry = useCallback(async (id: string) => {
    setPending(prev => prev.map(p => p.id === id ? { ...p, status: "EXECUTED" } : p));
  }, []);

  const value: PortfolioContextValue = {
    loaded,
    positions,
    portfolio,
    settings,
    pendingEntries: pending,
    cooldownSaves:  saves,
    avgPositionSize,
    addPosition,
    updatePosition,
    removePosition,
    markImpulse,
    setCashBalance,
    setFxRate,
    addPendingEntry,
    cancelPendingEntry,
    executePendingEntry,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function categoryTargetAlloc(c: Category): number {
  return CATEGORY_LIMITS.find(x => x.category === c)?.targetAllocation ?? 0;
}
