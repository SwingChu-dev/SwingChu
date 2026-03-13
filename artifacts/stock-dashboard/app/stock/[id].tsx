import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { STOCKS, USD_KRW_RATE } from "@/constants/stockData";
import SplitEntrySection from "@/components/detail/SplitEntrySection";
import ProfitTargetSection from "@/components/detail/ProfitTargetSection";
import BoxRangeSection from "@/components/detail/BoxRangeSection";
import ForecastSection from "@/components/detail/ForecastSection";
import FinancialsSection from "@/components/detail/FinancialsSection";
import RiskSection from "@/components/detail/RiskSection";
import DayFeaturesSection from "@/components/detail/DayFeaturesSection";

type TabKey = "진입" | "익절" | "박스권" | "전망" | "재무" | "리스크" | "요일";

const TABS: TabKey[] = ["진입", "익절", "박스권", "전망", "재무", "리스크", "요일"];

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#3B82F6",
  KOSPI: "#8B5CF6",
  KOSDAQ: "#F59E0B",
};

export default function StockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("진입");

  const stock = STOCKS.find((s) => s.id === id);

  if (!stock) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: c.background }]}>
        <Text style={[styles.errorText, { color: c.text }]}>종목을 찾을 수 없습니다.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: c.tint }]}>← 뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const marketColor = MARKET_COLORS[stock.market] || "#888";
  const firstForecast = stock.forecasts[0];
  const isPositiveShort = firstForecast.changePercent >= 0;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 4, backgroundColor: c.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: c.backgroundTertiary }]}
        >
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={[styles.headerName, { color: c.text }]}>{stock.name}</Text>
            <View style={[styles.marketBadge, { backgroundColor: marketColor + "22" }]}>
              <Text style={[styles.marketText, { color: marketColor }]}>{stock.market}</Text>
            </View>
          </View>
          <View style={styles.headerPriceRow}>
            <Text style={[styles.headerPrice, { color: c.text }]}>
              ₩{stock.currentPrice.toLocaleString()}
            </Text>
            {stock.market === "NASDAQ" && (
              <View style={[styles.usdBadge, { backgroundColor: "#0064FF14" }]}>
                <Text style={[styles.usdBadgeText, { color: "#0064FF" }]}>
                  ${(stock.currentPrice / USD_KRW_RATE).toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.regionBadge, { backgroundColor: c.backgroundTertiary }]}>
              <Text style={[styles.regionText, { color: c.textSecondary }]}>
                {stock.region} · {stock.grade}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.statsBar, { backgroundColor: c.card, borderBottomColor: c.separator }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>박스권</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  stock.boxRange.currentPosition === "저점권"
                    ? c.positive
                    : stock.boxRange.currentPosition === "고점권"
                    ? c.negative
                    : c.warning,
              },
            ]}
          >
            {stock.boxRange.currentPosition}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>재무 평가</Text>
          <Text
            style={[
              styles.statValue,
              {
                color: stock.financials.evaluation.includes("저평가")
                  ? c.positive
                  : stock.financials.evaluation.includes("거품")
                  ? c.negative
                  : c.warning,
              },
            ]}
          >
            {stock.financials.evaluation}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>내일 전망</Text>
          <Text
            style={[
              styles.statValue,
              { color: isPositiveShort ? c.positive : c.negative },
            ]}
          >
            {isPositiveShort ? "+" : ""}{firstForecast.changePercent.toFixed(1)}%
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.separator }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textTertiary }]}>1차 진입</Text>
          <Text style={[styles.statValue, { color: c.tint }]}>
            -{stock.splitEntries[0].dropPercent}%
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: c.card }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && [styles.tabActive, { borderBottomColor: c.tint }],
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? c.tint : c.textSecondary },
                activeTab === tab && { fontFamily: "Inter_600SemiBold" },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.descriptionBox}>
          <Text style={[styles.description, { color: c.textSecondary }]}>
            {stock.description}
          </Text>
        </View>

        <View style={styles.themesRow}>
          {stock.themes.map((t) => (
            <View key={t} style={[styles.themeTag, { backgroundColor: c.backgroundTertiary }]}>
              <Text style={[styles.themeText, { color: c.textSecondary }]}>{t}</Text>
            </View>
          ))}
        </View>

        {activeTab === "진입" && <SplitEntrySection stock={stock} />}
        {activeTab === "익절" && <ProfitTargetSection stock={stock} />}
        {activeTab === "박스권" && <BoxRangeSection stock={stock} />}
        {activeTab === "전망" && <ForecastSection stock={stock} />}
        {activeTab === "재무" && <FinancialsSection stock={stock} />}
        {activeTab === "리스크" && <RiskSection stock={stock} />}
        {activeTab === "요일" && <DayFeaturesSection stock={stock} />}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  marketBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marketText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  headerPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerPrice: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  regionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regionText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  usdBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  usdBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statsBar: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginBottom: 3,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  tabBar: {
    maxHeight: 44,
    borderBottomWidth: 0,
  },
  tabBarContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  content: {
    flex: 1,
  },
  descriptionBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  themesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 12,
  },
  themeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  themeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottomPad: {
    height: 100,
  },
});
