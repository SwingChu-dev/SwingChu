import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import {
  UNIVERSE_STOCKS,
  UniverseStock,
  UniverseMarket,
  PREDEFINED_IDS,
} from "@/constants/stockUniverse";
import { STOCKS, USD_KRW_RATE } from "@/constants/stockData";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

type MarketFilter = "ALL" | UniverseMarket | "NYSE";

const MARKET_TABS: { key: MarketFilter; label: string }[] = [
  { key: "ALL",    label: "전체" },
  { key: "NASDAQ", label: "NASDAQ" },
  { key: "NYSE",   label: "NYSE" },
  { key: "KOSPI",  label: "KOSPI" },
  { key: "KOSDAQ", label: "KOSDAQ" },
];

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#3B82F6",
  NYSE:   "#10B981",
  KOSPI:  "#8B5CF6",
  KOSDAQ: "#F59E0B",
};

export interface DisplayStock {
  id:           string;
  name:         string;
  nameEn:       string;
  ticker:       string;
  yahooTicker?: string;
  market:       string;
  sector:       string;
  currentPrice: number;
  marketCap:    string;
  isLive?:      boolean;
}

function formatPrice(p: number, market: string) {
  if (p === 0) return "—";
  if (market === "KOSPI" || market === "KOSDAQ") {
    if (p >= 1000000) return `₩${(p / 1000000).toFixed(1)}M`;
    if (p >= 10000)   return `₩${Math.round(p / 10000)}만`;
    return `₩${p.toLocaleString()}`;
  }
  return `₩${Math.round(p).toLocaleString()}`;
}

function StockRow({
  item,
  inWatchlist,
  onToggle,
  c,
}: {
  item: DisplayStock;
  inWatchlist: boolean;
  onToggle: () => void;
  c: any;
}) {
  const mc = MARKET_COLORS[item.market] || "#888";
  const isUSD = item.market === "NASDAQ" || item.market === "NYSE";

  return (
    <View style={[styles.row, { backgroundColor: c.card, borderBottomColor: c.separator }]}>
      <View style={styles.rowLeft}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.mktBadge, { backgroundColor: mc + "20" }]}>
            <Text style={[styles.mktText, { color: mc }]}>{item.market}</Text>
          </View>
          {item.isLive && (
            <View style={styles.livePill}>
              <Text style={styles.liveText}>야후</Text>
            </View>
          )}
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
          <Ionicons
            name={inWatchlist ? "checkmark" : "add"}
            size={16}
            color={inWatchlist ? "#F04452" : "#0064FF"}
          />
          <Text style={[styles.toggleText, { color: inWatchlist ? "#F04452" : "#0064FF" }]}>
            {inWatchlist ? "추가됨" : "추가"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function universeToDisplay(s: UniverseStock): DisplayStock {
  return { ...s };
}

function yahooToDisplay(r: {
  ticker: string; yahooTicker: string; name: string; market: string; exchange: string;
}): DisplayStock {
  return {
    id:           `yahoo_${r.yahooTicker}`,
    name:         r.name,
    nameEn:       r.name,
    ticker:       r.ticker,
    yahooTicker:  r.yahooTicker,
    market:       r.market,
    sector:       r.exchange,
    currentPrice: 0,
    marketCap:    "-",
    isLive:       true,
  };
}

export default function ExploreScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { watchlistIds, removeStock, addFromUniverse } = useWatchlist();

  const [query,       setQuery]       = useState("");
  const [market,      setMarket]      = useState<MarketFilter>("ALL");
  const [liveResults, setLiveResults] = useState<DisplayStock[] | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setLiveResults(null);
      setLiveLoading(false);
      return;
    }
    setLiveLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const mktParam = market === "ALL" ? "ALL" : market;
        const res = await fetch(
          `${API_BASE}/stocks/search?q=${encodeURIComponent(q)}&market=${mktParam}`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setLiveResults(data.map(yahooToDisplay));
        }
      } catch {
        setLiveResults(null);
      } finally {
        setLiveLoading(false);
      }
    }, 450);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, market]);

  const localResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UNIVERSE_STOCKS.filter((s) => {
      const marketMatch = market === "ALL" || s.market === market;
      if (!q) return marketMatch;
      return marketMatch && (
        s.name.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      );
    }).map(universeToDisplay);
  }, [query, market]);

  const results: DisplayStock[] = useMemo(() => {
    if (query.trim().length >= 2) {
      return liveResults ?? localResults;
    }
    return localResults;
  }, [query, liveResults, localResults]);

  const isShowingLive = query.trim().length >= 2 && liveResults !== null;

  const isInWatchlist = useCallback((item: DisplayStock) => {
    const predefined = STOCKS.find((s) => s.ticker === item.ticker);
    if (predefined) return watchlistIds.includes(predefined.id);
    return watchlistIds.includes(item.id);
  }, [watchlistIds]);

  const handleToggle = useCallback((item: DisplayStock) => {
    const predefined = STOCKS.find((s) => s.ticker === item.ticker);
    const targetId   = predefined ? predefined.id : item.id;
    if (watchlistIds.includes(targetId)) {
      removeStock(targetId);
    } else {
      const asUniverse: UniverseStock = {
        id:           item.id,
        name:         item.name,
        nameEn:       item.nameEn,
        ticker:       item.ticker,
        market:       (item.market === "NYSE" ? "NASDAQ" : item.market) as UniverseMarket,
        sector:       item.sector,
        currentPrice: item.currentPrice,
        marketCap:    item.marketCap,
      };
      addFromUniverse(asUniverse);
    }
  }, [watchlistIds, removeStock, addFromUniverse]);

  const addedCount = useMemo(
    () => results.filter((s) => isInWatchlist(s)).length,
    [results, isInWatchlist]
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>주식 탐색</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            야후 파이낸스 실시간 · 전 세계 종목
          </Text>
        </View>
        {addedCount > 0 && (
          <View style={[styles.addedBadge, { backgroundColor: "#0064FF" }]}>
            <Text style={styles.addedBadgeText}>+{addedCount} 추가</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: c.backgroundSecondary }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? "#1E2D3D" : "#F0F4F8" }]}>
          {liveLoading
            ? <ActivityIndicator size="small" color="#0064FF" />
            : <Ionicons name="search" size={16} color={c.textTertiary} />
          }
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="영문명·티커 검색 (2자↑ 실시간·한국주는 종목코드)"
            placeholderTextColor={c.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setLiveResults(null); }}>
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
            <Text
              style={[
                styles.filterTabText,
                { color: market === t.key ? c.tint : c.textSecondary },
                market === t.key && { fontFamily: "Inter_700Bold" },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count + source label */}
      <View style={[styles.countRow, { backgroundColor: c.background }]}>
        <Text style={[styles.countText, { color: c.textTertiary }]}>
          {results.length.toLocaleString()}개 종목
        </Text>
        {isShowingLive && (
          <View style={styles.liveSourcePill}>
            <View style={styles.liveSourceDot} />
            <Text style={styles.liveSourceText}>야후 파이낸스 실시간</Text>
          </View>
        )}
        {!isShowingLive && query.trim().length === 0 && (
          <Text style={[styles.hintText, { color: c.textTertiary }]}>
            2자 이상 입력 시 전 세계 실시간 검색
          </Text>
        )}
      </View>

      {/* List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StockRow
            item={item}
            inWatchlist={isInWatchlist(item)}
            onToggle={() => handleToggle(item)}
            c={c}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          liveLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#0064FF" />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>검색 중...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={c.textTertiary} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>검색 결과 없음</Text>
            </View>
          )
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
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  addedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  hintText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  liveSourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0064FF14",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  liveSourceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#0064FF",
  },
  liveSourceText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#0064FF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  mktBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  mktText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  livePill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#0064FF22",
  },
  liveText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#0064FF",
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  cap: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  priceBlock: {
    alignItems: "flex-end",
    gap: 1,
  },
  price: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  usd: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
