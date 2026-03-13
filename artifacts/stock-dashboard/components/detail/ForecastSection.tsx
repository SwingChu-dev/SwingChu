import React from "react";
import { View, Text, StyleSheet, useColorScheme, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface ForecastSectionProps {
  stock: StockInfo;
}

export default function ForecastSection({ stock }: ForecastSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const maxChange = Math.max(...stock.forecasts.map((f) => Math.abs(f.changePercent)));

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="time" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>예상 주가 전망</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastScroll}>
        {stock.forecasts.map((forecast, i) => {
          const isPositive = forecast.changePercent >= 0;
          const barHeight = Math.abs((forecast.changePercent / maxChange) * 60);

          return (
            <View key={i} style={styles.forecastItem}>
              <Text
                style={[
                  styles.changePercent,
                  { color: isPositive ? c.positive : c.negative },
                ]}
              >
                {isPositive ? "+" : ""}
                {forecast.changePercent.toFixed(1)}%
              </Text>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      backgroundColor: isPositive ? c.positive : c.negative,
                      opacity: 0.3 + (i / stock.forecasts.length) * 0.7,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.price, { color: c.text }]}>
                ₩{(forecast.price / 1000).toFixed(0)}K
              </Text>
              <Text style={[styles.period, { color: c.textTertiary }]}>
                {forecast.period.replace(" 후", "")}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.disclaimer, { borderTopColor: c.separator }]}>
        <Ionicons name="information-circle-outline" size={13} color={c.textTertiary} />
        <Text style={[styles.disclaimerText, { color: c.textTertiary }]}>
          예상 주가는 기술적 분석 기반 참고 정보이며, 투자 판단의 책임은 투자자 본인에게 있습니다.
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
  forecastScroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  forecastItem: {
    alignItems: "center",
    width: 70,
  },
  changePercent: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  barWrapper: {
    height: 70,
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  bar: {
    width: 30,
    borderRadius: 4,
    minHeight: 4,
  },
  price: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  period: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  disclaimer: {
    flexDirection: "row",
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    alignItems: "flex-start",
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
});
