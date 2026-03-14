import React from "react";
import { View, Text, StyleSheet, useColorScheme, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface DayFeaturesSectionProps {
  stock: StockInfo;
}

const DAY_COLORS = ["#3B82F6", "#8B5CF6", "#00C896", "#F59E0B", "#FF6B35"];
const DAY_SHORT = ["월", "화", "수", "목", "금"];

export default function DayFeaturesSection({ stock }: DayFeaturesSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>요일별 특징 & 유의사항</Text>
      </View>

      {stock.dayFeatures.length === 0 && (
        <View style={styles.emptyWrap}>
          <Ionicons name="calendar-outline" size={36} color={c.textTertiary} />
          <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>요일별 데이터 없음</Text>
          <Text style={[styles.emptyDesc, { color: c.textTertiary }]}>
            탐색·검색으로 추가된 종목은{"\n"}요일별 데이터가 제공되지 않습니다.
          </Text>
        </View>
      )}

      {stock.dayFeatures.map((item, i) => (
        <View
          key={i}
          style={[
            styles.dayRow,
            {
              borderBottomColor: c.separator,
              borderBottomWidth: i < stock.dayFeatures.length - 1 ? 1 : 0,
            },
          ]}
        >
          <View style={[styles.dayBadge, { backgroundColor: DAY_COLORS[i] + "22" }]}>
            <Text style={[styles.dayText, { color: DAY_COLORS[i] }]}>
              {DAY_SHORT[i]}
            </Text>
          </View>
          <View style={styles.dayContent}>
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
      ))}
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
    gap: 8,
    padding: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
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
  dayText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  dayContent: {
    flex: 1,
    gap: 4,
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
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
