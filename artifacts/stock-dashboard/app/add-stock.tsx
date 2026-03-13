import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { STOCKS } from "@/constants/stockData";
import { useWatchlist } from "@/context/WatchlistContext";

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#3B82F6",
  KOSPI: "#8B5CF6",
  KOSDAQ: "#F59E0B",
};

export default function AddStockSheet() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { addStock, removeStock, isInWatchlist } = useWatchlist();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STOCKS;
    return STOCKS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q) ||
        s.market.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <Text style={[styles.title, { color: c.text }]}>종목 편집</Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: c.tint }]}
          onPress={() => router.back()}
        >
          <Text style={styles.doneBtnText}>완료</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: c.backgroundSecondary }]}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: isDark ? "#1E2D3D" : "#F0F4F8" },
          ]}
        >
          <Ionicons name="search" size={16} color={c.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="종목명, 티커 검색"
            placeholderTextColor={c.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={c.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
          전체 종목 ({results.length}개)
        </Text>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          {results.map((stock, idx) => {
            const inList = isInWatchlist(stock.id);
            const marketColor = MARKET_COLORS[stock.market] || "#888";
            const isLast = idx === results.length - 1;

            return (
              <View key={stock.id}>
                <View style={styles.row}>
                  <View style={styles.stockInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.stockName, { color: c.text }]}>
                        {stock.name}
                      </Text>
                      <View
                        style={[
                          styles.marketBadge,
                          { backgroundColor: marketColor + "20" },
                        ]}
                      >
                        <Text style={[styles.marketText, { color: marketColor }]}>
                          {stock.market}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.ticker, { color: c.textTertiary }]}>
                      {stock.ticker} · ₩{stock.currentPrice.toLocaleString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      inList
                        ? { backgroundColor: c.negative + "18", borderColor: c.negative + "40" }
                        : { backgroundColor: c.tint + "18", borderColor: c.tint + "40" },
                    ]}
                    onPress={() => {
                      if (inList) removeStock(stock.id);
                      else addStock(stock.id);
                    }}
                  >
                    <Ionicons
                      name={inList ? "remove" : "add"}
                      size={18}
                      color={inList ? c.negative : c.tint}
                    />
                    <Text
                      style={[
                        styles.toggleText,
                        { color: inList ? c.negative : c.tint },
                      ]}
                    >
                      {inList ? "삭제" : "추가"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!isLast && (
                  <View
                    style={[styles.separator, { backgroundColor: c.separator }]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  stockInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stockName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  marketBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  marketText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  ticker: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
