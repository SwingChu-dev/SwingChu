import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ISRAEL_DATA, IsraelLevel } from "@/constants/israelData";

const LEVEL_COLOR: Record<IsraelLevel, string> = {
  높음: "#F04452",
  중간: "#F59E0B",
  낮음: "#3B82F6",
  없음: "#6B7280",
};

const LEVEL_BG: Record<IsraelLevel, string> = {
  높음: "#F0445218",
  중간: "#F59E0B18",
  낮음: "#3B82F618",
  없음: "#6B728018",
};

const LEVEL_ICON: Record<IsraelLevel, "alert-circle" | "warning" | "information-circle" | "checkmark-circle"> = {
  높음: "alert-circle",
  중간: "warning",
  낮음: "information-circle",
  없음: "checkmark-circle",
};

interface Props {
  stockId: string;
}

export default function IsraelSection({ stockId }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const data = ISRAEL_DATA[stockId];

  if (!data) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.empty, { color: c.textSecondary }]}>이스라엘 관계 데이터 없음</Text>
      </View>
    );
  }

  const color  = LEVEL_COLOR[data.level];
  const bg     = LEVEL_BG[data.level];
  const icon   = LEVEL_ICON[data.level];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>

      {/* 관계 레벨 헤더 */}
      <View style={[styles.levelCard, { backgroundColor: bg, borderColor: color + "40" }]}>
        <Ionicons name={icon} size={28} color={color} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.levelRow}>
            <Text style={[styles.levelLabel, { color: c.textSecondary }]}>이스라엘 관계</Text>
            <View style={[styles.levelBadge, { backgroundColor: color }]}>
              <Text style={styles.levelBadgeText}>{data.level}</Text>
            </View>
          </View>
          <Text style={[styles.description, { color: c.text }]}>{data.description}</Text>
        </View>
      </View>

      {/* 레벨 게이지 */}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>관계 강도</Text>
        <View style={styles.gauge}>
          {(["없음", "낮음", "중간", "높음"] as IsraelLevel[]).map((lvl) => {
            const active = lvl === data.level;
            return (
              <View key={lvl} style={styles.gaugeItem}>
                <View style={[
                  styles.gaugeBar,
                  { backgroundColor: active ? LEVEL_COLOR[lvl] : isDark ? "#333" : "#E5E7EB" },
                ]} />
                <Text style={[
                  styles.gaugeLabel,
                  { color: active ? LEVEL_COLOR[lvl] : c.textTertiary },
                  active && { fontFamily: "Inter_700Bold" },
                ]}>
                  {lvl}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 세부 내용 */}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>세부 내용</Text>
        {data.details.map((d, i) => (
          <View key={i} style={styles.detailRow}>
            <View style={[styles.bullet, { backgroundColor: color }]} />
            <Text style={[styles.detailText, { color: c.text }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* 스윙 트레이딩 관점 */}
      <View style={[styles.swingCard, { backgroundColor: color + "12", borderColor: color + "30" }]}>
        <View style={styles.swingHeader}>
          <Ionicons name="trending-up" size={15} color={color} />
          <Text style={[styles.swingTitle, { color }]}>스윙 트레이딩 관점</Text>
        </View>
        <Text style={[styles.swingText, { color: c.text }]}>{data.swingNote}</Text>
      </View>

      {/* 면책 */}
      <Text style={[styles.disclaimer, { color: c.textTertiary }]}>
        * 본 정보는 공개된 자료 기반이며 투자 판단의 유일한 근거로 삼지 마세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  empty:      { textAlign: "center", marginTop: 40, fontSize: 14 },

  levelCard:  {
    borderRadius: 14,
    borderWidth:  1,
    padding:      16,
    flexDirection:"row",
    alignItems:   "flex-start",
    gap:          12,
  },
  levelRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  levelLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  levelBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  description:{ fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },

  card:       { borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle:{ fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },

  gauge:      { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  gaugeItem:  { flex: 1, alignItems: "center", gap: 6 },
  gaugeBar:   { width: "100%", height: 6, borderRadius: 3 },
  gaugeLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  detailRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet:     { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  detailText: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },

  swingCard:  { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  swingHeader:{ flexDirection: "row", alignItems: "center", gap: 6 },
  swingTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  swingText:  { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },

  disclaimer: { fontSize: 10, textAlign: "center", lineHeight: 16 },
});
