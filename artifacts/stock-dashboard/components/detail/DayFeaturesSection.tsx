import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { StockInfo } from "@/constants/stockData";
import { DAY_GUIDE, type Dow } from "@/constants/dayOfWeekGuide";

interface DayFeaturesSectionProps {
  /** 종목 prop은 호환성 유지용. 본 컴포넌트는 전 종목 공통 가이드를 표시. */
  stock?: StockInfo;
}

const DAY_COLORS: Record<Dow, string> = {
  1: "#3B82F6",
  2: "#8B5CF6",
  3: "#00C896",
  4: "#F59E0B",
  5: "#FF6B35",
};

export default function DayFeaturesSection({}: DayFeaturesSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const todayDow = new Date().getDay() as Dow | 0 | 6;
  const isWeekday = todayDow >= 1 && todayDow <= 5;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar" size={18} color={c.aiAccent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>시장 요일별 특징</Text>
          <Text style={[styles.sectionSub, { color: c.textTertiary }]}>
            전 종목 공통 가이드 · 실제 매매에 함께 적용
          </Text>
        </View>
      </View>

      {DAY_GUIDE.map((item, i) => {
        const isToday = isWeekday && item.dow === todayDow;
        return (
          <View
            key={item.dow}
            style={[
              styles.dayRow,
              {
                borderBottomColor: c.separator,
                borderBottomWidth: i < DAY_GUIDE.length - 1 ? 1 : 0,
                backgroundColor: isToday ? c.aiGlow : "transparent",
              },
            ]}
          >
            <View style={[
              styles.dayBadge,
              {
                backgroundColor: DAY_COLORS[item.dow] + "22",
                borderWidth: isToday ? 1.5 : 0,
                borderColor: c.aiAccent,
              },
            ]}>
              <Text style={[styles.dayText, { color: DAY_COLORS[item.dow] }]}>
                {item.dowLabel}
              </Text>
            </View>
            <View style={styles.dayContent}>
              {isToday && (
                <Text style={[styles.todayBadge, { color: c.aiAccent }]}>오늘 {item.emoji}</Text>
              )}
              <View style={styles.dayFeature}>
                <Ionicons name="information-circle-outline" size={13} color={c.tintBlue} />
                <Text style={[styles.featureText, { color: c.text }]}>{item.feature}</Text>
              </View>
              <View style={styles.dayCaution}>
                <Ionicons name="alert-circle-outline" size={13} color={c.warning} />
                <Text style={[styles.cautionText, { color: c.warning }]}>{item.caution}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    paddingBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  dayRow: {
    flexDirection: "row",
    padding: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  dayText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  dayContent: { flex: 1, gap: 4 },
  todayBadge: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  dayFeature: {
    flexDirection: "row",
    gap: 5,
    alignItems: "flex-start",
  },
  dayCaution: {
    flexDirection: "row",
    gap: 5,
    alignItems: "flex-start",
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  cautionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
