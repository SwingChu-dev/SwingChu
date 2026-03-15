import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface SplitEntrySectionProps {
  stock:      StockInfo;
  livePrice?: number;
}

const RATIO_COLORS = ["#3B82F6", "#8B5CF6", "#00C896"];

// T+5 유효기간: 오늘부터 5영업일 후 날짜
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function fmtDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`;
}

export default function SplitEntrySection({ stock, livePrice }: SplitEntrySectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const totalRatio = stock.splitEntries.reduce((s, e) => s + e.ratio, 0);

  const today     = new Date();
  const deadline  = addBusinessDays(today, 5);
  const basePrice = livePrice && livePrice > 0 ? livePrice : stock.currentPrice;
  // T+5 목표가: 진입가 기준 +3%
  const target3pct = Math.round(stock.splitEntries[0]?.targetPrice * 1.03);

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="git-branch" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          30·30·40 분할매수 진입 전략
        </Text>
      </View>

      {/* 비율 바 */}
      <View style={styles.barContainer}>
        {stock.splitEntries.map((entry, i) => (
          <View
            key={i}
            style={[
              styles.barSegment,
              {
                flex: entry.ratio,
                backgroundColor: RATIO_COLORS[i],
                borderTopLeftRadius:     i === 0 ? 4 : 0,
                borderBottomLeftRadius:  i === 0 ? 4 : 0,
                borderTopRightRadius:    i === stock.splitEntries.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === stock.splitEntries.length - 1 ? 4 : 0,
              },
            ]}
          >
            <Text style={styles.barLabel}>{entry.ratio}%</Text>
          </View>
        ))}
      </View>

      {/* 진입 단계 */}
      {stock.splitEntries.map((entry, i) => (
        <View
          key={i}
          style={[styles.entryRow, { borderBottomColor: c.separator, borderBottomWidth: i < stock.splitEntries.length - 1 ? 1 : 0 }]}
        >
          <View style={[styles.indexBadge, { backgroundColor: RATIO_COLORS[i] + "22" }]}>
            <Text style={[styles.indexText, { color: RATIO_COLORS[i] }]}>{i + 1}차</Text>
          </View>
          <View style={styles.entryInfo}>
            <Text style={[styles.entryLabel, { color: c.textSecondary }]}>
              {entry.dropPercent}% 하락 시 진입
            </Text>
            <Text style={[styles.entryPrice, { color: c.text }]}>
              ₩{entry.targetPrice.toLocaleString()}
            </Text>
          </View>
          <View style={styles.entryRight}>
            <Text style={[styles.entryRatio, { color: RATIO_COLORS[i] }]}>
              {entry.ratio}% 투입
            </Text>
          </View>
        </View>
      ))}

      {/* T+5 타임스톱 카드 */}
      <View style={[styles.timestopCard, { backgroundColor: "#F59E0B" + "12", borderColor: "#F59E0B" + "35" }]}>
        <View style={styles.timestopHeader}>
          <Ionicons name="timer-outline" size={15} color="#F59E0B" />
          <Text style={[styles.timestopTitle, { color: c.text }]}>T+5 타임스톱 (Time-stop)</Text>
          <View style={[styles.deadlineBadge, { backgroundColor: "#F59E0B" + "22" }]}>
            <Text style={[styles.deadlineText, { color: "#F59E0B" }]}>
              유효기간 ~{fmtDate(deadline)}
            </Text>
          </View>
        </View>

        <View style={styles.timestopBody}>
          <View style={styles.timestopGoal}>
            <Text style={[styles.timestopGoalLabel, { color: c.textTertiary }]}>5일 내 목표</Text>
            <Text style={[styles.timestopGoalPrice, { color: c.text }]}>
              +3%  ₩{target3pct.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.timestopDivider, { backgroundColor: c.separator }]} />
          <Text style={[styles.timestopRule, { color: c.textSecondary }]}>
            5영업일 이내 +3% 미달성 시{"\n"}
            <Text style={{ color: c.text, fontFamily: "Inter_600SemiBold" }}>
              진입가 근방에서 즉시 탈출
            </Text>
            — 스윙은 시간이 비용
          </Text>
        </View>
      </View>

      {/* 팁 */}
      <View style={[styles.tip, { backgroundColor: c.backgroundTertiary }]}>
        <Ionicons name="bulb-outline" size={14} color={c.tint} />
        <Text style={[styles.tipText, { color: c.textSecondary }]}>
          {stock.entryRecommendation}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 16, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingBottom: 12 },
  sectionTitle:  { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  barContainer:  { flexDirection: "row", height: 28, marginHorizontal: 16, marginBottom: 12, borderRadius: 4, overflow: "hidden", gap: 2 },
  barSegment:    { justifyContent: "center", alignItems: "center" },
  barLabel:      { color: "#FFF", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  entryRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  indexBadge:    { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  indexText:     { fontSize: 12, fontFamily: "Inter_700Bold" },
  entryInfo:     { flex: 1 },
  entryLabel:    { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  entryPrice:    { fontSize: 17, fontFamily: "Inter_700Bold" },
  entryRight:    { alignItems: "flex-end" },
  entryRatio:    { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // T+5 카드
  timestopCard:   { margin: 12, marginTop: 4, borderRadius: 12, borderWidth: 1, padding: 12 },
  timestopHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  timestopTitle:  { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  deadlineBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  deadlineText:   { fontSize: 11, fontFamily: "Inter_700Bold" },
  timestopBody:   { gap: 8 },
  timestopGoal:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timestopGoalLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timestopGoalPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  timestopDivider:   { height: StyleSheet.hairlineWidth },
  timestopRule:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  tip:     { flexDirection: "row", gap: 8, padding: 12, margin: 12, borderRadius: 10, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
