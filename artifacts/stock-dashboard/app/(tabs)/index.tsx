import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import { useAISignals, AISmartMoneySignal } from "@/context/AISignalContext";
import { useStockPrice } from "@/context/StockPriceContext";
import StockCard from "@/components/StockCard";
import FilterChip from "@/components/FilterChip";
import { calcBoxPosition } from "@/utils/boxPosition";
import { useVix } from "@/hooks/useVix";
import { useMarketIntel } from "@/hooks/useMarketIntel";
import { playbookFor } from "@/utils/regimePlaybook";

type FilterType = "전체" | "미국장" | "국내장" | "우량주" | "저점권" | "고점권" | "세력진입";

// 구간 결정: AI 지표(MA5/20/60 + RSI + BB) 우선, 없으면 boxRange 기반
function resolveZone(
  sig: AISmartMoneySignal | undefined,
  stock: any,
  quote: any
): "저점권" | "중간권" | "고점권" {
  if (sig?.indicators) {
    const { rsi14, ma5, ma20, ma60, bbUpper, bbLower, currentPrice } = sig.indicators;

    const bbRange    = bbUpper - bbLower;
    const bbPos      = bbRange > 0 ? (currentPrice - bbLower) / bbRange : 0.5;
    const isFullBull = ma5 > ma20 && ma20 > ma60;
    const isFullBear = ma5 < ma20 && ma20 < ma60;

    const lowScore =
      (isFullBear ? 2 : ma5 < ma20 ? 1 : 0) +
      (currentPrice < ma20 ? 1 : 0) +
      (currentPrice < ma60 ? 1 : 0) +
      (rsi14 <= 35 ? 2 : rsi14 <= 45 ? 1 : 0) +
      (bbPos <= 0.20 ? 1 : 0);

    const highScore =
      (isFullBull ? 2 : ma5 > ma20 ? 1 : 0) +
      (currentPrice > ma20 && currentPrice > ma60 ? 1 : 0) +
      (rsi14 >= 70 ? 2 : rsi14 >= 63 ? 1 : 0) +
      (bbPos >= 0.80 ? 1 : 0);

    if (lowScore  >= 3) return "저점권";
    if (highScore >= 3) return "고점권";
    return "중간권";
  }
  return calcBoxPosition(stock.boxRange, quote);
}

function isSmartEntry(sig?: AISmartMoneySignal): boolean {
  if (!sig) return false;
  if (sig.type !== "세력진입" && sig.type !== "매집중") return false;
  if (sig.strength === "약") return false;
  const { volumeRatio, rsi14, macdHistogram } = sig.indicators;
  return volumeRatio >= 1.5 && rsi14 >= 30 && rsi14 <= 62 && macdHistogram > -1;
}

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>("전체");
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { watchlistStocks, removeStock } = useWatchlist();
  const { smartMoneySignals, refresh: refreshSignals } = useAISignals();
  const { getQuote, refresh } = useStockPrice();
  const vix = useVix();
  const { data: marketIntel } = useMarketIntel("us");
  const playbook = marketIntel ? playbookFor(marketIntel.cycle.phase) : null;

  const filters: FilterType[] = ["전체", "미국장", "국내장", "우량주", "저점권"];

  const getSig   = useCallback((s: any) => smartMoneySignals[s.ticker] as AISmartMoneySignal | undefined, [smartMoneySignals]);
  const getQuoteLocal = useCallback((s: any) => getQuote(s.ticker, s.market), [getQuote]);

  const getZone  = useCallback(
    (s: any) => resolveZone(getSig(s), s, getQuoteLocal(s)),
    [getSig, getQuoteLocal]
  );

  const displayed = useMemo(() => {
    switch (filter) {
      case "미국장":   return watchlistStocks.filter((s) => s.region === "미국장");
      case "국내장":   return watchlistStocks.filter((s) => s.region === "국내장");
      case "우량주":   return watchlistStocks.filter((s) => s.grade === "우량주");
      case "저점권":   return watchlistStocks.filter((s) => getZone(s) === "저점권");
      case "고점권":   return watchlistStocks.filter((s) => getZone(s) === "고점권");
      case "세력진입": return watchlistStocks.filter((s) => isSmartEntry(getSig(s)));
      default:         return watchlistStocks;
    }
  }, [filter, watchlistStocks, getZone, getSig]);

  const lowCount    = useMemo(() => watchlistStocks.filter((s) => getZone(s) === "저점권").length, [watchlistStocks, getZone]);
  const entryCount  = useMemo(() => watchlistStocks.filter((s) => isSmartEntry(getSig(s))).length, [watchlistStocks, getSig]);
  const highCount   = useMemo(() => watchlistStocks.filter((s) => getZone(s) === "고점권").length, [watchlistStocks, getZone]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    refreshSignals();
    setTimeout(() => setRefreshing(false), 1500);
  }, [refresh, refreshSignals]);

  const handleFilter = useCallback((f: FilterType) => {
    setFilter(f);
    if (editMode) setEditMode(false);
  }, [editMode]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>관심종목</Text>
          {playbook && (
            <TouchableOpacity
              style={[styles.regimePill, { backgroundColor: playbook.color + "22", borderColor: playbook.color + "55" }]}
              onPress={() => router.push("/market-cycle" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.regimeEmoji}>{playbook.emoji}</Text>
              <Text style={[styles.regimeText, { color: playbook.color }]}>{playbook.label} · 행동 수칙 →</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: editMode ? c.tint + "18" : "transparent" }]}
          onPress={() => setEditMode((v) => !v)}
        >
          <Text style={[styles.editBtnText, { color: editMode ? c.tint : c.textSecondary }]}>
            {editMode ? "완료" : "편집"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.tint} />
        }
      >
        {/* ─── Summary Row ─── */}
        <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
          <TouchableOpacity style={styles.summaryItem} onPress={() => setFilter("저점권")}>
            <Text style={[styles.summaryVal, { color: "#2DB55D" }]}>{lowCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>저점 기회</Text>
          </TouchableOpacity>
          <View style={[styles.summaryDivider, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.summaryItem} onPress={() => setFilter("세력진입")}>
            <Text style={[styles.summaryVal, { color: "#F04452" }]}>{entryCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>세력 진입</Text>
          </TouchableOpacity>
          <View style={[styles.summaryDivider, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.summaryItem} onPress={() => setFilter("고점권")}>
            <Text style={[styles.summaryVal, { color: "#FF6B00" }]}>{highCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>고점 주의</Text>
          </TouchableOpacity>
          <View style={[styles.summaryDivider, { backgroundColor: c.separator }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, {
              color: vix == null ? c.textSecondary : vix >= 30 ? "#F04452" : vix >= 20 ? "#FF6B00" : "#2DB55D"
            }]}>
              {vix != null ? vix.toFixed(2) : "—"}
            </Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>VIX</Text>
          </View>
        </View>

        {/* ─── Filter Chips ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <FilterChip key={f} label={f} selected={filter === f} onPress={() => handleFilter(f)} />
          ))}
        </ScrollView>

        {/* ─── Stock List ─── */}
        <View style={[styles.listCard, { backgroundColor: c.card }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.listCount, { color: c.textSecondary }]}>
              {displayed.length}개 종목
            </Text>
            {editMode && (
              <Text style={[styles.editHint, { color: c.textTertiary }]}>— 버튼으로 삭제</Text>
            )}
          </View>

          {displayed.map((stock, idx) => (
            <StockCard
              key={stock.id}
              stock={stock}
              quote={getQuote(stock.ticker, stock.market)}
              signal={smartMoneySignals[stock.ticker] ?? null}
              colors={c}
              isDark={isDark}
              editMode={editMode}
              onDelete={() => removeStock(stock.id)}
              isLast={idx === displayed.length - 1}
              onPress={() => {
                if (editMode) return;
                router.push({ pathname: "/stock/[id]", params: { id: stock.id } });
              }}
            />
          ))}

          {displayed.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: c.textTertiary }]}>종목이 없습니다</Text>
            </View>
          )}
        </View>

        {/* ─── Add Button ─── */}
        {!editMode && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: c.card }]}
            onPress={() => router.push("/add-stock")}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={18} color={c.tint} />
            <Text style={[styles.addBtnText, { color: c.tint }]}>종목 추가하기</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle:  { fontSize: 22, fontFamily: "Inter_700Bold" },
  regimePill:   {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
  },
  regimeEmoji:  { fontSize: 12 },
  regimeText:   { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  editBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  editBtnText:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    flexDirection: "row",
    paddingVertical: 16,
  },
  summaryItem:   { flex: 1, alignItems: "center", gap: 4 },
  summaryVal:    { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryLbl:    { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryDivider:{ width: StyleSheet.hairlineWidth, marginVertical: 4 },
  filterRow:     { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  listCard:      { marginHorizontal: 16, borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  listCount:  { fontSize: 12, fontFamily: "Inter_500Medium" },
  editHint:   { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyWrap:  { padding: 32, alignItems: "center" },
  emptyText:  { fontSize: 14, fontFamily: "Inter_400Regular" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
  },
  addBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
