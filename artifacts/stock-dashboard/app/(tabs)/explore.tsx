import React, { useState, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import { UNIVERSE_STOCKS, UniverseStock, UniverseMarket } from "@/constants/stockUniverse";
import { STOCKS, USD_KRW_RATE } from "@/constants/stockData";

type MarketFilter = "ALL" | UniverseMarket;

const MARKET_TABS: { key: MarketFilter; label: string }[] = [
  { key: "ALL",    label: "전체" },
  { key: "NASDAQ", label: "NASDAQ" },
  { key: "KOSPI",  label: "KOSPI" },
  { key: "KOSDAQ", label: "KOSDAQ" },
];

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#3B82F6",
  KOSPI:  "#8B5CF6",
  KOSDAQ: "#F59E0B",
};

// Approximate row height for getItemLayout (avoids measuring every row)
const ITEM_HEIGHT = 78;

function formatPrice(p: number, market: string): string {
  if (p === 0) return "—";
  if (market === "KOSPI" || market === "KOSDAQ") {
    if (p >= 1000000) return `₩${(p / 1000000).toFixed(1)}M`;
    if (p >= 10000)   return `₩${Math.round(p / 10000)}만`;
    return `₩${p.toLocaleString()}`;
  }
  return `₩${Math.round(p).toLocaleString()}`;
}

// ─── Memoized row ─────────────────────────────────────────────────────────────
interface RowProps {
  item:       UniverseStock;
  inWatchlist:boolean;
  onToggle:   () => void;
  c:          any;
}

const StockRow = memo(function StockRow({ item, inWatchlist, onToggle, c }: RowProps) {
  const mc     = MARKET_COLORS[item.market] || "#888";
  const isUSD  = item.market === "NASDAQ";
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderBottomColor: c.separator }]}>
      <View style={styles.rowLeft}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.mktBadge, { backgroundColor: mc + "20" }]}>
            <Text style={[styles.mktText, { color: mc }]}>{item.market}</Text>
          </View>
        </View>
        <Text style={[styles.sub, { color: c.textTertiary }]}>
          {item.ticker} · {item.sector}
        </Text>
        {item.marketCap !== "-" && (
          <Text style={[styles.cap, { color: c.textTertiary }]}>시총 {item.marketCap}</Text>
        )}
      </View>

      <View style={styles.rowRight}>
        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: c.text }]}>{formatPrice(item.currentPrice, item.market)}</Text>
          {isUSD && item.currentPrice > 0 && (
            <Text style={[styles.usd, { color: c.textTertiary }]}>
              ${(item.currentPrice / USD_KRW_RATE).toFixed(2)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            inWatchlist
              ? { backgroundColor: "#F0445218", borderColor: "#F0445240" }
              : { backgroundColor: "#0064FF18", borderColor: "#0064FF40" },
          ]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <Ionicons name={inWatchlist ? "checkmark" : "add"} size={16}
            color={inWatchlist ? "#F04452" : "#0064FF"} />
          <Text style={[styles.toggleText, { color: inWatchlist ? "#F04452" : "#0064FF" }]}>
            {inWatchlist ? "추가됨" : "추가"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prev, next) =>
  prev.inWatchlist === next.inWatchlist &&
  prev.item.id     === next.item.id     &&
  prev.c           === next.c
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const isDark = useColorScheme() === "dark";
  const c      = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { watchlistIds, removeStock, addFromUniverse } = useWatchlist();

  const [query,  setQuery]  = useState("");
  const [market, setMarket] = useState<MarketFilter>("ALL");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UNIVERSE_STOCKS.filter((s) => {
      const mOk = market === "ALL" || s.market === market;
      if (!q) return mOk;
      return mOk && (
        s.name.toLowerCase().includes(q)   ||
        s.nameEn.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    });
  }, [query, market]);

  // Stable watchlistSet for O(1) lookup (avoids Array.includes on every row)
  const watchlistSet = useMemo(() => new Set(watchlistIds), [watchlistIds]);

  const isInWatchlist = useCallback((item: UniverseStock): boolean => {
    const pre = STOCKS.find((s) => s.ticker === item.ticker);
    return pre ? watchlistSet.has(pre.id) : watchlistSet.has(item.id);
  }, [watchlistSet]);

  const handleToggle = useCallback((item: UniverseStock) => {
    const pre      = STOCKS.find((s) => s.ticker === item.ticker);
    const targetId = pre ? pre.id : item.id;
    if (watchlistSet.has(targetId)) removeStock(targetId);
    else addFromUniverse(item);
  }, [watchlistSet, removeStock, addFromUniverse]);

  const addedCount = useMemo(
    () => results.filter((s) => isInWatchlist(s)).length,
    [results, isInWatchlist]
  );

  // Fixed-height rows allow FlatList to skip measuring and jump to any offset instantly
  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    []
  );

  const renderItem = useCallback(({ item }: { item: UniverseStock }) => (
    <StockRow
      item={item}
      inWatchlist={isInWatchlist(item)}
      onToggle={() => handleToggle(item)}
      c={c}
    />
  ), [isInWatchlist, handleToggle, c]);

  const keyExtractor = useCallback((item: UniverseStock) => item.id, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>주식 탐색</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            NASDAQ · KOSPI · KOSDAQ {UNIVERSE_STOCKS.length.toLocaleString()}개 종목
          </Text>
        </View>
        {addedCount > 0 && (
          <View style={[styles.addedBadge, { backgroundColor: "#0064FF" }]}>
            <Text style={styles.addedBadgeText}>+{addedCount} 추가</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: c.backgroundSecondary }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? "#1E2D3D" : "#F0F4F8" }]}>
          <Ionicons name="search" size={16} color={c.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="종목명, 티커, 섹터 검색..."
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

      {/* Market filter */}
      <View style={[styles.filterRow, { borderBottomColor: c.separator }]}>
        {MARKET_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.filterTab,
              market === t.key && [styles.filterTabActive, { borderBottomColor: c.tint }],
            ]}
            onPress={() => setMarket(t.key)}
          >
            <Text style={[
              styles.filterTabText,
              { color: market === t.key ? c.tint : c.textSecondary },
              market === t.key && { fontFamily: "Inter_700Bold" },
            ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <View style={[styles.countRow, { backgroundColor: c.background }]}>
        <Text style={[styles.countText, { color: c.textTertiary }]}>
          {results.length.toLocaleString()}개 종목
          {query.length > 0 && `  ·  "${query}" 검색결과`}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>검색 결과 없음</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle:    { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addedBadge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  addedBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  searchWrap:     { paddingHorizontal: 16, paddingVertical: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput:    { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  filterTab:       { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterTabActive: { borderBottomWidth: 2 },
  filterTabText:   { fontSize: 13, fontFamily: "Inter_500Medium" },
  countRow:        { paddingHorizontal: 20, paddingVertical: 8 },
  countText:       { fontSize: 12, fontFamily: "Inter_400Regular" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: ITEM_HEIGHT,
  },
  rowLeft:   { flex: 1, gap: 2, marginRight: 8 },
  nameRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  name:      { fontSize: 15, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  mktBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  mktText:   { fontSize: 9, fontFamily: "Inter_700Bold" },
  sub:       { fontSize: 12, fontFamily: "Inter_400Regular" },
  cap:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowRight:  { alignItems: "flex-end", gap: 6 },
  priceBlock:{ alignItems: "flex-end", gap: 1 },
  price:     { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  usd:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty:      { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyText:  { fontSize: 15, fontFamily: "Inter_500Medium" },
});
