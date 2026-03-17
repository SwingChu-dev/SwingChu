import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { STOCKS, StockInfo } from "@/constants/stockData";
import { useWatchlist } from "@/context/WatchlistContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { buildEnrichedStock, StockDetail } from "@/utils/enrichStub";
import { calcBoxPosition } from "@/utils/boxPosition";

type SortKey = "name" | "eval" | "forecast" | "box";

const EVAL_ORDER = ["강한 저평가", "저평가", "적정", "거품", "심각한 거품"];
const EVAL_COLORS: Record<string, string> = {
  "심각한 거품": "#FF3B3B",
  "거품":        "#FF6B35",
  "적정":        "#F59E0B",
  "저평가":      "#00C896",
  "강한 저평가": "#3B82F6",
};

import { API_BASE } from "@/utils/apiBase";

async function fetchDetail(ticker: string, market: string): Promise<StockDetail | null> {
  try {
    const res = await globalThis.fetch(
      `${API_BASE}/stocks/detail?ticker=${encodeURIComponent(ticker)}&market=${market}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function AnalysisScreen() {
  const isDark  = useColorScheme() === "dark";
  const c       = isDark ? Colors.dark : Colors.light;
  const insets  = useSafeAreaInsets();
  const [sortKey, setSortKey] = useState<SortKey>("eval");

  const { watchlistStocks } = useWatchlist();
  const { getQuote }        = useStockPrice();

  // Stub stocks not in predefined 13
  const stubStocks = useMemo(
    () => watchlistStocks.filter((s) => !STOCKS.find((p) => p.id === s.id)),
    [watchlistStocks]
  );

  const [enrichedMap, setEnrichedMap] = useState<Record<string, StockInfo>>({});
  const [loadingIds,  setLoadingIds]  = useState<Set<string>>(new Set());
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchAll = useCallback(async (stubs: StockInfo[]) => {
    if (stubs.length === 0) return;
    setLoadingIds(new Set(stubs.map((s) => s.id)));
    const results = await Promise.all(
      stubs.map(async (s) => {
        const detail = await fetchDetail(s.ticker, s.market);
        if (!detail) return null;
        const quote    = getQuote(s.ticker, s.market);
        const enriched = buildEnrichedStock(s, detail, quote);
        return { id: s.id, enriched };
      })
    );
    setEnrichedMap((prev) => {
      const next = { ...prev };
      results.forEach((r) => {
        if (r) next[r.id] = r.enriched;
      });
      return next;
    });
    setLoadingIds(new Set());
  }, [getQuote]);

  // Fetch on mount and when stub list changes
  useEffect(() => {
    const missing = stubStocks.filter((s) => !enrichedMap[s.id]);
    if (missing.length > 0) fetchAll(missing);
  }, [stubStocks.map((s) => s.id).join(",")]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll(stubStocks);
    setRefreshing(false);
  }, [stubStocks, fetchAll]);

  // Merge predefined + enriched stubs (fallback to raw stub if not loaded yet)
  const allStocks: StockInfo[] = useMemo(() => {
    const predefined = watchlistStocks
      .filter((s) => STOCKS.find((p) => p.id === s.id))
      .map((s) => STOCKS.find((p) => p.id === s.id)!);

    const stubs = stubStocks.map((s) => enrichedMap[s.id] || s);
    return [...predefined, ...stubs];
  }, [watchlistStocks, stubStocks, enrichedMap]);

  const SORT_BTNS: { key: SortKey; label: string }[] = [
    { key: "eval",     label: "재무 평가순" },
    { key: "forecast", label: "상승 전망순" },
    { key: "box",      label: "저점 우선" },
    { key: "name",     label: "이름순" },
  ];

  const sortedStocks = useMemo(() => {
    return [...allStocks].sort((a, b) => {
      if (sortKey === "eval") {
        return (
          EVAL_ORDER.indexOf(a.financials.evaluation) -
          EVAL_ORDER.indexOf(b.financials.evaluation)
        );
      }
      if (sortKey === "forecast") {
        const aF = a.forecasts[a.forecasts.length - 1]?.changePercent ?? 0;
        const bF = b.forecasts[b.forecasts.length - 1]?.changePercent ?? 0;
        return bF - aF;
      }
      if (sortKey === "box") {
        const ORDER = { 저점권: 0, 중간권: 1, 고점권: 2 };
        const qa = getQuote(a.ticker, a.market);
        const qb = getQuote(b.ticker, b.market);
        const posA = calcBoxPosition(a.boxRange, qa);
        const posB = calcBoxPosition(b.boxRange, qb);
        return ORDER[posA] - ORDER[posB];
      }
      return a.name.localeCompare(b.name, "ko");
    });
  }, [allStocks, sortKey, getQuote]);

  // 재무 분포
  const evalCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allStocks.forEach((s) => {
      const ev = s.financials.evaluation;
      map[ev] = (map[ev] || 0) + 1;
    });
    return map;
  }, [allStocks]);

  // 테마별 분류
  const themes = useMemo(() => {
    const map: Record<string, string[]> = {};
    allStocks.forEach((s) => {
      s.themes.forEach((t) => {
        const key = t.split("/")[0];
        if (!map[key]) map[key] = [];
        if (!map[key].includes(s.name)) map[key].push(s.name);
      });
    });
    return map;
  }, [allStocks]);

  const stubCount    = stubStocks.length;
  const loadingCount = loadingIds.size;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>시장 분석</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            전체 포트폴리오 분석 리포트
            {stubCount > 0 && ` · 탐색 ${stubCount}종목 포함`}
          </Text>
        </View>
        {loadingCount > 0 && (
          <View style={[styles.loadingBadge, { backgroundColor: c.tint + "18" }]}>
            <ActivityIndicator size="small" color={c.tint} />
            <Text style={[styles.loadingBadgeText, { color: c.tint }]}>
              {loadingCount}종목 재무 로딩
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.tint}
          />
        }
      >
        {/* 재무 분포 */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>
            재무 분포 ({allStocks.length}종목)
          </Text>
          <View style={styles.evalGrid}>
            {EVAL_ORDER.map((ev) => {
              const count = evalCounts[ev] ?? 0;
              if (count === 0) return null;
              const evColor = EVAL_COLORS[ev];
              return (
                <View key={ev} style={[styles.evalItem, { backgroundColor: evColor + "18" }]}>
                  <Text style={[styles.evalCount, { color: evColor }]}>{count}</Text>
                  <Text style={[styles.evalLabel, { color: evColor }]}>{ev}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 테마별 분류 */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>테마별 분류</Text>
          {Object.entries(themes)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 10)
            .map(([theme, stocks]) => (
              <View key={theme} style={styles.themeRow}>
                <View style={styles.themeLeft}>
                  <View
                    style={[
                      styles.themeBar,
                      { backgroundColor: c.tint, width: Math.max(stocks.length * 18, 4) },
                    ]}
                  />
                  <Text style={[styles.themeName, { color: c.text }]} numberOfLines={1}>
                    {theme}
                  </Text>
                </View>
                <View style={styles.themeStocks}>
                  {stocks.map((s) => (
                    <View
                      key={s}
                      style={[styles.stockTag, { backgroundColor: c.backgroundTertiary }]}
                    >
                      <Text style={[styles.stockTagText, { color: c.textSecondary }]}>
                        {s.length > 5 ? s.slice(0, 5) + ".." : s}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
        </View>

        {/* 종목별 분석표 */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: c.text }]}>종목별 분석표</Text>
          </View>

          {/* 정렬 버튼 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.sortRow}>
              {SORT_BTNS.map((btn) => (
                <TouchableOpacity
                  key={btn.key}
                  style={[
                    styles.sortBtn,
                    {
                      backgroundColor:
                        sortKey === btn.key ? c.tint + "22" : c.backgroundTertiary,
                    },
                  ]}
                  onPress={() => setSortKey(btn.key)}
                >
                  <Text
                    style={[
                      styles.sortBtnText,
                      { color: sortKey === btn.key ? c.tint : c.textSecondary },
                    ]}
                  >
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* 테이블 헤더 */}
          <View style={[styles.tableHeader, { borderBottomColor: c.separator }]}>
            <Text style={[styles.th, { color: c.textTertiary, flex: 2.2 }]}>종목</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 1 }]}>재무</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 1 }]}>박스권</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 1 }]}>1년</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 0.8 }]}>진입</Text>
          </View>

          {sortedStocks.map((stock, i) => {
            const isStub       = !STOCKS.find((p) => p.id === stock.id);
            const isLoading    = isStub && loadingIds.has(stock.id);
            const evalColor    = EVAL_COLORS[stock.financials.evaluation] || "#888";
            const quote        = getQuote(stock.ticker, stock.market);
            const dynPos       = calcBoxPosition(stock.boxRange, quote);
            const boxColor     =
              dynPos === "저점권" ? c.positive :
              dynPos === "고점권" ? c.negative  : c.warning;
            const forecast1y   = stock.forecasts[stock.forecasts.length - 2]; // "360일"
            const isForecastPos = (forecast1y?.changePercent ?? 0) >= 0;

            return (
              <TouchableOpacity
                key={stock.id}
                onPress={() =>
                  router.push({ pathname: "/stock/[id]", params: { id: stock.id } })
                }
                style={[
                  styles.tableRow,
                  {
                    borderBottomColor: c.separator,
                    borderBottomWidth: i < sortedStocks.length - 1 ? 1 : 0,
                    backgroundColor:
                      i % 2 === 0 ? "transparent" : c.backgroundTertiary + "40",
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={{ flex: 2.2 }}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.td,
                        { color: c.text, fontFamily: "Inter_600SemiBold" },
                      ]}
                      numberOfLines={1}
                    >
                      {stock.name}
                    </Text>
                    {isStub && (
                      <View
                        style={[
                          styles.stubBadge,
                          { backgroundColor: c.tint + "20" },
                        ]}
                      >
                        <Text style={[styles.stubBadgeText, { color: c.tint }]}>탐색</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.tdSub, { color: c.textTertiary }]}>
                    {stock.ticker} · {stock.market}
                  </Text>
                </View>

                {isLoading ? (
                  <View style={{ flex: 3, flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator size="small" color={c.tint} />
                  </View>
                ) : (
                  <>
                    <View style={[styles.evalCell, { flex: 1 }]}>
                      <Text
                        style={[
                          styles.tdBadge,
                          { color: evalColor, backgroundColor: evalColor + "18" },
                        ]}
                        numberOfLines={1}
                      >
                        {stock.financials.evaluation
                          .replace("강한 ", "★")
                          .replace("심각한 ", "‼")}
                      </Text>
                    </View>
                    <Text style={[styles.td, { color: boxColor, flex: 1 }]}>
                      {dynPos}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        {
                          color: isForecastPos ? c.positive : c.negative,
                          flex: 1,
                        },
                      ]}
                    >
                      {isForecastPos ? "+" : ""}
                      {(forecast1y?.changePercent ?? 0).toFixed(0)}%
                    </Text>
                    <Text style={[styles.td, { color: c.tint, flex: 0.8 }]}>
                      -{stock.splitEntries[0]?.dropPercent ?? 5}%
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 범례 */}
        <View style={[styles.legendCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.legendTitle, { color: c.textSecondary }]}>표 설명</Text>
          <View style={styles.legendRow}>
            <Ionicons name="analytics-outline" size={13} color={c.textTertiary} />
            <Text style={[styles.legendText, { color: c.textTertiary }]}>
              재무 — PER/PBR 기반 저평가·거품 판정
            </Text>
          </View>
          <View style={styles.legendRow}>
            <Ionicons name="bar-chart-outline" size={13} color={c.textTertiary} />
            <Text style={[styles.legendText, { color: c.textTertiary }]}>
              박스권 — 52주 고/저가 대비 현재 위치
            </Text>
          </View>
          <View style={styles.legendRow}>
            <Ionicons name="trending-up-outline" size={13} color={c.textTertiary} />
            <Text style={[styles.legendText, { color: c.textTertiary }]}>
              1년 — 애널리스트 목표가 기반 1년 기대 수익률
            </Text>
          </View>
          <View style={styles.legendRow}>
            <Ionicons name="layers-outline" size={13} color={c.textTertiary} />
            <Text style={[styles.legendText, { color: c.textTertiary }]}>
              진입 — 1차 분할 매수 진입 기준 (현재가 대비)
            </Text>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  loadingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  loadingBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  evalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  evalItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    minWidth: 80,
  },
  evalCount: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  evalLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  themeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 100,
  },
  themeBar: {
    height: 4,
    borderRadius: 2,
    minWidth: 4,
  },
  themeName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  themeStocks: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
    gap: 4,
  },
  stockTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockTagText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  th: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  td: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  tdSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  tdBadge: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  evalCell: {
    alignItems: "flex-start",
  },
  stubBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stubBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  legendCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  legendTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  bottomPad: { height: 100 },
});
