import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { USD_KRW_RATE } from "@/constants/stockData";
import { useAISignals, AIScalpSignal, ScalpType, UrgencyType, RiskLevel } from "@/context/AISignalContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useStockPrice } from "@/context/StockPriceContext";

type FilterTab = "전체" | "급등포착" | "고점위험" | "눌림목";

// ─── 메타 ─────────────────────────────────────────────────────────────────────

const TYPE_META: Record<ScalpType, { icon: string; color: string; bg: string; darkBg: string }> = {
  급등포착: { icon: "flame",         color: "#F04452", bg: "#FEF0F1", darkBg: "#4A1E22" },
  고점위험: { icon: "warning",       color: "#1B63E8", bg: "#EDF3FF", darkBg: "#1A2A4A" },
  눌림목:   { icon: "trending-up",   color: "#05C072", bg: "#EDFCF5", darkBg: "#1A3A2A" },
  관망:     { icon: "pause-circle",  color: "#8E8E93", bg: "#F2F4F6", darkBg: "#2C2C2E" },
};

const URGENCY_META: Record<UrgencyType, { color: string }> = {
  즉시:    { color: "#F04452" },
  당일:    { color: "#FF6B00" },
  이번주:  { color: "#05C072" },
};

const RISK_META: Record<RiskLevel, { color: string; bg: string }> = {
  위험: { color: "#F04452", bg: "#FEF0F1" },
  주의: { color: "#FF6B00", bg: "#FFF4EC" },
  안전: { color: "#05C072", bg: "#EDFCF5" },
};

function formatPrice(price: number): string {
  if (price >= 1000000) return `${(price / 1000000).toFixed(2)}M`;
  if (price >= 10000)   return `${Math.round(price / 10000)}만`;
  return price.toLocaleString();
}

// ─── 점수 바 ──────────────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <View style={bar.wrap}>
      <View style={[bar.fill, { width: `${score}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  wrap: { height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.06)", overflow: "hidden", flex: 1 },
  fill: { height: 4, borderRadius: 2 },
});

// ─── 가격 스케일 시각화 ───────────────────────────────────────────────────────

interface ResolvedSignal extends AIScalpSignal {
  currentPriceKRW: number;
  entryLow:   number;
  entryHigh:  number;
  stopLoss:   number;
  profitLines: { label: string; percent: number; price: number }[];
}

function pct(base: number, p: number) { return Math.round(base * (1 + p / 100)); }

function resolveSignal(sig: AIScalpSignal, priceKRW: number): ResolvedSignal {
  return {
    ...sig,
    currentPriceKRW: priceKRW,
    entryLow:   sig.entryLowPct  !== 0 ? pct(priceKRW, sig.entryLowPct)  : 0,
    entryHigh:  sig.entryHighPct !== 0 ? pct(priceKRW, sig.entryHighPct) : 0,
    stopLoss:   pct(priceKRW, -sig.stopLossPct),
    profitLines: sig.profitPcts.map(pp => ({
      label: pp.label, percent: pp.percent, price: pct(priceKRW, pp.percent),
    })),
  };
}

function PriceScale({ sig, isDark, c }: { sig: ResolvedSignal; isDark: boolean; c: any }) {
  const isRisk = sig.type === "고점위험";
  const allPrices = isRisk
    ? [sig.profitLines[sig.profitLines.length - 1]?.price ?? sig.stopLoss, sig.currentPriceKRW, sig.stopLoss]
    : [sig.stopLoss, sig.currentPriceKRW, ...sig.profitLines.map(p => p.price)];

  const min   = Math.min(...allPrices) * 0.995;
  const max   = Math.max(...allPrices) * 1.005;
  const range = max - min;
  const pos   = (price: number) => Math.max(0, Math.min(100, ((price - min) / range) * 100));

  return (
    <View style={scale.wrap}>
      <View style={[scale.track, { backgroundColor: isDark ? "#2C2C2E" : "#F0F2F5" }]}>
        {!isRisk && sig.entryHigh > 0 && (
          <View style={[scale.entryZone, {
            left: `${pos(sig.entryLow)}%` as any,
            width: `${pos(sig.entryHigh) - pos(sig.entryLow)}%` as any,
            backgroundColor: "rgba(5,192,114,0.2)",
          }]} />
        )}
        <View style={[scale.line, { left: `${pos(sig.stopLoss)}%` as any, backgroundColor: isRisk ? "#05C072" : "#F04452" }]}>
          <View style={[scale.lineDot, { backgroundColor: isRisk ? "#05C072" : "#F04452" }]} />
        </View>
        {sig.profitLines.map((pl, i) => (
          <View key={i} style={[scale.line, { left: `${pos(pl.price)}%` as any, backgroundColor: isRisk ? "#F04452" : "#0064FF" }]}>
            <View style={[scale.lineDot, { backgroundColor: isRisk ? "#F04452" : "#0064FF" }]} />
          </View>
        ))}
        <View style={[scale.currentMarker, { left: `${pos(sig.currentPriceKRW)}%` as any, transform: [{ translateX: -8 }] }]}>
          <View style={[scale.currentDiamond, { backgroundColor: c.text }]} />
        </View>
      </View>

      <View style={scale.labels}>
        <View style={scale.labelItem}>
          <View style={[scale.labelDot, { backgroundColor: isRisk ? "#05C072" : "#F04452" }]} />
          <Text style={[scale.labelText, { color: c.textSecondary }]}>
            {isRisk ? "탈출" : "손절"} {formatPrice(sig.stopLoss)}
          </Text>
        </View>
        <View style={scale.labelItem}>
          <View style={[scale.labelDot, { backgroundColor: c.text }]} />
          <Text style={[scale.labelText, { color: c.text }]}>현재 {formatPrice(sig.currentPriceKRW)}</Text>
        </View>
        {sig.profitLines.map((pl, i) => (
          <View key={i} style={scale.labelItem}>
            <View style={[scale.labelDot, { backgroundColor: isRisk ? "#F04452" : "#0064FF" }]} />
            <Text style={[scale.labelText, { color: c.textSecondary }]}>{pl.label} {formatPrice(pl.price)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const scale = StyleSheet.create({
  wrap: { gap: 10 },
  track: { height: 8, borderRadius: 4, position: "relative" },
  entryZone: { position: "absolute", top: 0, bottom: 0, borderRadius: 4 },
  line: { position: "absolute", top: -4, width: 2, height: 16, borderRadius: 1, alignItems: "center" },
  lineDot: { position: "absolute", top: -3, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: "#fff" },
  currentMarker: { position: "absolute", top: -4, width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  currentDiamond: { width: 10, height: 10, borderRadius: 2, transform: [{ rotate: "45deg" }], borderWidth: 2, borderColor: "#fff" },
  labels: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  labelItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  labelDot: { width: 6, height: 6, borderRadius: 3 },
  labelText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

// ─── 카드 ─────────────────────────────────────────────────────────────────────

function ScalpCard({ sig, stockId, isDark, c }: {
  sig: ResolvedSignal; stockId: string; isDark: boolean; c: any
}) {
  const [expanded, setExpanded] = useState(false);
  const meta        = TYPE_META[sig.type];
  const urgencyMeta = URGENCY_META[sig.urgency];
  const riskMeta    = RISK_META[sig.riskLevel];
  const isRisk      = sig.type === "고점위험";
  const ind         = sig.indicators;

  const isNasdaq = sig.market === "NASDAQ";
  const usdPrice = isNasdaq ? (sig.currentPriceKRW / USD_KRW_RATE).toFixed(2) : null;

  const rsiColor = ind.rsi14 >= 70 ? "#F04452" : ind.rsi14 <= 35 ? "#05C072" : c.text;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card }]}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.8}
    >
      {/* ── 상단 배지 ── */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.typePill, { backgroundColor: isDark ? meta.darkBg : meta.bg }]}>
            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.typeText, { color: meta.color }]}>{sig.type}</Text>
          </View>
          <View style={[styles.urgencyPill, { backgroundColor: urgencyMeta.color + "18" }]}>
            <Text style={[styles.urgencyText, { color: urgencyMeta.color }]}>{sig.urgency}</Text>
          </View>
          <View style={[styles.riskPill, { backgroundColor: riskMeta.bg }]}>
            <Text style={[styles.riskText, { color: riskMeta.color }]}>{sig.riskLevel}</Text>
          </View>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={10} color="#7C3AED" />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/stock/[id]", params: { id: stockId } })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="open-outline" size={14} color={c.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* ── 종목 + 현재가 + 점수 ── */}
      <View style={styles.nameScoreRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stockName, { color: c.text }]}>{sig.ticker}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.currentPriceText, { color: c.text }]}>
              ₩{sig.currentPriceKRW.toLocaleString()}
            </Text>
            {usdPrice && (
              <Text style={[styles.usdText, { color: c.textTertiary }]}>${usdPrice}</Text>
            )}
          </View>
          <Text style={[styles.stockMeta, { color: c.textSecondary }]}>
            {sig.ticker}  ·  {sig.market}
          </Text>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreNum, { color: isRisk ? "#1B63E8" : meta.color }]}>
            {isRisk ? sig.riskScore : sig.surgeScore}
          </Text>
          <Text style={[styles.scoreLabel, { color: c.textTertiary }]}>
            {isRisk ? "위험도" : "급등도"}
          </Text>
        </View>
      </View>

      {/* ── 점수 바 ── */}
      <View style={styles.barRow}>
        <ScoreBar score={isRisk ? sig.riskScore : sig.surgeScore} color={isRisk ? "#1B63E8" : meta.color} />
        <Text style={[styles.barLabel, { color: c.textTertiary }]}>
          {isRisk ? `위험도 ${sig.riskScore}%` : `급등도 ${sig.surgeScore}%`}
        </Text>
      </View>

      {/* ── AI 요약 ── */}
      <Text style={[styles.summary, { color: c.textSecondary }]} numberOfLines={2}>
        {sig.summary}
      </Text>

      {/* ── 주의 ── */}
      {sig.caution && (
        <View style={[styles.cautionBox, { backgroundColor: "#F04452" + "14" }]}>
          <Ionicons name="alert-circle" size={13} color="#F04452" />
          <Text style={styles.cautionText}>{sig.caution}</Text>
        </View>
      )}

      {/* ── 지표 ── */}
      <View style={[styles.metrics, { borderTopColor: c.separator, borderBottomColor: c.separator }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: rsiColor }]}>{ind.rsi14}</Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>RSI-14</Text>
        </View>
        <View style={[styles.metricDiv, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: ind.volumeRatio >= 3 ? "#F04452" : c.text }]}>
            {ind.volumeRatio.toFixed(1)}×
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>거래량</Text>
        </View>
        <View style={[styles.metricDiv, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: ind.distFrom52High >= -5 ? "#F04452" : "#05C072" }]}>
            {ind.distFrom52High > 0 ? "+" : ""}{ind.distFrom52High.toFixed(1)}%
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>52주↑</Text>
        </View>
        <View style={[styles.metricDiv, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: sig.expectedMovePercent >= 0 ? "#F04452" : "#1B63E8" }]}>
            {sig.expectedMovePercent > 0 ? "+" : ""}{sig.expectedMovePercent}%
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>예상이동</Text>
        </View>
      </View>

      {/* ── 확장: 익절라인 + 스케일 ── */}
      {expanded && (
        <View style={styles.expandedWrap}>
          <View style={styles.targetsSection}>
            <Text style={[styles.targetsSectionTitle, { color: c.textSecondary }]}>
              {isRisk ? "⚠ 탈출/손절 가이드" : "📍 익절라인 가이드"}
            </Text>

            {!isRisk && sig.entryLow > 0 && (
              <View style={[styles.targetRow, { backgroundColor: "rgba(5,192,114,0.08)" }]}>
                <View style={styles.targetLeft}>
                  <View style={[styles.targetDot, { backgroundColor: "#05C072" }]} />
                  <Text style={[styles.targetLabel, { color: "#05C072" }]}>진입 구간</Text>
                </View>
                <Text style={[styles.targetPrice, { color: "#05C072" }]}>
                  {sig.entryLow.toLocaleString()} ~ {sig.entryHigh.toLocaleString()}
                </Text>
              </View>
            )}

            <View style={[styles.targetRow, { backgroundColor: isRisk ? "rgba(5,192,114,0.08)" : "rgba(240,68,82,0.08)" }]}>
              <View style={styles.targetLeft}>
                <View style={[styles.targetDot, { backgroundColor: isRisk ? "#05C072" : "#F04452" }]} />
                <Text style={[styles.targetLabel, { color: isRisk ? "#05C072" : "#F04452" }]}>
                  {isRisk ? "탈출 기준" : "손절 기준"}
                </Text>
              </View>
              <View style={styles.targetRight}>
                <Text style={[styles.targetPrice, { color: isRisk ? "#05C072" : "#F04452" }]}>
                  {sig.stopLoss.toLocaleString()}
                </Text>
                <Text style={[styles.targetPct, { color: isRisk ? "#05C072" : "#F04452" }]}>
                  -{sig.stopLossPct}%
                </Text>
              </View>
            </View>

            {sig.profitLines.map((pl, i) => (
              <View key={i} style={[styles.targetRow, { backgroundColor: isRisk ? "rgba(240,68,82,0.08)" : "rgba(0,100,255,0.06)" }]}>
                <View style={styles.targetLeft}>
                  <View style={[styles.targetDot, { backgroundColor: isRisk ? "#F04452" : "#0064FF" }]} />
                  <Text style={[styles.targetLabel, { color: isRisk ? "#F04452" : "#0064FF" }]}>{pl.label}</Text>
                </View>
                <View style={styles.targetRight}>
                  <Text style={[styles.targetPrice, { color: isRisk ? "#F04452" : "#0064FF" }]}>
                    {pl.price.toLocaleString()}
                  </Text>
                  <Text style={[styles.targetPct, { color: isRisk ? "#F04452" : "#0064FF" }]}>
                    {pl.percent > 0 ? "+" : ""}{pl.percent}%
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.scaleSection, { borderTopColor: c.separator }]}>
            <Text style={[styles.scaleSectionTitle, { color: c.textSecondary }]}>가격 스케일</Text>
            <PriceScale sig={sig} isDark={isDark} c={c} />
          </View>

          {/* 기술지표 */}
          <View style={[styles.indicatorSection, { borderTopColor: c.separator }]}>
            <Text style={[styles.indicatorTitle, { color: c.textSecondary }]}>기술적 지표</Text>
            <View style={styles.indicatorGrid}>
              <View style={[styles.indItem, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
                <Text style={[styles.indVal, { color: ind.macdHistogram > 0 ? "#F04452" : "#1B63E8" }]}>
                  {ind.macdHistogram > 0 ? "+" : ""}{ind.macdHistogram.toFixed(2)}
                </Text>
                <Text style={[styles.indLbl, { color: c.textTertiary }]}>MACD히스토</Text>
              </View>
              <View style={[styles.indItem, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
                <Text style={[styles.indVal, { color: c.text }]}>{ind.bbWidth.toFixed(1)}%</Text>
                <Text style={[styles.indLbl, { color: c.textTertiary }]}>BB폭(변동성)</Text>
              </View>
              <View style={[styles.indItem, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
                <Text style={[styles.indVal, { color: ind.ma5 > ind.ma20 ? "#F04452" : "#1B63E8" }]}>
                  {ind.ma5 > ind.ma20 ? "정배열↑" : "역배열↓"}
                </Text>
                <Text style={[styles.indLbl, { color: c.textTertiary }]}>MA5/20</Text>
              </View>
            </View>
          </View>

          <View style={styles.signalTags}>
            {sig.signals.map((s, i) => (
              <View key={i} style={[styles.sigTag, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
                <Text style={[styles.sigTagText, { color: c.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.expandToggle, { borderTopColor: c.separator }]}
        onPress={() => setExpanded(v => !v)}
      >
        <Text style={[styles.expandToggleText, { color: c.tint }]}>
          {expanded ? "접기" : "익절라인 · 상세 보기"}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={c.tint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── 메인 스크린 ──────────────────────────────────────────────────────────────

export default function ScalpingScreen() {
  const isDark = useColorScheme() === "dark";
  const c      = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { scalpSignals, loading, lastFetch, refresh } = useAISignals();
  const { watchlistStocks }    = useWatchlist();
  const { priceKRW }           = useStockPrice();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("전체");

  const filters: FilterTab[] = ["전체", "급등포착", "고점위험", "눌림목"];

  const resolved: ResolvedSignal[] = useMemo(() => {
    return watchlistStocks
      .map(stock => {
        const sig = scalpSignals[stock.ticker];
        if (!sig) return null;
        const live = priceKRW(stock.ticker, stock.market, stock.currentPrice);
        const priceKRWVal = live > 0 ? live : stock.currentPrice;
        return resolveSignal(sig, priceKRWVal);
      })
      .filter((x): x is ResolvedSignal => x !== null);
  }, [scalpSignals, watchlistStocks, priceKRW]);

  const filtered = activeFilter === "전체"
    ? resolved
    : resolved.filter(s => s.type === activeFilter);

  const surgeCount = resolved.filter(s => s.type === "급등포착").length;
  const riskCount  = resolved.filter(s => s.type === "고점위험").length;
  const dipCount   = resolved.filter(s => s.type === "눌림목").length;
  const watchCount = resolved.filter(s => s.type === "관망").length;

  const lastUpdate = lastFetch
    ? new Date(lastFetch).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.headerTitle, { color: c.text }]}>단타 레이더</Text>
            <View style={styles.aiLabel}>
              <Ionicons name="sparkles" size={11} color="#7C3AED" />
              <Text style={styles.aiLabelText}>Claude AI</Text>
            </View>
          </View>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            RSI·MACD·BB + KIS 수급 + AI 분석
            {lastUpdate ? `  ·  ${lastUpdate} 기준` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={refresh} disabled={loading} style={{ padding: 6 }}>
          {loading
            ? <ActivityIndicator size="small" color={c.tint} />
            : <Ionicons name="refresh" size={18} color={c.tint} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.tint} />}
      >
        {/* 요약 카드 */}
        <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
          <TouchableOpacity style={styles.summaryItem} onPress={() => setActiveFilter("급등포착")}>
            <Text style={[styles.summaryVal, { color: "#F04452" }]}>{surgeCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>급등포착</Text>
          </TouchableOpacity>
          <View style={[styles.summaryDiv, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.summaryItem} onPress={() => setActiveFilter("고점위험")}>
            <Text style={[styles.summaryVal, { color: "#1B63E8" }]}>{riskCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>고점위험</Text>
          </TouchableOpacity>
          <View style={[styles.summaryDiv, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.summaryItem} onPress={() => setActiveFilter("눌림목")}>
            <Text style={[styles.summaryVal, { color: "#05C072" }]}>{dipCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>눌림목</Text>
          </TouchableOpacity>
          <View style={[styles.summaryDiv, { backgroundColor: c.separator }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: c.textSecondary }]}>{watchCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>관망</Text>
          </View>
        </View>

        {/* 필터 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((f) => {
            const meta     = f !== "전체" ? TYPE_META[f as ScalpType] : null;
            const isActive = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  isActive
                    ? { backgroundColor: meta?.color ?? c.tint }
                    : { backgroundColor: isDark ? "#2C2C2E" : "#EAECEF" },
                ]}
                onPress={() => setActiveFilter(f)}
              >
                {meta && <Ionicons name={meta.icon as any} size={12} color={isActive ? "#fff" : c.textSecondary} />}
                <Text style={[styles.filterChipText, { color: isActive ? "#fff" : c.textSecondary }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 면책 */}
        <View style={[styles.disclaimer, { backgroundColor: c.card }]}>
          <Ionicons name="information-circle-outline" size={14} color={c.textTertiary} />
          <Text style={[styles.disclaimerText, { color: c.textTertiary }]}>
            본 정보는 투자 참고용입니다. 실제 투자 결정은 본인 판단으로 하시기 바랍니다.
          </Text>
        </View>

        {/* 로딩 */}
        {loading && resolved.length === 0 && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>AI 단타 신호 분석 중...</Text>
          </View>
        )}

        {/* 카드 */}
        {filtered.map(sig => {
          const stock = watchlistStocks.find(s => s.ticker === sig.ticker);
          return (
            <ScalpCard
              key={sig.ticker}
              sig={sig}
              stockId={stock?.id ?? sig.ticker}
              isDark={isDark}
              c={c}
            />
          );
        })}

        {!loading && filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="pulse-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>신호 없음</Text>
            <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
              {activeFilter !== "전체" ? `${activeFilter} 신호가 없습니다` : "AI 분석 완료 후 신호가 표시됩니다"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  aiLabel: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#7C3AED18", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  aiLabelText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#7C3AED" },

  summaryCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, flexDirection: "row", paddingVertical: 16 },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryDiv: { width: StyleSheet.hairlineWidth, marginVertical: 4 },

  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  loadingWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: "hidden" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  cardTopLeft: { flexDirection: "row", gap: 6, alignItems: "center" },
  typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  urgencyPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  urgencyText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  riskPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  riskText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#7C3AED18", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  aiBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#7C3AED" },

  nameScoreRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 4 },
  stockName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  currentPriceText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  usdText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  stockMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  scoreWrap: { alignItems: "flex-end" },
  scoreNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  barRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  barLabel: { fontSize: 11, fontFamily: "Inter_400Regular", width: 80 },

  summary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, paddingHorizontal: 16, paddingBottom: 10 },
  cautionBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 8 },
  cautionText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#F04452", flex: 1, lineHeight: 18 },

  metrics: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: 16 },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  metricLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  metricDiv: { width: StyleSheet.hairlineWidth, marginVertical: 4 },

  expandedWrap: { padding: 16, gap: 12 },
  targetsSection: { gap: 6 },
  targetsSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  targetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 8, padding: 10 },
  targetLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  targetDot: { width: 6, height: 6, borderRadius: 3 },
  targetLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  targetRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  targetPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  targetPct: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  scaleSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  scaleSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  indicatorSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  indicatorTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  indicatorGrid: { flexDirection: "row", gap: 8 },
  indItem: { flex: 1, borderRadius: 8, padding: 8, alignItems: "center", gap: 2 },
  indVal: { fontSize: 12, fontFamily: "Inter_700Bold" },
  indLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },

  signalTags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sigTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sigTagText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  expandToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  expandToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
