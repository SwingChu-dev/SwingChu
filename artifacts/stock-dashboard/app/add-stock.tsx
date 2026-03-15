import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { STOCKS } from "@/constants/stockData";
import { useWatchlist } from "@/context/WatchlistContext";

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#0064FF",
  KOSPI:  "#2DB55D",
  KOSDAQ: "#FF6B35",
};

const MARKET_LABELS: Record<string, string> = {
  NASDAQ: "NASDAQ",
  KOSPI:  "KOSPI",
  KOSDAQ: "KOSDAQ",
};

type StockItem = (typeof STOCKS)[number];

const sections = [
  { market: "NASDAQ", data: STOCKS.filter((s) => s.market === "NASDAQ") },
  { market: "KOSPI",  data: STOCKS.filter((s) => s.market === "KOSPI")  },
  { market: "KOSDAQ", data: STOCKS.filter((s) => s.market === "KOSDAQ") },
].filter((s) => s.data.length > 0);

export default function AddStockSheet() {
  const isDark  = useColorScheme() === "dark";
  const c       = isDark ? Colors.dark : Colors.light;
  const insets  = useSafeAreaInsets();
  const { addStock, removeStock, isInWatchlist } = useWatchlist();

  const handleToggle = (item: StockItem) => {
    if (isInWatchlist(item.id)) removeStock(item.id);
    else addStock(item.id);
  };

  const renderSectionHeader = ({ section }: { section: (typeof sections)[number] }) => {
    const color = MARKET_COLORS[section.market] ?? "#888";
    return (
      <View style={[styles.sectionHeader, { backgroundColor: c.background }]}>
        <View style={[styles.marketDot, { backgroundColor: color }]} />
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
          {MARKET_LABELS[section.market]}
        </Text>
        <Text style={[styles.sectionCount, { color: c.textTertiary }]}>
          {section.data.length}개
        </Text>
      </View>
    );
  };

  const renderItem = ({ item, index, section }: { item: StockItem; index: number; section: (typeof sections)[number] }) => {
    const inList   = isInWatchlist(item.id);
    const mktColor = MARKET_COLORS[item.market] ?? "#888";
    const isLast   = index === section.data.length - 1;

    return (
      <View style={[styles.rowWrap, { backgroundColor: c.backgroundSecondary, borderColor: c.separator }]}>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.ticker, { color: c.textTertiary }]}>
              {item.ticker}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.btn,
              inList
                ? { backgroundColor: c.negative + "15", borderColor: c.negative + "35" }
                : { backgroundColor: mktColor + "15",   borderColor: mktColor + "35" },
            ]}
            onPress={() => handleToggle(item)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={inList ? "checkmark" : "add"}
              size={15}
              color={inList ? c.negative : mktColor}
            />
            <Text style={[styles.btnText, { color: inList ? c.negative : mktColor }]}>
              {inList ? "제거" : "추가"}
            </Text>
          </TouchableOpacity>
        </View>
        {!isLast && (
          <View style={[styles.divider, { backgroundColor: c.separator }]} />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: c.separator, paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>종목 추가</Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: c.tint }]}
          onPress={() => router.back()}
        >
          <Text style={styles.doneBtnText}>완료</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingBottom:     14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", marginLeft: 2 },
  doneBtn:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  doneBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  list: { paddingHorizontal: 16, paddingTop: 12 },

  sectionHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            7,
    paddingBottom:  8,
    paddingTop:     4,
    paddingLeft:    2,
  },
  marketDot:    { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  sectionCount: { fontSize: 12, fontFamily: "Inter_400Regular" },

  rowWrap: {
    borderRadius:  0,
    overflow:      "hidden",
  },
  row: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   13,
  },
  left:   { flex: 1, gap: 2 },
  name:   { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ticker: { fontSize: 12, fontFamily: "Inter_400Regular" },

  btn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 11,
    paddingVertical:   6,
    borderRadius:      20,
    borderWidth:       1,
  },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
});
