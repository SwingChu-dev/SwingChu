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
  ClosedTrade,
  ExitType,
  DeviationReason,
} from "@/types/portfolio";
import { CATEGORY_LIMITS } from "@/constants/rules";
import { scheduleCooldownEnd, cancelScheduledNotification } from "@/utils/notifications";
import { sendStopLossNotification, sendTakeProfitNotification } from "@/utils/positionAlerts";

const POSITIONS_KEY     = "@portfolio_positions_v1";
const PENDING_KEY       = "@portfolio_pending_v1";
const SAVES_KEY         = "@portfolio_cooldown_saves_v1";
const SETTINGS_KEY      = "@portfolio_settings_v1";
const MONTH_START_KEY   = "@portfolio_month_start_v1";
const CLOSED_KEY        = "@portfolio_closed_trades_v1";

export interface SellRequest {
  positionId:      string;
  exitPrice:       number;        // 포지션 통화 기준
  quantity:        number;
  exitType:        ExitType;
  followedRules:   boolean;
  deviationReason: DeviationReason | null;
  deviationNote:   string;
  nextChange:      string;
}

interface PortfolioSettings {
  cashBalanceKRW: number;
  cashBalanceUSD: number;
  fxRateUSDKRW:   number;
}

const DEFAULT_SETTINGS: PortfolioSettings = {
  cashBalanceKRW: 0,
  cashBalanceUSD: 0,
  fxRateUSDKRW:   1400,
};

interface PortfolioContextValue {
  loaded:           boolean;
  positions:        Position[];
  portfolio:        Portfolio;
  settings:         PortfolioSettings;
  pendingEntries:   PendingEntry[];
  cooldownSaves:    CooldownSave[];
  closedTrades:     ClosedTrade[];
  /** 최근 매수 평균 사이즈 (KRW 환산) */
  avgPositionSize:  number;

  addPosition:      (p: Omit<Position, "id">) => Promise<Position>;
  updatePosition:   (id: string, patch: Partial<Position>) => Promise<void>;
  removePosition:   (id: string) => Promise<void>;
  markImpulse:      (id: string, isImpulse: boolean) => Promise<void>;

  setCashBalance:   (krw: number) => Promise<void>;
  setCashBalanceUSD:(usd: number) => Promise<void>;
  setFxRate:        (rate: number) => Promise<void>;
  /** 매수 체결: 보유 등록 + 현금 자동 차감 (해당 통화에서) */
  executeBuy:       (p: Omit<Position, "id">) => Promise<Position>;
  /** 매도 체결: 보유 수량 차감(전량 시 삭제) + 현금 환입 + ClosedTrade 기록 */
  sellPosition:     (req: SellRequest) => Promise<ClosedTrade>;

  /** 외부(StockPriceContext)에서 현재가를 주입해 손절/익절 알림 발사 */
  checkPositionAlerts: (priceMap: Record<string, { priceKRW: number }>) => void;

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
  const [closed, setClosed]       = useState<ClosedTrade[]>([]);
  const [settings, setSettings]   = useState<PortfolioSettings>(DEFAULT_SETTINGS);
  const [monthStart, setMonthStart] = useState<{ ym: string; value: number }>({
    ym: ymKey(new Date()),
    value: 0,
  });

  // ── 초기 로드 ──
  useEffect(() => {
    (async () => {
      try {
        const [rawPos, rawPend, rawSav, rawSet, rawMonth, rawClosed] = await Promise.all([
          AsyncStorage.getItem(POSITIONS_KEY),
          AsyncStorage.getItem(PENDING_KEY),
          AsyncStorage.getItem(SAVES_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(MONTH_START_KEY),
          AsyncStorage.getItem(CLOSED_KEY),
        ]);
        if (rawPos) {
          // 마이그레이션: 시장과 통화 불일치 자동 보정
          // (NASDAQ → USD, KOSPI/KOSDAQ → KRW)
          const parsed: Position[] = JSON.parse(rawPos);
          const fixed = parsed.map(p => {
            const correct = p.market === "NASDAQ" ? "USD" : "KRW";
            return p.currency === correct ? p : { ...p, currency: correct as Position["currency"] };
          });
          setPositions(fixed);
        }
        if (rawPend)   setPending(JSON.parse(rawPend));
        if (rawSav)    setSaves(JSON.parse(rawSav));
        if (rawSet)    setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSet) });
        if (rawMonth)  setMonthStart(JSON.parse(rawMonth));
        if (rawClosed) setClosed(JSON.parse(rawClosed));
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
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(CLOSED_KEY, JSON.stringify(closed));
  }, [closed, loaded]);

  // ── 포트폴리오 집계 ──
  const portfolio = useMemo<Portfolio>(() => {
    const fx = settings.fxRateUSDKRW;
    const positionsValue = positions.reduce((s, p) => s + positionValueKRW(p, fx), 0);
    const totalValue     = positionsValue + settings.cashBalanceKRW + settings.cashBalanceUSD * fx;

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

  // 부팅 시 알림 재예약 (앱/기기 재시작으로 사라질 수 있어서)
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      const now = Date.now();
      const updates: Array<{ id: string; nid: string }> = [];
      for (const p of pending) {
        if (p.status !== "PENDING") continue;
        if (p.cooldownUntil <= now) continue;
        if (p.notificationId) continue;
        const nid = await scheduleCooldownEnd(
          p.id, p.request.ticker, p.request.name, p.cooldownUntil,
        );
        if (nid) updates.push({ id: p.id, nid });
      }
      if (updates.length > 0) {
        setPending(prev => prev.map(p => {
          const u = updates.find(x => x.id === p.id);
          return u ? { ...p, notificationId: u.nid } : p;
        }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

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
  const setCashBalanceUSD = useCallback(async (usd: number) => {
    setSettings(s => ({ ...s, cashBalanceUSD: Math.max(0, usd) }));
  }, []);
  const setFxRate = useCallback(async (rate: number) => {
    setSettings(s => ({ ...s, fxRateUSDKRW: Math.max(1, rate) }));
  }, []);

  const executeBuy = useCallback(async (p: Omit<Position, "id">) => {
    const newPos: Position = { ...p, id: genId() };
    const cost = p.avgPrice * p.quantity;
    setPositions(prev => [newPos, ...prev]);
    setSettings(s => p.currency === "USD"
      ? { ...s, cashBalanceUSD: Math.max(0, s.cashBalanceUSD - cost) }
      : { ...s, cashBalanceKRW: Math.max(0, s.cashBalanceKRW - cost) });
    return newPos;
  }, []);

  const sellPosition = useCallback(async (req: SellRequest): Promise<ClosedTrade> => {
    const pos = positions.find(p => p.id === req.positionId);
    if (!pos) throw new Error("포지션을 찾을 수 없습니다.");
    const qtySold = Math.min(req.quantity, pos.quantity);
    if (qtySold <= 0 || !Number.isFinite(req.exitPrice) || req.exitPrice <= 0) {
      throw new Error("청산 수량/가격이 올바르지 않습니다.");
    }
    const fx = settings.fxRateUSDKRW;
    const proceeds = req.exitPrice * qtySold;
    const cost     = pos.avgPrice  * qtySold;
    const realized = proceeds - cost;
    const realizedKRW = pos.currency === "USD" ? realized * fx : realized;
    const pnlPct   = (req.exitPrice / pos.avgPrice - 1) * 100;
    const holdDays = Math.max(0, Math.floor((Date.now() - pos.entryDate) / 86400_000));

    const trade: ClosedTrade = {
      id:             genId(),
      positionId:     pos.id,
      ticker:         pos.ticker,
      name:           pos.name,
      market:         pos.market,
      category:       pos.category,
      sectors:        pos.sectors,
      currency:       pos.currency,
      avgEntryPrice:  pos.avgPrice,
      entryDate:      pos.entryDate,
      entryReason:    pos.entryReason,
      exitDate:       Date.now(),
      exitPrice:      req.exitPrice,
      quantitySold:   qtySold,
      exitType:       req.exitType,
      realizedPnL:    realized,
      realizedPnLKRW: realizedKRW,
      pnlPercent:     pnlPct,
      holdingDays:    holdDays,
      followedRules:  req.followedRules,
      deviationReason:req.followedRules ? null : req.deviationReason,
      deviationNote:  req.deviationNote,
      nextChange:     req.nextChange,
      isImpulseEntry: pos.isImpulseBuy,
    };

    // 보유 차감 / 전량 청산 시 삭제
    setPositions(prev => {
      return prev
        .map(p => p.id === pos.id ? { ...p, quantity: p.quantity - qtySold } : p)
        .filter(p => p.quantity > 0);
    });

    // 현금 환입 (해당 통화)
    setSettings(s => pos.currency === "USD"
      ? { ...s, cashBalanceUSD: s.cashBalanceUSD + proceeds }
      : { ...s, cashBalanceKRW: s.cashBalanceKRW + proceeds });

    // 청산 기록
    setClosed(prev => [trade, ...prev]);

    return trade;
  }, [positions, settings.fxRateUSDKRW]);

  const addPendingEntry = useCallback(async (
    e: Omit<PendingEntry, "id" | "createdAt" | "status">,
  ) => {
    const id = genId();
    const notificationId = await scheduleCooldownEnd(
      id, e.request.ticker, e.request.name, e.cooldownUntil,
    );
    const entry: PendingEntry = {
      ...e,
      id,
      createdAt: Date.now(),
      status: "PENDING",
      notificationId: notificationId ?? undefined,
    };
    setPending(prev => [entry, ...prev]);
    return entry;
  }, []);

  const cancelPendingEntry = useCallback(async (
    id: string, reason: string, savedKRW: number | null,
  ) => {
    const target = pending.find(p => p.id === id);
    if (!target) return;
    await cancelScheduledNotification(target.notificationId);
    setPending(prev => prev.map(p =>
      p.id === id ? { ...p, status: "CANCELLED", notificationId: undefined } : p,
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

  // ── 손절/익절 모니터 ──
  const checkPositionAlerts = useCallback((
    priceMap: Record<string, { priceKRW: number }>,
  ) => {
    const fx = settings.fxRateUSDKRW;
    const updates: Array<{ id: string; patch: Partial<Position> }> = [];

    for (const p of positions) {
      const key = `${p.ticker.toUpperCase()}:${p.market}`;
      const q   = priceMap[key];
      if (!q || !Number.isFinite(q.priceKRW)) continue;

      // priceKRW를 포지션 통화로 환산
      const priceInPosCurrency = p.currency === "USD" ? q.priceKRW / fx : q.priceKRW;
      const avgPrice           = p.avgPrice;
      const gainPct            = ((priceInPosCurrency - avgPrice) / avgPrice) * 100;

      // 손절 (한 번만)
      if (p.stopLoss > 0 && priceInPosCurrency <= p.stopLoss && !p.firedStopLossAt) {
        sendStopLossNotification(p.ticker, p.name, priceInPosCurrency, p.stopLoss).catch(() => {});
        updates.push({ id: p.id, patch: { firedStopLossAt: Date.now() } });
        continue;
      }

      // 익절 레벨 (각 레벨당 한 번)
      const fired = p.firedTakeProfitAlerts ?? [];
      const newlyFired: number[] = [];
      for (const lv of p.takeProfitLevels) {
        if (gainPct >= lv && !fired.includes(lv)) {
          sendTakeProfitNotification(p.ticker, p.name, lv, priceInPosCurrency, gainPct).catch(() => {});
          newlyFired.push(lv);
        }
      }
      if (newlyFired.length > 0) {
        updates.push({ id: p.id, patch: { firedTakeProfitAlerts: [...fired, ...newlyFired] } });
      }
    }

    if (updates.length > 0) {
      setPositions(prev => prev.map(p => {
        const u = updates.find(x => x.id === p.id);
        return u ? { ...p, ...u.patch } : p;
      }));
    }
  }, [positions, settings.fxRateUSDKRW]);

  const executePendingEntry = useCallback(async (id: string) => {
    const target = pending.find(p => p.id === id);
    await cancelScheduledNotification(target?.notificationId);
    setPending(prev => prev.map(p =>
      p.id === id ? { ...p, status: "EXECUTED", notificationId: undefined } : p,
    ));
  }, [pending]);

  const value: PortfolioContextValue = {
    loaded,
    positions,
    portfolio,
    settings,
    pendingEntries: pending,
    cooldownSaves:  saves,
    closedTrades:   closed,
    avgPositionSize,
    addPosition,
    updatePosition,
    removePosition,
    markImpulse,
    setCashBalance,
    setCashBalanceUSD,
    setFxRate,
    executeBuy,
    sellPosition,
    addPendingEntry,
    cancelPendingEntry,
    executePendingEntry,
    checkPositionAlerts,
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
