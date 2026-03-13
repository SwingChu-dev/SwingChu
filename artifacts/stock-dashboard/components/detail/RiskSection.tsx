import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface RiskSectionProps {
  stock: StockInfo;
}

export default function RiskSection({ stock }: RiskSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const items = [
    {
      icon: "globe" as const,
      title: "지정학적 리스크",
      content: stock.risk.geopolitical,
      color: "#FF6B35",
    },
    {
      icon: "trending-up" as const,
      title: "기술적 반등 포인트",
      content: stock.risk.technicalBounce,
      color: "#00C896",
    },
    {
      icon: "shield-checkmark" as const,
      title: "대처 전략",
      content: stock.risk.strategy,
      color: "#3B82F6",
    },
    {
      icon: "flash" as const,
      title: "마녀의 날 대처법",
      content: stock.witchDayStrategy,
      color: "#8B5CF6",
    },
  ];

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="warning" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          리스크 & 이벤트 대처
        </Text>
      </View>

      {items.map((item, i) => (
        <View
          key={i}
          style={[
            styles.item,
            { borderBottomColor: c.separator, borderBottomWidth: i < items.length - 1 ? 1 : 0 },
          ]}
        >
          <View style={[styles.iconBg, { backgroundColor: item.color + "22" }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, { color: item.color }]}>{item.title}</Text>
            <Text style={[styles.itemText, { color: c.textSecondary }]}>
              {item.content}
            </Text>
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
  item: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  itemText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
