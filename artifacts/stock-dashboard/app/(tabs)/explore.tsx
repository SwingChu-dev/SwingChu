import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWatchlist } from "@/context/WatchlistContext";
import { UniverseStock } from "@/constants/stockUniverse";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const USD_KRW  = 1450;

type Market = "ALL" | "NASDAQ" | "KOSPI" | "KOSDAQ";

interface ScreenResult {
  ticker:        string;
  market:        "NASDAQ" | "KOSPI" | "KOSDAQ";
  name:          string;
  sector:        string;
  marketCap:     string;
  livePrice:     number;
  priceKRW:      number;
  changePercent: number;
  currentPer:    number | null;
  pbr:           number;
  isUndervalued: boolean;
  score:         number;
  currency:      string;
}

const MARKET_TABS: { key: Market; label: string }[] = [
  { key: "ALL",    label: "전체"   },
  { key: "NASDAQ", label: "나스닥" },
  { key: "KOSPI",  label: "코스피" },
  { key: "KOSDAQ", label: "코스닥" },
];

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#0064FF",
  KOSPI:  "#2DB55D",
  KOSDAQ: "#FF6B35",
};

function fmtPrice(item: ScreenResult): string {
  if (item.market === "NASDAQ") {
    const usd = (item.priceKRW / USD_KRW).toFixed(2);
    return `$${usd}  (₩${item.priceKRW.toLocaleString()})`;
  }
  return `₩${item.priceKRW.toLocaleString()}`;
}

export default function ExploreScreen() {
  const [market,     setMarket]     = useState<Market>("ALL");
  const [results,    setResults]    = useState<ScreenResult[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetched,    setFetched]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const { isInWatchlist, addFromUniverse, removeStock } = useWatchlist();
  const abortRef = useRef<AbortController | null>(null);

  const fetchScreen = useCallback(async (mkt: Market, isRefresh = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${API_BASE}/stocks/screen?market=${mkt}`, { signal: ctrl.signal });
      if (!resp.ok) throw new Error(`서버 오류 ${resp.status}`);
      const data: ScreenResult[] = await resp.json();
      setResults(data);
      setFetched(true);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message ?? "네트워크 오류");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleMarket = (mkt: Market) => {
    setMarket(mkt);
    setFetched(false);
    setResults([]);
  };

  const toggleWatchlist = (item: ScreenResult) => {
    const id = `${item.ticker.toLowerCase()}_screen`;
    if (isInWatchlist(id)) {
      removeStock(id);
    } else {
      const us: UniverseStock = {
        id,
        name:         item.name,
        nameEn:       item.ticker,
        ticker:       item.ticker,
        market:       item.market,
        sector:       item.sector,
        currentPrice: item.priceKRW,
        marketCap:    item.marketCap,
      };
      addFromUniverse(us);
    }
  };

  const renderItem = ({ item, index }: { item: ScreenResult; index: number }) => {
    const id       = `${item.ticker.toLowerCase()}_screen`;
    const inWL     = isInWatchlist(id);
    const mktColor = MARKET_COLORS[item.market] ?? "#888";
    const up       = item.changePercent >= 0;
    const clrChange= up ? "#F04452" : "#1B63E8";
    const sign     = up ? "+" : "";
    const uvScore  = 100 - Math.round(item.score * 100);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.mktBadge, { backgroundColor: mktColor + "33" }]}>
                <Text style={[styles.mktBadgeText, { color: mktColor }]}>{item.market}</Text>
              </View>
            </View>
            <Text style={styles.tickerText}>{item.ticker}  ·  {item.sector}</Text>
          </View>
          <TouchableOpacity onPress={() => toggleWatchlist(item)} style={styles.wlBtn}>
            <Ionicons
              name={inWL ? "bookmark" : "bookmark-outline"}
              size={22}
              color={inWL ? "#0064FF" : "#555"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{fmtPrice(item)}</Text>
          <Text style={[styles.changeText, { color: clrChange }]}>
            {sign}{item.changePercent.toFixed(2)}%
          </Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>PER</Text>
            <Text style={styles.metricValue}>
              {item.currentPer !== null ? item.currentPer.toFixed(1) + "x" : "N/A"}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>PBR</Text>
            <Text style={styles.metricValue}>{item.pbr.toFixed(2) + "x"}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>시가총액</Text>
            <Text style={styles.metricValue}>{item.marketCap}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>저평가 점수</Text>
            <Text style={[styles.metricValue, { color: "#0064FF" }]}>{uvScore}점</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>저평가 우량주 탐색기</Text>
          <Text style={styles.headerSub}>실시간 PER·PBR 기반 스크리닝</Text>
        </View>
        <TouchableOpacity
          style={[styles.scanBtn, loading && { opacity: 0.5 }]}
          onPress={() => fetchScreen(market)}
          disabled={loading}
        >
          <Ionicons name="search" size={16} color="#fff" />
          <Text style={styles.scanBtnText}>탐색</Text>
        </TouchableOpacity>
      </View>

      {/* 시장 탭 */}
      <View style={styles.tabs}>
        {MARKET_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, market === t.key && styles.tabActive]}
            onPress={() => handleMarket(t.key)}
          >
            <Text style={[styles.tabText, market === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 기준 안내 */}
      <View style={styles.criteriaBar}>
        <Ionicons name="information-circle-outline" size={13} color="#555" />
        <Text style={styles.criteriaText}>
          나스닥 PER{"<"}25·PBR{"<"}5  |  코스피 PER{"<"}12·PBR{"<"}1.2  |  코스닥 PER{"<"}15·PBR{"<"}2.5
        </Text>
      </View>

      {/* 본문 */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0064FF" />
          <Text style={styles.loadingText}>야후 파이낸스 실시간 데이터 분석 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#F04452" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchScreen(market)}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : !fetched ? (
        <View style={styles.center}>
          <Ionicons name="analytics-outline" size={64} color="#1B63E8" />
          <Text style={styles.emptyTitle}>저평가 우량주를 탐색합니다</Text>
          <Text style={styles.emptyDesc}>
            {"\"탐색\" 버튼을 눌러\n실시간 밸류에이션 분석을 시작하세요"}
          </Text>
          <TouchableOpacity style={styles.bigScanBtn} onPress={() => fetchScreen(market)}>
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.bigScanBtnText}>지금 탐색하기</Text>
          </TouchableOpacity>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#2DB55D" />
          <Text style={styles.emptyTitle}>현재 저평가 종목 없음</Text>
          <Text style={styles.emptyDesc}>
            선택한 시장에서 기준을 충족하는{"\n"}저평가 우량주가 없습니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.ticker}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchScreen(market, true)}
              tintColor="#0064FF"
            />
          }
          ListHeaderComponent={
            <View style={styles.resultHeader}>
              <Ionicons name="trending-down-outline" size={16} color="#0064FF" />
              <Text style={styles.resultHeaderText}>
                {results.length}종목 발견 · 점수 높을수록 더 저평가
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0A0E1A" },

  header: {
    flexDirection:     "row",
    justifyContent:    "space-between",
    alignItems:        "center",
    paddingHorizontal: 20,
    paddingTop:        12,
    paddingBottom:     14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2035",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerSub:   { fontSize: 12, color: "#666", marginTop: 2 },
  scanBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    backgroundColor:   "#0064FF",
    paddingHorizontal: 16,
    paddingVertical:   9,
    borderRadius:      12,
  },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  tabs: {
    flexDirection:     "row",
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:               8,
  },
  tab: {
    flex:            1,
    paddingVertical: 8,
    borderRadius:    10,
    backgroundColor: "#141827",
    alignItems:      "center",
  },
  tabActive:     { backgroundColor: "#0064FF" },
  tabText:       { color: "#666", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  criteriaBar: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 18,
    paddingBottom:     10,
  },
  criteriaText: { fontSize: 10, color: "#555", flex: 1, lineHeight: 14 },

  center: {
    flex:              1,
    justifyContent:    "center",
    alignItems:        "center",
    paddingHorizontal: 32,
    gap:               12,
  },
  loadingText: { color: "#666", fontSize: 13, textAlign: "center", marginTop: 12 },
  errorText:   { color: "#F04452", fontSize: 14, textAlign: "center" },
  retryBtn: {
    backgroundColor:   "#F04452",
    paddingHorizontal: 24,
    paddingVertical:   10,
    borderRadius:      12,
    marginTop:         4,
  },
  retryText:  { color: "#fff", fontWeight: "700" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#fff", textAlign: "center" },
  emptyDesc:  { fontSize: 13, color: "#666", textAlign: "center", lineHeight: 20 },
  bigScanBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    backgroundColor:   "#0064FF",
    paddingHorizontal: 32,
    paddingVertical:   14,
    borderRadius:      16,
    marginTop:         8,
  },
  bigScanBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 },

  resultHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    paddingVertical: 10,
  },
  resultHeaderText: { fontSize: 13, color: "#0064FF", fontWeight: "600" },

  card: {
    backgroundColor: "#141827",
    borderRadius:    16,
    padding:         16,
    marginBottom:    10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           10,
    marginBottom:  10,
  },
  rankBadge: {
    width:           28,
    height:          28,
    borderRadius:    8,
    backgroundColor: "#0064FF22",
    alignItems:      "center",
    justifyContent:  "center",
  },
  rankText:     { color: "#0064FF", fontWeight: "700", fontSize: 13 },
  nameRow:      { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  stockName:    { fontSize: 16, fontWeight: "700", color: "#fff", flexShrink: 1 },
  mktBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  mktBadgeText: { fontSize: 11, fontWeight: "700" },
  tickerText:   { fontSize: 12, color: "#666", marginTop: 3 },
  wlBtn:        { padding: 4 },

  priceRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "baseline",
    marginBottom:   12,
  },
  priceText:  { fontSize: 16, fontWeight: "700", color: "#fff" },
  changeText: { fontSize: 14, fontWeight: "600" },

  metricsRow: {
    flexDirection:   "row",
    backgroundColor: "#0A0E1A",
    borderRadius:    10,
    padding:         10,
    alignItems:      "center",
  },
  metricBox:     { flex: 1, alignItems: "center", gap: 3 },
  metricDivider: { width: 1, height: 28, backgroundColor: "#1A2035" },
  metricLabel:   { fontSize: 10, color: "#666" },
  metricValue:   { fontSize: 13, fontWeight: "700", color: "#ccc" },
});
