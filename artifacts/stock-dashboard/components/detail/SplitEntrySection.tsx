import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface SplitEntrySectionProps {
  stock: StockInfo;
}

export default function SplitEntrySection({ stock }: SplitEntrySectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const ratioColors = ["#3B82F6", "#8B5CF6", "#00C896"];
  const totalRatio = stock.splitEntries.reduce((s, e) => s + e.ratio, 0);

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="git-branch" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          30·30·40 분할매수 진입 전략
        </Text>
      </View>

      <View style={styles.barContainer}>
        {stock.splitEntries.map((entry, i) => (
          <View
            key={i}
            style={[
              styles.barSegment,
              {
                flex: entry.ratio,
                backgroundColor: ratioColors[i],
                borderRadius: i === 0 ? 4 : i === stock.splitEntries.length - 1 ? 4 : 0,
                borderTopLeftRadius: i === 0 ? 4 : 0,
                borderBottomLeftRadius: i === 0 ? 4 : 0,
                borderTopRightRadius: i === stock.splitEntries.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === stock.splitEntries.length - 1 ? 4 : 0,
              },
            ]}
          >
            <Text style={styles.barLabel}>{entry.ratio}%</Text>
          </View>
        ))}
      </View>

      {stock.splitEntries.map((entry, i) => (
        <View
          key={i}
          style={[styles.entryRow, { borderBottomColor: c.separator, borderBottomWidth: i < stock.splitEntries.length - 1 ? 1 : 0 }]}
        >
          <View style={[styles.indexBadge, { backgroundColor: ratioColors[i] + "22" }]}>
            <Text style={[styles.indexText, { color: ratioColors[i] }]}>
              {i + 1}차
            </Text>
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
            <Text style={[styles.entryRatio, { color: ratioColors[i] }]}>
              {entry.ratio}% 투입
            </Text>
          </View>
        </View>
      ))}

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
  barContainer: {
    flexDirection: "row",
    height: 28,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 4,
    overflow: "hidden",
    gap: 2,
  },
  barSegment: {
    justifyContent: "center",
    alignItems: "center",
  },
  barLabel: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  indexBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  entryInfo: {
    flex: 1,
  },
  entryLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  entryPrice: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  entryRight: {
    alignItems: "flex-end",
  },
  entryRatio: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tip: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    margin: 12,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
