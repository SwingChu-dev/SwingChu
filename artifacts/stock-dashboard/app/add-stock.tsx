import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { STOCKS, USD_KRW_RATE } from "@/constants/stockData";
import { useWatchlist } from "@/context/WatchlistContext";
import { UniverseStock } from "@/constants/stockUniverse";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#0064FF",
  KOSPI:  "#2DB55D",
  KOSDAQ: "#FF6B35",
  NYSE:   "#8B5CF6",
};

interface SearchResult {
  ticker:      string;
  yahooTicker: string;
  name:        string;
  market:      string;
  exchange:    string;
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function AddStockSheet() {
  const isDark = useColorScheme() === "dark";
  const c      = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { addStock, removeStock, addFromUniverse, isInWatchlist } = useWatchlist();

  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const debounced = useDebounce(query, 350);
  const abortRef  = useRef<AbortController | null>(null);

  // 검색어 없으면 기본 13종목 표시
  const predefinedResults: SearchResult[] = STOCKS.map((s) => ({
    ticker:      s.ticker,
    yahooTicker: s.ticker,
    name:        s.name,
    market:      s.market,
    exchange:    s.market,
  }));

  const search = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setSearched(true);
    try {
      const resp = await fetch(
        `${API_BASE}/stocks/search?q=${encodeURIComponent(q)}&market=ALL`,
        { signal: ctrl.signal }
      );
      if (!resp.ok) throw new Error();
      const data: SearchResult[] = await resp.json();
      setResults(data.slice(0, 30));
    } catch (e: any) {
      if (e?.name !== "AbortError") setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounced.trim().length < 1) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    search(debounced.trim());
  }, [debounced, search]);

  const displayList: SearchResult[] = query.trim().length < 1 ? predefinedResults : results;

  const handleToggle = (item: SearchResult) => {
    // 기본 13종목이면 id로 직접 토글
    const predefined = STOCKS.find(
      (s) => s.ticker.toLowerCase() === item.ticker.toLowerCase()
    );
    if (predefined) {
      if (isInWatchlist(predefined.id)) removeStock(predefined.id);
      else addStock(predefined.id);
      return;
    }
    // 검색 결과 종목 — UniverseStock stub으로 추가
    const id = `${item.ticker.toLowerCase()}_search`;
    if (isInWatchlist(id)) {
      removeStock(id);
    } else {
      const us: UniverseStock = {
        id,
        name:         item.name,
        nameEn:       item.ticker,
        ticker:       item.ticker,
        market:       (item.market === "KOSPI" || item.market === "KOSDAQ" ? item.market : "NASDAQ") as any,
        sector:       item.exchange,
        currentPrice: 0,
        marketCap:    "-",
      };
      addFromUniverse(us);
    }
  };

  const isItemInWL = (item: SearchResult) => {
    const predefined = STOCKS.find(
      (s) => s.ticker.toLowerCase() === item.ticker.toLowerCase()
    );
    if (predefined) return isInWatchlist(predefined.id);
    return isInWatchlist(`${item.ticker.toLowerCase()}_search`);
  };

  const renderItem = ({ item, index }: { item: SearchResult; index: number }) => {
    const inList     = isItemInWL(item);
    const mktColor   = MARKET_COLORS[item.market] || "#888";
    const isLast     = index === displayList.length - 1;

    return (
      <View>
        <View style={styles.row}>
          <View style={styles.stockInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.stockName, { color: c.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.marketBadge, { backgroundColor: mktColor + "22" }]}>
                <Text style={[styles.marketText, { color: mktColor }]}>{item.market}</Text>
              </View>
            </View>
            <Text style={[styles.ticker, { color: c.textTertiary }]}>
              {item.ticker}
              {item.exchange && item.exchange !== item.market ? `  ·  ${item.exchange}` : ""}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              inList
                ? { backgroundColor: c.negative + "18", borderColor: c.negative + "40" }
                : { backgroundColor: c.tint + "18", borderColor: c.tint + "40" },
            ]}
            onPress={() => handleToggle(item)}
          >
            <Ionicons name={inList ? "remove" : "add"} size={18} color={inList ? c.negative : c.tint} />
            <Text style={[styles.toggleText, { color: inList ? c.negative : c.tint }]}>
              {inList ? "삭제" : "추가"}
            </Text>
          </TouchableOpacity>
        </View>
        {!isLast && <View style={[styles.separator, { backgroundColor: c.separator }]} />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <Text style={[styles.title, { color: c.text }]}>종목 추가</Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: c.tint }]}
          onPress={() => router.back()}
        >
          <Text style={styles.doneBtnText}>완료</Text>
        </TouchableOpacity>
      </View>

      {/* 검색창 */}
      <View style={[styles.searchWrap, { backgroundColor: c.backgroundSecondary }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? "#1E2D3D" : "#F0F4F8" }]}>
          {loading
            ? <ActivityIndicator size="small" color={c.tint} />
            : <Ionicons name="search" size={16} color={c.textTertiary} />
          }
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="종목명, 티커 검색 (예: 삼성전자, NVDA)"
            placeholderTextColor={c.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="characters"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={c.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 목록 */}
      <FlatList
        data={displayList}
        keyExtractor={(item) => item.ticker + item.market}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
            {query.trim().length < 1
              ? `기본 종목 (${predefinedResults.length}개)`
              : searched && !loading
                ? `검색 결과 (${results.length}개)`
                : ""}
          </Text>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={36} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                {searched ? "검색 결과가 없습니다" : "종목명 또는 티커를 입력하세요"}
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={null}
        style={{ flex: 1 }}
      >
      </FlatList>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 20,
    paddingTop:        20,
    paddingBottom:     14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title:       { fontSize: 18, fontFamily: "Inter_700Bold" },
  doneBtn:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  doneBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderRadius:      12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  list:         { paddingHorizontal: 16, paddingTop: 4 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 10, paddingLeft: 4 },

  row: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   14,
    backgroundColor:   "transparent",
  },
  stockInfo: { flex: 1, gap: 3 },
  nameRow:   { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  stockName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  marketBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  marketText:  { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  ticker:      { fontSize: 12, fontFamily: "Inter_400Regular" },

  toggleBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      20,
    borderWidth:       1,
  },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  separator:  { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  emptyWrap:  { padding: 48, alignItems: "center", gap: 12 },
  emptyText:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
