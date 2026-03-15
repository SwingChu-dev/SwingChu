import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";
import { useTechnicals } from "@/hooks/useTechnicals";

interface ProfitTargetSectionProps {
  stock:      StockInfo;
  livePrice?: number;
}

const PROFIT_ICONS: ("checkmark-circle" | "trending-up" | "rocket")[] = [
  "checkmark-circle",
  "trending-up",
  "rocket",
];
const PROFIT_COLORS = ["#F59E0B", "#00C896", "#3B82F6"];

export default function ProfitTargetSection({ stock, livePrice }: ProfitTargetSectionProps) {
  const isDark    = useColorScheme() === "dark";
  const c         = isDark ? Colors.dark : Colors.light;
  const basePrice = livePrice && livePrice > 0 ? livePrice : stock.currentPrice;
  const isLive    = !!(livePrice && livePrice > 0 && livePrice !== stock.currentPrice);

  const { ma5, ma20 } = useTechnicals(stock.ticker, stock.market, basePrice);

  // 손절 기준가: MA5·MA20 하단 -2% (없으면 박스권 하단 -2% 폴백)
  const hasMa    = ma5 !== null && ma20 !== null;
  const maBottom = hasMa ? Math.round(Math.min(ma5!, ma20!)) : null;
  const stopLossBase  = maBottom ?? stock.boxRange.support;
  const stopLossLabel = hasMa ? "MA5·MA20 하단 -2%" : "박스권 하단 -2%";
  const stopLoss     = Math.round(stopLossBase * 0.98);
  const stopLossPct  = (((stopLoss - basePrice) / basePrice) * 100).toFixed(1);
  const stopLossGap  = stopLoss - basePrice;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trophy" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>익절 목표가</Text>
        {isLive && (
          <View style={[styles.liveBadge, { backgroundColor: "#F04452" + "18" }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveTxt, { color: "#F04452" }]}>실시간</Text>
          </View>
        )}
      </View>

      <View style={styles.currentPriceRow}>
        <Text style={[styles.currentLabel, { color: c.textTertiary }]}>기준가 (현재가)</Text>
        <Text style={[styles.currentPrice, { color: c.text }]}>
          ₩{basePrice.toLocaleString()}
        </Text>
      </View>

      {/* 익절 목표가 목록 */}
      {stock.profitTargets.map((target, i) => {
        const gain      = target.price - basePrice;
        const gainPerPer = ((gain / basePrice) * 100).toFixed(1);
        return (
          <View
            key={i}
            style={[
              styles.targetRow,
              { borderBottomColor: c.separator, borderBottomWidth: 1 },
            ]}
          >
            <View style={[styles.iconBg, { backgroundColor: PROFIT_COLORS[i] + "22" }]}>
              <Ionicons name={PROFIT_ICONS[i]} size={18} color={PROFIT_COLORS[i]} />
            </View>
            <View style={styles.targetInfo}>
              <Text style={[styles.targetLabel, { color: c.textSecondary }]}>
                {target.percent > 0 ? `+${target.percent}% 목표` : `익절 목표`}
              </Text>
              <Text style={[styles.targetPrice, { color: c.text }]}>
                ₩{target.price.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.gainBadge, { backgroundColor: PROFIT_COLORS[i] + "22" }]}>
              <Text style={[styles.gainText, { color: PROFIT_COLORS[i] }]}>
                {gain >= 0 ? "+" : ""}{gainPerPer}%
              </Text>
              <Text style={[styles.gainPrice, { color: PROFIT_COLORS[i] }]}>
                {gain >= 0 ? "+" : ""}₩{Math.abs(gain).toLocaleString()}
              </Text>
            </View>
          </View>
        );
      })}

      {/* ── 손절 기준가 ────────────────────────────────────── */}
      <View style={[styles.stopLossRow, { borderTopColor: c.separator }]}>
        <View style={[styles.stopLossIcon, { backgroundColor: c.negative + "18" }]}>
          <Ionicons name="shield-half" size={18} color={c.negative} />
        </View>
        <View style={styles.stopLossInfo}>
          <View style={styles.stopLossLabelRow}>
            <Text style={[styles.stopLossLabel, { color: c.textSecondary }]}>
              손절 기준가
            </Text>
            <View style={[styles.stopLossBadge, { backgroundColor: c.negative + "18" }]}>
              <Text style={[styles.stopLossBadgeText, { color: c.negative }]}>{stopLossLabel}</Text>
            </View>
          </View>
          <Text style={[styles.stopLossPrice, { color: c.negative }]}>
            ₩{stopLoss.toLocaleString()}
          </Text>
          <Text style={[styles.stopLossNote, { color: c.textTertiary }]}>
            지금 기준 {stopLossPct}% ({stopLossGap >= 0 ? "+" : ""}₩{Math.abs(stopLossGap).toLocaleString()})
          </Text>
        </View>
      </View>

      {/* 손절 전략 안내 */}
      <View style={[styles.stopTip, { backgroundColor: c.negative + "0C", borderColor: c.negative + "25" }]}>
        <Ionicons name="information-circle-outline" size={14} color={c.negative} />
        <Text style={[styles.stopTipText, { color: c.textSecondary }]}>
          {hasMa ? "MA" : "박스권"} 하단(₩{stopLossBase.toLocaleString()}) 이탈 확정 시 즉시 손절. 스윙은 언제 도망치느냐가 계좌를 지킵니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 16, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingBottom: 8 },
  sectionTitle:  { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  liveBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: "#F04452" },
  liveTxt:       { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  currentPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  currentLabel:    { fontSize: 13, fontFamily: "Inter_400Regular" },
  currentPrice:    { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  targetRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  iconBg:        { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  targetInfo:    { flex: 1 },
  targetLabel:   { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  targetPrice:   { fontSize: 17, fontFamily: "Inter_700Bold" },
  gainBadge:     { alignItems: "flex-end", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  gainText:      { fontSize: 13, fontFamily: "Inter_700Bold" },
  gainPrice:     { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  // 손절
  stopLossRow:      { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderTopWidth: 1 },
  stopLossIcon:     { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  stopLossInfo:     { flex: 1, gap: 2 },
  stopLossLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  stopLossLabel:    { fontSize: 12, fontFamily: "Inter_400Regular" },
  stopLossBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  stopLossBadgeText:{ fontSize: 10, fontFamily: "Inter_600SemiBold" },
  stopLossPrice:    { fontSize: 20, fontFamily: "Inter_700Bold" },
  stopLossNote:     { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  stopTip:          { flexDirection: "row", gap: 8, padding: 12, margin: 12, marginTop: 0, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  stopTipText:      { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
