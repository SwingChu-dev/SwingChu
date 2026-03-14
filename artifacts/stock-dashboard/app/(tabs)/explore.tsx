import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from "react";
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
import {
  UNIVERSE_STOCKS,
  UniverseStock,
  UniverseMarket,
  VALUATION_MAP,
  isUndervalued,
} from "@/constants/stockUniverse";
import { STOCKS, USD_KRW_RATE } from "@/constants/stockData";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

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

const ITEM_HEIGHT = 84;

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
  livePrice:  number;
  inWatchlist:boolean;
  onToggle:   () => void;
  c:          any;
  isDark:     boolean;
}

const StockRow = memo(function StockRow({ item, livePrice, inWatchlist, onToggle, c, isDark }: RowProps) {
  const mc  = MARKET_COLORS[item.market] || "#888";
  const val = VALUATION_MAP[item.ticker] ?? VALUATION_MAP[item.id];
  const uv  = isUndervalued(item);
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderBottomColor: c.separator }]}>
      <View style={styles.rowLeft}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.mktBadge, { backgroundColor: mc + "20" }]}>
            <Text style={[styles.mktText, { color: mc }]}>{item.market}</Text>
          </View>
          {uv && (
            <View style={styles.uvBadge}>
              <Text style={styles.uvText}>저평가</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sub, { color: c.textTertiary }]}>
          {item.ticker} · {item.sector}
        </Text>
        <View style={styles.valRow}>
          {val ? (
            <>
              <Text style={[styles.valLabel, { color: c.textTertiary }]}>
                PER {val.per !== null ? val.per.toFixed(0) : "—"}
              </Text>
              <Text style={[styles.valDot, { color: c.separator }]}>·</Text>
              <Text style={[styles.valLabel, { color: c.textTertiary }]}>
                PBR {val.pbr.toFixed(2)}
              </Text>
            </>
          ) : (
            <Text style={[styles.valLabel, { color: c.textTertiary }]}>밸류에이션 정보 없음</Text>
          )}
        </View>
      </View>

      <View style={styles.rowRight}>
        <View style={styles.priceBlock}>
          <Text style={[styles.price, { color: c.text }]}>{formatPrice(livePrice, item.market)}</Text>
          {item.market === "NASDAQ" && livePrice > 0 && (
            <Text style={[styles.usd, { color: c.textTertiary }]}>
              ${(livePrice / USD_KRW_RATE).toFixed(2)}
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
  prev.livePrice   === next.livePrice   &&
  prev.item.id     === next.item.id     &&
  prev.isDark      === next.isDark
);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const isDark = useColorScheme() === "dark";
  const c      = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { watchlistIds, removeStock, addFromUniverse } = useWatchlist();

  const [query,      setQuery]      = useState("");
  const [market,     setMarket]     = useState<MarketFilter>("ALL");
  const [uvOnly,     setUvOnly]     = useState(false);   // 저평가 필터
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 종목 필터링
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UNIVERSE_STOCKS.filter((s) => {
      const mOk = market === "ALL" || s.market === market;
      const uOk = !uvOnly || isUndervalued(s);
      if (!mOk || !uOk) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q)   ||
        s.nameEn.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    });
  }, [query, market, uvOnly]);

  // 실시간 가격 batch-fetch: 검색/필터 결과가 100개 이하일 때 최대 30개 fetch
  // 전체 421개 기본뷰는 너무 많아 생략, 검색·필터 시에만 동작
  const batchKey = useMemo(() => {
    if (results.length > 100) return ""; // 기본뷰는 스킵
    return results.slice(0, 30).map((s) => `${s.ticker}:${s.market}`).join(",");
  }, [results]);

  useEffect(() => {
    if (!batchKey) return;
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    // 검색어 타이핑 중에 너무 잦은 요청을 막기 위해 300ms debounce
    fetchTimer.current = setTimeout(async () => {
      try {
        const res = await globalThis.fetch(
          `${API_BASE}/stocks/quotes?items=${encodeURIComponent(batchKey)}`
        );
        if (!res.ok) return;
        const data: any[] = await res.json();
        setLivePrices((prev) => {
          const next = { ...prev };
          data.forEach((q) => {
            if (q.ok && q.priceKRW) next[`${q.ticker}:${q.market}`] = q.priceKRW;
          });
          return next;
        });
      } catch {}
    }, 300);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [batchKey]);

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

  // 저평가 종목 총 개수 (탭·검색 무관)
  const uvTotal = useMemo(
    () => UNIVERSE_STOCKS.filter((s) => (market === "ALL" || s.market === market) && isUndervalued(s)).length,
    [market]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    []
  );

  const renderItem = useCallback(({ item }: { item: UniverseStock }) => {
    const livePrice = livePrices[`${item.ticker}:${item.market}`] ?? item.currentPrice;
    return (
      <StockRow
        item={item}
        livePrice={livePrice}
        inWatchlist={isInWatchlist(item)}
        onToggle={() => handleToggle(item)}
        c={c}
        isDark={isDark}
      />
    );
  }, [livePrices, isInWatchlist, handleToggle, c, isDark]);

  const keyExtractor = useCallback((item: UniverseStock) => item.id, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>주식 탐색</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            {UNIVERSE_STOCKS.length.toLocaleString()}개 종목 · PER/PBR 분석 포함
          </Text>
        </View>
      </View>

      {/* ─── Search ─── */}
      <View style={[styles.searchWrap, { backgroundColor: c.background }]}>
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

      {/* ─── Market filter + 저평가 버튼 ─── */}
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
            ]}>{t.label}</Text>
          </TouchableOpacity>
        ))}

        {/* 저평가 토글 버튼 */}
        <TouchableOpacity
          style={[
            styles.uvBtn,
            uvOnly
              ? { backgroundColor: "#0064FF", borderColor: "#0064FF" }
              : { backgroundColor: "transparent", borderColor: isDark ? "#334155" : "#CBD5E1" },
          ]}
          onPress={() => setUvOnly((v) => !v)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={uvOnly ? "diamond" : "diamond-outline"}
            size={11}
            color={uvOnly ? "#fff" : c.textSecondary}
          />
          <Text style={[styles.uvBtnText, { color: uvOnly ? "#fff" : c.textSecondary }]}>
            저평가
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── Count row ─── */}
      <View style={[styles.countRow, { backgroundColor: c.background }]}>
        <Text style={[styles.countText, { color: c.textTertiary }]}>
          {results.length.toLocaleString()}개
          {uvOnly && ` · 저평가 ${uvTotal}개 (전체 기준)`}
          {query.length > 0 && `  "검색: ${query}"`}
        </Text>
        {uvOnly && (
          <Text style={[styles.uvCriteria, { color: c.textTertiary }]}>
            NASDAQ PER{"<"}18·PBR{"<"}3  /  KOSPI PER{"<"}12·PBR{"<"}1.2  /  KOSDAQ PER{"<"}15·PBR{"<"}2
          </Text>
        )}
      </View>

      {/* ─── List ─── */}
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
            <Ionicons name={uvOnly ? "diamond-outline" : "search-outline"} size={40} color={c.textTertiary} />
            <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>
              {uvOnly ? "저평가 종목 없음" : "검색 결과 없음"}
            </Text>
            {uvOnly && (
              <Text style={[styles.emptyDesc, { color: c.textTertiary }]}>
                현재 시장 기준에서 저평가로 분류되는{"\n"}종목이 없습니다
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle:    { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
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
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  filterTab:       { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterTabActive: { borderBottomWidth: 2 },
  filterTabText:   { fontSize: 13, fontFamily: "Inter_500Medium" },
  // 저평가 버튼
  uvBtn: {
    marginLeft: "auto",
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  uvBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  // count row
  countRow:      { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  countText:     { fontSize: 12, fontFamily: "Inter_400Regular" },
  uvCriteria:    { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  // row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: ITEM_HEIGHT,
  },
  rowLeft:   { flex: 1, gap: 2, marginRight: 8 },
  nameRow:   { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "nowrap" },
  name:      { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  mktBadge:  { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, flexShrink: 0 },
  mktText:   { fontSize: 9, fontFamily: "Inter_700Bold" },
  uvBadge:   { backgroundColor: "#0064FF18", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0 },
  uvText:    { fontSize: 9, fontFamily: "Inter_700Bold", color: "#0064FF" },
  sub:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  valRow:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  valLabel:  { fontSize: 11, fontFamily: "Inter_500Medium" },
  valDot:    { fontSize: 11 },
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
  empty:      { alignItems: "center", paddingVertical: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc:  { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
