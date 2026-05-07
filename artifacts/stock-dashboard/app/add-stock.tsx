import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { STOCKS } from "@/constants/stockData";
import { useWatchlist } from "@/context/WatchlistContext";
import { searchStocks, type SearchHit } from "@/services/stockSearch";
import { buildCustomStockStub } from "@/utils/customStock";
import { aliasLookup, aliasPrefixMatches } from "@/constants/koreanAliases";

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

export default function AddStockSheet() {
  const isDark  = useColorScheme() === "dark";
  const c       = isDark ? Colors.dark : Colors.light;
  const insets  = useSafeAreaInsets();
  const { addStock, addCustomStock, removeStock, isInWatchlist, customStocks } = useWatchlist();
  const [query, setQuery] = useState("");
  const [yahooHits, setYahooHits]       = useState<SearchHit[]>([]);
  const [searching,  setSearching]      = useState(false);

  const allLocal = useMemo(() => [...STOCKS, ...customStocks], [customStocks]);
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    // 한글 입력이면 alias로 영문 티커도 매칭 키로 사용
    const aliasTickers = aliasPrefixMatches(query)
      .map((m) => m.ticker.toLowerCase());
    const matches = (s: StockItem) =>
      !q ||
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.themes?.some((t) => t.toLowerCase().includes(q)) ||
      aliasTickers.includes(s.ticker.toLowerCase());
    return [
      { market: "NASDAQ", data: allLocal.filter((s) => s.market === "NASDAQ" && matches(s)) },
      { market: "KOSPI",  data: allLocal.filter((s) => s.market === "KOSPI"  && matches(s)) },
      { market: "KOSDAQ", data: allLocal.filter((s) => s.market === "KOSDAQ" && matches(s)) },
    ].filter((sec) => sec.data.length > 0);
  }, [query, allLocal]);

  // Yahoo 검색 (300ms debounce, 쿼리 2자 이상 + 로컬 결과 적을 때만)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setYahooHits([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const hits = await searchStocks(q);
        // 이미 카탈로그/커스텀에 있는 ticker는 노이즈라 제거
        const known = new Set(allLocal.map((s) => `${s.ticker}:${s.market}`));
        setYahooHits(hits.filter((h) => !known.has(`${h.ticker}:${h.market}`)));
      } catch {
        setYahooHits([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { clearTimeout(t); setSearching(false); };
  }, [query, allLocal]);

  const handleAddYahoo = (hit: SearchHit) => {
    if (hit.market === "OTHER") return;
    const stub = buildCustomStockStub({
      ticker:   hit.ticker,
      name:     hit.name,
      market:   hit.market,
      currency: hit.currency,
    });
    addCustomStock(stub);
  };

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

      {/* 검색바 */}
      <View style={[styles.searchWrap, { backgroundColor: c.backgroundSecondary, borderColor: c.separator }]}>
        <Ionicons name="search" size={16} color={c.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder="엔비디아 · 삼성전자 · 005930 · TSLA · AI"
          placeholderTextColor={c.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={c.textTertiary} />
          </TouchableOpacity>
        )}
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
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyLocal}>
            <Text style={[styles.emptyDesc, { color: c.textTertiary }]}>
              카탈로그에 없는 종목은 아래 Yahoo 검색 결과에서 추가하세요.
            </Text>
          </View>
        }
        ListFooterComponent={
          query.trim().length >= 2 ? (
            <View style={styles.yahooSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe-outline" size={12} color={c.textSecondary} />
                <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>YAHOO 검색</Text>
                {searching && <ActivityIndicator size="small" color={c.textTertiary} />}
              </View>
              {!searching && yahooHits.length === 0 && (
                <Text style={[styles.emptyDesc, { color: c.textTertiary, padding: 8 }]}>
                  외부 검색 결과 없음.
                </Text>
              )}
              {yahooHits.map((hit) => (
                <View key={`${hit.ticker}:${hit.market}`} style={[styles.rowWrap, { backgroundColor: c.backgroundSecondary }]}>
                  <View style={styles.row}>
                    <View style={styles.left}>
                      <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{hit.name}</Text>
                      <Text style={[styles.ticker, { color: c.textTertiary }]}>
                        {hit.ticker} · {hit.market} · {hit.currency}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: c.tint + "15", borderColor: c.tint + "35" }]}
                      onPress={() => handleAddYahoo(hit)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add" size={15} color={c.tint} />
                      <Text style={[styles.btnText, { color: c.tint }]}>추가</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
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

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },

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

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyDesc:  { fontSize: 12, lineHeight: 18, textAlign: "center" },
  emptyLocal: { padding: 16, alignItems: "center" },
  yahooSection: { marginTop: 16, gap: 4 },
});
