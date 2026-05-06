/**
 * AI 기능 일일 사용량 카운터. AsyncStorage에 day-key로 저장하고 자정에 자연 리셋.
 *
 * 주의: 클라이언트 사이드 카운터는 앱 재설치/스토리지 클리어로 우회 가능. 비용 폭주
 * 방어의 정직한 1차 방어선이고, 2차로 백엔드 IP/디바이스 단위 rate limit이 따라간다
 * (artifacts/api-server/src/lib/rateLimit.ts).
 */
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type QuotaFeature = "chat" | "trade-import" | "weekly-coach";

const LIMITS: Record<QuotaFeature, number> = {
  "chat":          10,
  "trade-import":  20,
  "weekly-coach":  5,
};

const LABELS: Record<QuotaFeature, string> = {
  "chat":          "AI 채팅",
  "trade-import":  "체결 자동 등록",
  "weekly-coach":  "주간 AI 코치",
};

function todayKey(feature: QuotaFeature): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `@swingchu/quota/${feature}/${ymd}`;
}

export interface QuotaState {
  feature:   QuotaFeature;
  label:     string;
  used:      number;
  limit:     number;
  remaining: number;
  loading:   boolean;
}

export interface UseAiQuota extends QuotaState {
  /** Returns true if a call should proceed. Increments the counter on success. */
  consume:   () => Promise<boolean>;
  refresh:   () => Promise<void>;
}

export function useAiQuota(feature: QuotaFeature): UseAiQuota {
  const limit = LIMITS[feature];
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(todayKey(feature));
      setUsed(raw ? Math.max(0, parseInt(raw, 10) || 0) : 0);
    } catch {
      setUsed(0);
    } finally {
      setLoading(false);
    }
  }, [feature]);

  useEffect(() => { refresh(); }, [refresh]);

  const consume = useCallback(async (): Promise<boolean> => {
    const raw = await AsyncStorage.getItem(todayKey(feature)).catch(() => null);
    const cur = raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
    if (cur >= limit) {
      setUsed(cur);
      return false;
    }
    const next = cur + 1;
    await AsyncStorage.setItem(todayKey(feature), String(next)).catch(() => {});
    setUsed(next);
    return true;
  }, [feature, limit]);

  return {
    feature,
    label:     LABELS[feature],
    used,
    limit,
    remaining: Math.max(0, limit - used),
    loading,
    consume,
    refresh,
  };
}
