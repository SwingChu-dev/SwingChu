import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface ProfitTargetSectionProps {
  stock: StockInfo;
}

const PROFIT_LABELS = ["단기 익절 (3%)", "중기 익절 (8%)", "목표 익절 (15%)"];
const PROFIT_ICONS: ("checkmark-circle" | "trending-up" | "rocket")[] = [
  "checkmark-circle",
  "trending-up",
  "rocket",
];
const PROFIT_COLORS = ["#F59E0B", "#00C896", "#3B82F6"];

export default function ProfitTargetSection({ stock }: ProfitTargetSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trophy" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          익절 목표가
        </Text>
      </View>

      <View style={styles.currentPriceRow}>
        <Text style={[styles.currentLabel, { color: c.textTertiary }]}>현재가</Text>
        <Text style={[styles.currentPrice, { color: c.text }]}>
          ₩{stock.currentPrice.toLocaleString()}
        </Text>
      </View>

      {stock.profitTargets.map((target, i) => {
        const gain = target.price - stock.currentPrice;
        const gainPerPer = ((gain / stock.currentPrice) * 100).toFixed(1);
        return (
          <View
            key={i}
            style={[
              styles.targetRow,
              {
                borderBottomColor: c.separator,
                borderBottomWidth: i < stock.profitTargets.length - 1 ? 1 : 0,
              },
            ]}
          >
            <View style={[styles.iconBg, { backgroundColor: PROFIT_COLORS[i] + "22" }]}>
              <Ionicons name={PROFIT_ICONS[i]} size={18} color={PROFIT_COLORS[i]} />
            </View>
            <View style={styles.targetInfo}>
              <Text style={[styles.targetLabel, { color: c.textSecondary }]}>
                {PROFIT_LABELS[i]}
              </Text>
              <Text style={[styles.targetPrice, { color: c.text }]}>
                ₩{target.price.toLocaleString()}
              </Text>
            </View>
            <View style={[styles.gainBadge, { backgroundColor: PROFIT_COLORS[i] + "22" }]}>
              <Text style={[styles.gainText, { color: PROFIT_COLORS[i] }]}>
                +{target.percent}%
              </Text>
              <Text style={[styles.gainPrice, { color: PROFIT_COLORS[i] }]}>
                +₩{gain.toLocaleString()}
              </Text>
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
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  currentPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  currentLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  currentPrice: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  targetInfo: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  targetPrice: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  gainBadge: {
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  gainText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  gainPrice: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
