import React, { useMemo } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";
import { useTechnicals } from "@/hooks/useTechnicals";

interface ProfitTargetSectionProps {
  stock:      StockInfo;
  livePrice?: number;
}

// 3·5·8·15% 4단계 — 각 25% 매도
const EXIT_STEPS = [
  { pct: 3,  ratio: 25, color: "#F59E0B", icon: "flag-outline"        as const },
  { pct: 5,  ratio: 25, color: "#00C896", icon: "trending-up-outline" as const },
  { pct: 8,  ratio: 25, color: "#3B82F6", icon: "rocket-outline"      as const },
  { pct: 15, ratio: 25, color: "#A855F7", icon: "diamond-outline"     as const },
];

export default function ProfitTargetSection({ stock, livePrice }: ProfitTargetSectionProps) {
  const isDark    = useColorScheme() === "dark";
  const c         = isDark ? Colors.dark : Colors.light;
  const basePrice = livePrice && livePrice > 0 ? livePrice : stock.currentPrice;
  const isLive    = !!(livePrice && livePrice > 0 && livePrice !== stock.currentPrice);
  const isKRW     = stock.currency === "KRW";

  const { ma5, ma20 } = useTechnicals(stock.ticker, stock.market, basePrice);

  // 목표가 계산
  const exits = useMemo(() => EXIT_STEPS.map(s => ({
    ...s,
    price: isKRW
      ? Math.round(basePrice * (1 + s.pct / 100) / 50) * 50
      : +(basePrice * (1 + s.pct / 100)).toFixed(2),
    gain: isKRW
      ? Math.round(basePrice * (s.pct / 100) / 50) * 50
      : +(basePrice * (s.pct / 100)).toFixed(2),
  })), [basePrice, isKRW]);

  // 손절: MA5·MA20 하단 -2% 또는 박스권 하단 -2%
  const hasMa        = ma5 !== null && ma20 !== null;
  const maBottom     = hasMa ? Math.round(Math.min(ma5!, ma20!)) : null;
  const stopBase     = maBottom ?? stock.boxRange.support;
  const stopLabel    = hasMa ? "MA5·MA20 하단 -2%" : "박스권 하단 -2%";
  const stopLoss     = isKRW
    ? Math.round(stopBase * 0.98 / 50) * 50
    : +(stopBase * 0.98).toFixed(2);
  const stopPct      = (((stopLoss - basePrice) / basePrice) * 100).toFixed(1);
  const stopGap      = stopLoss - basePrice;

  const fmt = (n: number) =>
    isKRW ? `₩${n.toLocaleString()}` : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>

      {/* 헤더 */}
      <View style={styles.sectionHeader}>
        <Ionicons name="trophy-outline" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>3·5·8·15 분할 익절</Text>
        {isLive && (
          <View style={[styles.liveBadge, { backgroundColor: "#F04452" + "18" }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveTxt, { color: "#F04452" }]}>실시간</Text>
          </View>
        )}
      </View>

      {/* 서브 설명 */}
      <View style={[styles.subBanner, { backgroundColor: c.backgroundTertiary }]}>
        <Text style={[styles.subText, { color: c.textSecondary }]}>
          4구간 각{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: c.text }}>25%씩 매도</Text>
          {" "}— 기준가{" "}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: c.text }}>{fmt(basePrice)}</Text>
        </Text>
      </View>

      {/* 익절 단계 */}
      {exits.map((e, i) => (
        <View key={i} style={[styles.exitRow, {
          borderBottomColor: c.separator,
          borderBottomWidth: i < exits.length - 1 ? StyleSheet.hairlineWidth : 0,
        }]}>
          <View style={[styles.iconBg, { backgroundColor: e.color + "22" }]}>
            <Ionicons name={e.icon} size={18} color={e.color} />
          </View>
          <View style={styles.exitInfo}>
            <Text style={[styles.exitLabel, { color: c.textSecondary }]}>
              +{e.pct}% 도달 시 {e.ratio}% 매도
            </Text>
            <Text style={[styles.exitPrice, { color: c.text }]}>{fmt(e.price)}</Text>
          </View>
          <View style={[styles.gainBadge, { backgroundColor: e.color + "18" }]}>
            <Text style={[styles.gainPct, { color: e.color }]}>+{e.pct}%</Text>
            <Text style={[styles.gainAmt, { color: e.color }]}>+{fmt(e.gain)}</Text>
          </View>
        </View>
      ))}

      {/* 전부 익절 시 요약 */}
      <View style={[styles.summaryCard, { backgroundColor: "#00C896" + "0D", borderColor: "#00C896" + "30" }]}>
        <Ionicons name="checkmark-done-outline" size={15} color="#00C896" />
        <Text style={[styles.summaryText, { color: c.textSecondary }]}>
          4단계 모두 익절 완료 시{" "}
          <Text style={{ color: "#00C896", fontFamily: "Inter_600SemiBold" }}>
            +{(EXIT_STEPS.reduce((s, e) => s + e.pct * e.ratio, 0) / 100).toFixed(2)}% 가중평균 수익
          </Text>
          {" "}실현
        </Text>
      </View>

      {/* 손절 */}
      <View style={[styles.stopRow, { borderTopColor: c.separator }]}>
        <View style={[styles.stopIcon, { backgroundColor: c.negative + "18" }]}>
          <Ionicons name="shield-half" size={18} color={c.negative} />
        </View>
        <View style={styles.stopInfo}>
          <View style={styles.stopLabelRow}>
            <Text style={[styles.stopLabel, { color: c.textSecondary }]}>손절 기준가</Text>
            <View style={[styles.stopBadge, { backgroundColor: c.negative + "18" }]}>
              <Text style={[styles.stopBadgeTxt, { color: c.negative }]}>{stopLabel}</Text>
            </View>
          </View>
          <Text style={[styles.stopPrice, { color: c.negative }]}>{fmt(stopLoss)}</Text>
          <Text style={[styles.stopNote, { color: c.textTertiary }]}>
            기준가 대비 {stopPct}% ({stopGap >= 0 ? "+" : ""}{fmt(Math.abs(stopGap))})
          </Text>
        </View>
      </View>

      <View style={[styles.stopTip, { backgroundColor: c.negative + "0C", borderColor: c.negative + "25" }]}>
        <Ionicons name="information-circle-outline" size={14} color={c.negative} />
        <Text style={[styles.stopTipText, { color: c.textSecondary }]}>
          {hasMa ? "MA" : "박스권"} 하단(
          {fmt(stopBase)}) 이탈 확정 시 즉시 손절.
          스윙은 언제 도망치느냐가 계좌를 지킵니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { borderRadius: 16, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingBottom: 8 },
  sectionTitle:  { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  liveBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: "#F04452" },
  liveTxt:       { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  subBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 8, padding: 10 },
  subText:   { fontSize: 13, fontFamily: "Inter_400Regular" },

  exitRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  iconBg:    { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  exitInfo:  { flex: 1 },
  exitLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  exitPrice: { fontSize: 17, fontFamily: "Inter_700Bold" },
  gainBadge: { alignItems: "flex-end", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  gainPct:   { fontSize: 14, fontFamily: "Inter_700Bold" },
  gainAmt:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  summaryCard: { flexDirection: "row", gap: 8, alignItems: "center", margin: 12, marginTop: 4, borderRadius: 10, borderWidth: 1, padding: 10 },
  summaryText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },

  stopRow:      { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  stopIcon:     { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  stopInfo:     { flex: 1, gap: 2 },
  stopLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  stopLabel:    { fontSize: 12, fontFamily: "Inter_400Regular" },
  stopBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  stopBadgeTxt: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  stopPrice:    { fontSize: 20, fontFamily: "Inter_700Bold" },
  stopNote:     { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  stopTip:      { flexDirection: "row", gap: 8, padding: 12, margin: 12, marginTop: 0, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  stopTipText:  { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
