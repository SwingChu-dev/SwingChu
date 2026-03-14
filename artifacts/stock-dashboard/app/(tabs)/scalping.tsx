import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { STOCKS, USD_KRW_RATE } from "@/constants/stockData";
import { useStockPrice } from "@/context/StockPriceContext";
import {
  SCALP_SIGNALS,
  TYPE_META,
  URGENCY_META,
  RISK_META,
  ScalpSignal,
  ScalpType,
} from "@/constants/scalping";

type FilterTab = "전체" | "급등포착" | "고점위험" | "눌림목";

// 가격 계산 헬퍼
const pct = (base: number, p: number) => Math.round(base * (1 + p / 100));

// 단타레이더에서 사용하는 실제 가격이 들어간 신호 타입
interface ResolvedSignal extends ScalpSignal {
  currentPrice: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  profitLines: { label: string; percent: number; price: number }[];
}

function resolveSignal(signal: ScalpSignal, currentPrice: number): ResolvedSignal {
  return {
    ...signal,
    currentPrice,
    entryLow:   signal.entryLowPct  !== 0 ? pct(currentPrice, signal.entryLowPct)  : 0,
    entryHigh:  signal.entryHighPct !== 0 ? pct(currentPrice, signal.entryHighPct) : 0,
    stopLoss:   pct(currentPrice, -signal.stopLossPct), // 항상 현재가 아래
    profitLines: signal.profitPcts.map((pp) => ({
      label:   pp.label,
      percent: pp.percent,
      price:   pct(currentPrice, pp.percent),
    })),
  };
}

function formatPrice(price: number): string {
  if (price >= 1000000) return `${(price / 1000000).toFixed(2)}M`;
  if (price >= 10000) return `${Math.round(price / 10000)}만`;
  return price.toLocaleString();
}

// ── 점수 바 ──────────────────────────────────────────────────────────────────
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

// ── 가격 스케일 시각화 ────────────────────────────────────────────────────────
function PriceScale({ signal, isDark, c }: { signal: ResolvedSignal; isDark: boolean; c: any }) {
  const isRisk = signal.type === "고점위험";
  const allPrices = isRisk
    ? [signal.profitLines[signal.profitLines.length - 1].price, signal.currentPrice, signal.stopLoss]
    : [signal.stopLoss, signal.currentPrice, ...signal.profitLines.map((p) => p.price)];

  const min   = Math.min(...allPrices) * 0.995;
  const max   = Math.max(...allPrices) * 1.005;
  const range = max - min;
  const pos   = (price: number) => Math.max(0, Math.min(100, ((price - min) / range) * 100));

  return (
    <View style={scale.wrap}>
      <View style={[scale.track, { backgroundColor: isDark ? "#2C2C2E" : "#F0F2F5" }]}>
        {!isRisk && signal.entryHigh > 0 && (
          <View style={[scale.entryZone, {
            left: `${pos(signal.entryLow)}%` as any,
            width: `${pos(signal.entryHigh) - pos(signal.entryLow)}%` as any,
            backgroundColor: "rgba(5,192,114,0.2)",
          }]} />
        )}
        <View style={[scale.line, { left: `${pos(signal.stopLoss)}%` as any, backgroundColor: isRisk ? "#05C072" : "#F04452" }]}>
          <View style={[scale.lineDot, { backgroundColor: isRisk ? "#05C072" : "#F04452" }]} />
        </View>
        {signal.profitLines.map((pl, i) => (
          <View key={i} style={[scale.line, { left: `${pos(pl.price)}%` as any, backgroundColor: isRisk ? "#F04452" : "#0064FF" }]}>
            <View style={[scale.lineDot, { backgroundColor: isRisk ? "#F04452" : "#0064FF" }]} />
          </View>
        ))}
        <View style={[scale.currentMarker, { left: `${pos(signal.currentPrice)}%` as any, transform: [{ translateX: -8 }] }]}>
          <View style={[scale.currentDiamond, { backgroundColor: c.text }]} />
        </View>
      </View>

      <View style={scale.labels}>
        <View style={scale.labelItem}>
          <View style={[scale.labelDot, { backgroundColor: isRisk ? "#05C072" : "#F04452" }]} />
          <Text style={[scale.labelText, { color: c.textSecondary }]}>
            {isRisk ? "탈출" : "손절"} {formatPrice(signal.stopLoss)}
          </Text>
        </View>
        <View style={scale.labelItem}>
          <View style={[scale.labelDot, { backgroundColor: c.text }]} />
          <Text style={[scale.labelText, { color: c.text }]}>현재 {formatPrice(signal.currentPrice)}</Text>
        </View>
        {signal.profitLines.map((pl, i) => (
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

// ── 카드 ──────────────────────────────────────────────────────────────────────
function ScalpCard({ signal, isDark, c }: { signal: ResolvedSignal; isDark: boolean; c: any }) {
  const [expanded, setExpanded] = useState(false);
  const meta        = TYPE_META[signal.type];
  const urgencyMeta = URGENCY_META[signal.urgency];
  const riskMeta    = RISK_META[signal.riskLevel];
  const isRisk      = signal.type === "고점위험";
  const accentColor = meta.color;
  const bgColor     = isDark ? meta.darkBg : meta.bg;

  const isNasdaq   = signal.market === "NASDAQ";
  const usdPrice   = isNasdaq ? (signal.currentPrice / USD_KRW_RATE).toFixed(2) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card }]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      {/* ── 상단 ── */}
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.typePill, { backgroundColor: bgColor }]}>
            <Ionicons name={meta.icon as any} size={12} color={accentColor} />
            <Text style={[styles.typeText, { color: accentColor }]}>{signal.type}</Text>
          </View>
          <View style={[styles.urgencyPill, { backgroundColor: urgencyMeta.color + "18" }]}>
            <Text style={[styles.urgencyText, { color: urgencyMeta.color }]}>{signal.urgency}</Text>
          </View>
          <View style={[styles.riskPill, { backgroundColor: riskMeta.bg }]}>
            <Text style={[styles.riskText, { color: riskMeta.color }]}>{signal.riskLevel}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/stock/[id]", params: { id: signal.stockId } })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="open-outline" size={14} color={c.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* ── 종목명 + 현재가 + 점수 ── */}
      <View style={styles.nameScoreRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stockName, { color: c.text }]}>{signal.stockName}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.currentPriceText, { color: c.text }]}>
              ₩{signal.currentPrice.toLocaleString()}
            </Text>
            {usdPrice && (
              <Text style={[styles.usdText, { color: c.textTertiary }]}>${usdPrice}</Text>
            )}
          </View>
          <Text style={[styles.stockMeta, { color: c.textSecondary }]}>
            {signal.ticker}  ·  {signal.market}
          </Text>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreNum, { color: isRisk ? "#1B63E8" : accentColor }]}>
            {isRisk ? signal.riskScore : signal.surgeScore}
          </Text>
          <Text style={[styles.scoreLabel, { color: c.textTertiary }]}>
            {isRisk ? "위험도" : "급등도"}
          </Text>
        </View>
      </View>

      {/* ── 점수 바 ── */}
      <View style={styles.barRow}>
        <ScoreBar score={isRisk ? signal.riskScore : signal.surgeScore} color={isRisk ? "#1B63E8" : accentColor} />
        <Text style={[styles.barLabel, { color: c.textTertiary }]}>
          {isRisk ? `위험도 ${signal.riskScore}%` : `급등도 ${signal.surgeScore}%`}
        </Text>
      </View>

      {/* ── 요약 ── */}
      <Text style={[styles.summary, { color: c.textSecondary }]} numberOfLines={2}>
        {signal.summary}
      </Text>

      {/* ── 주의 박스 ── */}
      {signal.caution && (
        <View style={[styles.cautionBox, { backgroundColor: "#F04452" + "14" }]}>
          <Ionicons name="alert-circle" size={13} color="#F04452" />
          <Text style={styles.cautionText}>{signal.caution}</Text>
        </View>
      )}

      {/* ── 지표 ── */}
      <View style={[styles.metrics, { borderTopColor: c.separator, borderBottomColor: c.separator }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: signal.rsi >= 70 ? "#F04452" : signal.rsi <= 35 ? "#05C072" : c.text }]}>
            {signal.rsi}
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>RSI</Text>
        </View>
        <View style={[styles.metricDiv, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: signal.volumeSpike >= 3 ? "#F04452" : c.text }]}>
            {signal.volumeSpike.toFixed(1)}×
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>거래량</Text>
        </View>
        <View style={[styles.metricDiv, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: signal.distanceFrom52High >= -5 ? "#F04452" : "#05C072" }]}>
            {signal.distanceFrom52High > 0 ? "+" : ""}{signal.distanceFrom52High.toFixed(1)}%
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>52주고점↑</Text>
        </View>
        <View style={[styles.metricDiv, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: signal.expectedMovePercent >= 0 ? "#F04452" : "#1B63E8" }]}>
            {signal.expectedMovePercent > 0 ? "+" : ""}{signal.expectedMovePercent}%
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

            {!isRisk && signal.entryLow > 0 && (
              <View style={[styles.targetRow, { backgroundColor: "rgba(5,192,114,0.08)" }]}>
                <View style={styles.targetLeft}>
                  <View style={[styles.targetDot, { backgroundColor: "#05C072" }]} />
                  <Text style={[styles.targetLabel, { color: "#05C072" }]}>진입 구간</Text>
                </View>
                <Text style={[styles.targetPrice, { color: "#05C072" }]}>
                  {signal.entryLow.toLocaleString()} ~ {signal.entryHigh.toLocaleString()}
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
                  {signal.stopLoss.toLocaleString()}
                </Text>
                <Text style={[styles.targetPct, { color: isRisk ? "#05C072" : "#F04452" }]}>
                  -{signal.stopLossPct}%
                </Text>
              </View>
            </View>

            {signal.profitLines.map((pl, i) => (
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
            <PriceScale signal={signal} isDark={isDark} c={c} />
          </View>

          <View style={styles.signalTags}>
            {signal.signals.map((s) => (
              <View key={s} style={[styles.sigTag, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
                <Text style={[styles.sigTagText, { color: c.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.expandToggle, { borderTopColor: c.separator }]}
        onPress={() => setExpanded((v) => !v)}
      >
        <Text style={[styles.expandToggleText, { color: c.tint }]}>
          {expanded ? "접기" : "익절라인 · 상세 보기"}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={c.tint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── 메인 스크린 ───────────────────────────────────────────────────────────────
export default function ScalpingScreen() {
  const isDark = useColorScheme() === "dark";
  const c      = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { priceKRW } = useStockPrice();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("전체");

  const filters: FilterTab[] = ["전체", "급등포착", "고점위험", "눌림목"];

  // 각 신호에 실제 현재가(stockData + 실시간 API) 적용
  const resolved: ResolvedSignal[] = useMemo(() => {
    return SCALP_SIGNALS.map((sig) => {
      const stock    = STOCKS.find((s) => s.id === sig.stockId);
      const baseFall = stock?.currentPrice ?? 0;
      const live     = priceKRW(sig.ticker, sig.market, baseFall);
      return resolveSignal(sig, live > 0 ? live : baseFall);
    });
  }, [priceKRW]);

  const filtered = activeFilter === "전체"
    ? resolved
    : resolved.filter((s) => s.type === (activeFilter as ScalpType));

  const surgeCount = resolved.filter((s) => s.type === "급등포착").length;
  const riskCount  = resolved.filter((s) => s.type === "고점위험").length;
  const dipCount   = resolved.filter((s) => s.type === "눌림목").length;
  const watchCount = resolved.filter((s) => s.type === "관망").length;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>단타 레이더</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            세력·급등 포착 · 고점 위험감지 · 익절라인
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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

        {/* 필터 탭 */}
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

        {/* 면책 고지 */}
        <View style={[styles.disclaimer, { backgroundColor: c.card }]}>
          <Ionicons name="information-circle-outline" size={14} color={c.textTertiary} />
          <Text style={[styles.disclaimerText, { color: c.textTertiary }]}>
            본 정보는 투자 참고용입니다. 실제 투자 결정은 본인 판단으로 하시기 바랍니다.
          </Text>
        </View>

        {/* 카드 목록 */}
        {filtered.map((sig) => (
          <ScalpCard key={sig.stockId} signal={sig} isDark={isDark} c={c} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  summaryCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    flexDirection: "row", paddingVertical: 16,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLbl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryDiv: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
  },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: "hidden" },
  cardTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
  },
  cardTopLeft: { flexDirection: "row", gap: 6, alignItems: "center" },
  typePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  typeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  urgencyPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  urgencyText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  riskPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  riskText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  nameScoreRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 16, marginBottom: 6,
  },
  stockName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 },
  currentPriceText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  usdText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  stockMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  scoreWrap: { alignItems: "flex-end" },
  scoreNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 32 },
  scoreLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  barRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, marginBottom: 10,
  },
  barLabel: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  summary: {
    fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18,
    paddingHorizontal: 16, marginBottom: 12,
  },
  cautionBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  cautionText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: "#F04452", lineHeight: 16 },
  metrics: {
    flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, marginBottom: 0,
  },
  metric: { flex: 1, alignItems: "center", gap: 4 },
  metricVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  metricLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  metricDiv: { width: StyleSheet.hairlineWidth },
  expandedWrap: { paddingTop: 12 },
  targetsSection: { paddingHorizontal: 16, gap: 6, marginBottom: 12 },
  targetsSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  targetRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  targetLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  targetDot: { width: 8, height: 8, borderRadius: 4 },
  targetLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  targetRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  targetPrice: { fontSize: 13, fontFamily: "Inter_700Bold" },
  targetPct: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scaleSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingHorizontal: 16, marginBottom: 12 },
  scaleSectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  signalTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 12 },
  sigTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  sigTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  expandToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  expandToggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
