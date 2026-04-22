import { API_BASE } from "@/utils/apiBase";
import { USD_KRW_RATE } from "@/constants/stockData";

export type ContextSeverity = "clear" | "caution" | "warn";

export interface TierAlertContext {
  severity:    ContextSeverity;     // clear=초록 / caution=노랑 / warn=빨강
  flags:       string[];            // 화면/푸시에 표시할 한 줄 경고들
  recommendation: string;           // 권장 액션 한 줄
}

interface EnrichmentInput {
  ticker:           string;
  market:           string;
  currentPriceKRW:  number;
}

interface CacheEntry { data: TierAlertContext; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30 * 60 * 1000;  // 30분 캐시 (이벤트는 자주 안 바뀜)

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json() as T;
  } catch {
    return null;
  }
}

/**
 * 타겟가 도달 시점에 실적·FOMC·애널리스트 컨텍스트를 합쳐서
 * "지금 진입해도 되는가?"에 대한 한 줄 코칭을 만든다.
 */
export async function enrichTierContext(input: EnrichmentInput): Promise<TierAlertContext> {
  const { ticker, market, currentPriceKRW } = input;
  const key = `${ticker.toUpperCase()}:${market}`;

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  const isUS = market === "NASDAQ" || market === "NYSE";

  const [earnings, fomc, analyst] = await Promise.all([
    safeFetch<{ daysUntilEarnings: number | null; earningsTimeOfDay: string | null }>(
      `${API_BASE}/earnings?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}`),
    isUS ? safeFetch<{ nextMeeting: { daysUntilDecision: number; hasSEP: boolean } | null }>(
      `${API_BASE}/fomc`) : Promise.resolve(null),
    isUS ? safeFetch<{
      recommendation: { consensusLabel: string | null; total: number; sell: number; strongSell: number } | null;
      priceTarget:    { targetMean: number | null } | null;
    }>(`${API_BASE}/analyst?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}`)
      : Promise.resolve(null),
  ]);

  const flags: string[] = [];
  let severity: ContextSeverity = "clear";

  // Case A: 실적 D-7 이내
  if (earnings?.daysUntilEarnings != null && earnings.daysUntilEarnings >= 0 && earnings.daysUntilEarnings <= 7) {
    const tod = earnings.earningsTimeOfDay === "BMO" ? "장전" : earnings.earningsTimeOfDay === "AMC" ? "장후" : "";
    flags.push(`⚠ 실적 D-${earnings.daysUntilEarnings}${tod ? ` ${tod}` : ""} · 변동성 임박`);
    severity = earnings.daysUntilEarnings <= 1 ? "warn" : "caution";
  }

  // Case B: FOMC D-3 이내 (미국 주식만)
  const fomcDays = fomc?.nextMeeting?.daysUntilDecision ?? null;
  if (fomcDays != null && fomcDays >= 0 && fomcDays <= 3) {
    flags.push(`⚠ FOMC D-${fomcDays}${fomc?.nextMeeting?.hasSEP ? " · 점도표" : ""} · 매크로 변동성`);
    if (severity !== "warn") severity = fomcDays <= 1 ? "warn" : "caution";
  }

  // Case C: 애널리스트 컨센 약세
  if (analyst?.recommendation) {
    const rec = analyst.recommendation;
    const isBearishLabel = rec.consensusLabel === "Sell" || rec.consensusLabel === "Strong Sell";
    const isBearishCounts = rec.total > 0 && (rec.sell + rec.strongSell) / rec.total >= 0.4;
    if (isBearishLabel || isBearishCounts) {
      flags.push(`⚠ 애널 컨센 약세 (${rec.consensusLabel ?? "—"})`);
      if (severity === "clear") severity = "caution";
    }

    // 목표가가 현재가보다 낮으면 추가 경고
    const tm = analyst.priceTarget?.targetMean;
    if (tm != null && isUS) {
      const currentUsd = currentPriceKRW / USD_KRW_RATE;
      const upside = ((tm - currentUsd) / currentUsd) * 100;
      if (upside < -5) {
        flags.push(`⚠ 목표가(${tm.toFixed(2)}) < 현재가, 하방 ${upside.toFixed(0)}%`);
        if (severity === "clear") severity = "caution";
      }
    }
  }

  // Case D: 이벤트 클리어 → ✅
  let recommendation: string;
  if (severity === "warn") {
    recommendation = "🛑 분할매수 유보 — 이벤트 통과 후 재평가";
  } else if (severity === "caution") {
    recommendation = "⚠ 50%만 진입 또는 보류 권장";
  } else {
    flags.push("✅ 임박 이벤트 클리어");
    recommendation = "✅ 계획대로 분할매수 진행";
  }

  const context: TierAlertContext = { severity, flags, recommendation };
  cache.set(key, { data: context, expiresAt: Date.now() + TTL_MS });
  return context;
}
