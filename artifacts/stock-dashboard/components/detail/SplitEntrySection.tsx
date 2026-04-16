import React, { useMemo } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface SplitEntrySectionProps {
  stock:      StockInfo;
  livePrice?: number;
}

// 5% 매수그물: 0 / -5 / -10 / -15 / -20% 단계별 체증 비중
const GRID_STEPS = [
  { drop: 0,  ratio: 10, color: "#3B82F6" },
  { drop: 5,  ratio: 15, color: "#6366F1" },
  { drop: 10, ratio: 20, color: "#8B5CF6" },
  { drop: 15, ratio: 25, color: "#A855F7" },
  { drop: 20, ratio: 30, color: "#EC4899" },
];

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

  const basePrice = livePrice && livePrice > 0 ? livePrice : stock.currentPrice;
  const isLive    = !!(livePrice && livePrice > 0 && livePrice !== stock.currentPrice);
  const isKRW     = stock.currency === "KRW";

  // 매수그물 단계 계산
  const steps = useMemo(() => GRID_STEPS.map(s => ({
    ...s,
    price: isKRW
      ? Math.round(basePrice * (1 - s.drop / 100) / 50) * 50   // 원화 50원 단위 반올림
      : +( basePrice * (1 - s.drop / 100) ).toFixed(2),
  })), [basePrice, isKRW]);

  // 가중평균 진입가 (전체 매수 시)
  const avgEntry = useMemo(() => {
    const total = steps.reduce((sum, s) => sum + s.ratio * s.price, 0);
    return isKRW
      ? Math.round(total / 100 / 50) * 50
      : +(total / 100).toFixed(2);
  }, [steps, isKRW]);

  const deadline = addBusinessDays(new Date(), 5);
  const target3pct = isKRW
    ? Math.round(steps[0].price * 1.03 / 50) * 50
    : +(steps[0].price * 1.03).toFixed(2);

  const fmt = (n: number) =>
    isKRW ? `₩${n.toLocaleString()}` : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>

      {/* 헤더 */}
      <View style={styles.sectionHeader}>
        <Ionicons name="git-network-outline" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>5% 매수그물 전략</Text>
        {isLive && (
          <View style={[styles.liveBadge, { backgroundColor: "#F04452" + "18" }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveTxt, { color: "#F04452" }]}>실시간</Text>
          </View>
        )}
      </View>

      {/* 비율 막대 */}
      <View style={styles.barWrap}>
        {steps.map((s, i) => (
          <View key={i} style={[styles.barSeg, {
            flex: s.ratio,
            backgroundColor: s.color,
            borderTopLeftRadius:    i === 0 ? 5 : 0,
            borderBottomLeftRadius: i === 0 ? 5 : 0,
            borderTopRightRadius:    i === steps.length - 1 ? 5 : 0,
            borderBottomRightRadius: i === steps.length - 1 ? 5 : 0,
          }]}>
            <Text style={styles.barLabel}>{s.ratio}%</Text>
          </View>
        ))}
      </View>

      {/* 단계 행 */}
      {steps.map((s, i) => (
        <View key={i} style={[styles.stepRow, {
          borderBottomColor: c.separator,
          borderBottomWidth: i < steps.length - 1 ? StyleSheet.hairlineWidth : 0,
        }]}>
          {/* 왼쪽: 차수 뱃지 */}
          <View style={[styles.badge, { backgroundColor: s.color + "22" }]}>
            <Text style={[styles.badgeTxt, { color: s.color }]}>{i + 1}차</Text>
          </View>

          {/* 가운데: 레이블 + 가격 */}
          <View style={styles.stepInfo}>
            <Text style={[styles.stepLabel, { color: c.textSecondary }]}>
              {s.drop === 0 ? "기준가 진입" : `-${s.drop}% 하락 시 추가매수`}
            </Text>
            <Text style={[styles.stepPrice, { color: c.text }]}>{fmt(s.price)}</Text>
          </View>

          {/* 오른쪽: 비중 */}
          <View style={styles.stepRight}>
            <Text style={[styles.stepRatio, { color: s.color }]}>{s.ratio}%</Text>
            <Text style={[styles.stepRatioSub, { color: c.textTertiary }]}>투입</Text>
          </View>
        </View>
      ))}

      {/* 가중평균 진입가 카드 */}
      <View style={[styles.avgCard, { backgroundColor: c.backgroundTertiary, borderColor: c.separator }]}>
        <View style={styles.avgRow}>
          <View style={styles.avgLeft}>
            <Ionicons name="calculator-outline" size={14} color={c.textSecondary} />
            <Text style={[styles.avgLabel, { color: c.textSecondary }]}>전 단계 매수 시 가중평균 진입가</Text>
          </View>
          <Text style={[styles.avgPrice, { color: c.text }]}>{fmt(avgEntry)}</Text>
        </View>
        <Text style={[styles.avgNote, { color: c.textTertiary }]}>
          하락할수록 비중 확대 → 평단가 낮추는 피라미딩 구조
        </Text>
      </View>

      {/* T+5 타임스톱 */}
      <View style={[styles.timestopCard, { backgroundColor: "#F59E0B12", borderColor: "#F59E0B35" }]}>
        <View style={styles.timestopHeader}>
          <Ionicons name="timer-outline" size={15} color="#F59E0B" />
          <Text style={[styles.timestopTitle, { color: c.text }]}>T+5 타임스톱</Text>
          <View style={[styles.deadlineBadge, { backgroundColor: "#F59E0B22" }]}>
            <Text style={[styles.deadlineText, { color: "#F59E0B" }]}>유효기간 ~{fmtDate(deadline)}</Text>
          </View>
        </View>
        <Text style={[styles.timestopBody, { color: c.textSecondary }]}>
          5영업일 이내{" "}
          <Text style={{ color: "#F59E0B", fontFamily: "Inter_600SemiBold" }}>+3% ({fmt(target3pct)})</Text>
          {" "}미달성 시 진입가 근방 즉시 탈출 — 스윙은 시간도 비용
        </Text>
      </View>

      {/* 하단 팁 */}
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
  section:       { borderRadius: 16, borderWidth: 1, marginHorizontal: 16, marginBottom: 12, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingBottom: 12 },
  sectionTitle:  { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  liveBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: "#F04452" },
  liveTxt:       { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  barWrap: { flexDirection: "row", height: 24, marginHorizontal: 16, marginBottom: 12, borderRadius: 5, overflow: "hidden", gap: 2 },
  barSeg:  { justifyContent: "center", alignItems: "center" },
  barLabel:{ color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },

  stepRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, gap: 12 },
  badge:     { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  badgeTxt:  { fontSize: 12, fontFamily: "Inter_700Bold" },
  stepInfo:  { flex: 1 },
  stepLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  stepPrice: { fontSize: 16, fontFamily: "Inter_700Bold" },
  stepRight: { alignItems: "flex-end" },
  stepRatio: { fontSize: 15, fontFamily: "Inter_700Bold" },
  stepRatioSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  avgCard:  { margin: 12, marginTop: 4, borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  avgRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avgLeft:  { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  avgLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  avgPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  avgNote:  { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },

  timestopCard:   { margin: 12, marginTop: 0, borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  timestopHeader: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  timestopTitle:  { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  deadlineBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  deadlineText:   { fontSize: 11, fontFamily: "Inter_700Bold" },
  timestopBody:   { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  tip:     { flexDirection: "row", gap: 8, padding: 12, margin: 12, marginTop: 0, borderRadius: 10, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
