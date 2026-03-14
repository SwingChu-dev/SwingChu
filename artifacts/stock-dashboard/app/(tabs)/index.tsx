import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { useSignals } from "@/context/SignalContext";
import { useStockPrice } from "@/context/StockPriceContext";
import StockCard from "@/components/StockCard";
import FilterChip from "@/components/FilterChip";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

function useVix() {
  const [vix, setVix] = useState<number | null>(null);
  const fetch = useCallback(async () => {
    try {
      const resp = await globalThis.fetch(
        `${API_BASE}/stocks/quotes?items=${encodeURIComponent("^VIX:INDEX")}`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const q = data?.[0];
      if (q?.ok && q.price > 0) setVix(parseFloat(q.price.toFixed(2)));
    } catch {}
  }, []);
  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 300_000); // 5분마다 갱신
    return () => clearInterval(t);
  }, [fetch]);
  return vix;
}

type FilterType = "전체" | "미국장" | "국내장" | "우량주" | "저점권" | "저평가" | "고점권";

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>("전체");
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { watchlistStocks, removeStock } = useWatchlist();
  const { newCount, getSignalForStock } = useSignals();
  const { getQuote, refresh } = useStockPrice();
  const vix = useVix();

  const filters: FilterType[] = ["전체", "미국장", "국내장", "우량주", "저점권"];

  const displayed = useMemo(() => {
    switch (filter) {
      case "미국장":  return watchlistStocks.filter((s) => s.region === "미국장");
      case "국내장":  return watchlistStocks.filter((s) => s.region === "국내장");
      case "우량주":  return watchlistStocks.filter((s) => s.grade === "우량주");
      case "저점권":  return watchlistStocks.filter((s) => s.boxRange.currentPosition === "저점권");
      case "저평가":  return watchlistStocks.filter((s) => s.financials.evaluation.includes("저평가"));
      case "고점권":  return watchlistStocks.filter((s) => s.boxRange.currentPosition === "고점권");
      default:        return watchlistStocks;
    }
  }, [filter, watchlistStocks]);

  const lowCount   = useMemo(() => watchlistStocks.filter((s) => s.boxRange.currentPosition === "저점권").length, [watchlistStocks]);
  const underCount = useMemo(() => watchlistStocks.filter((s) => s.financials.evaluation.includes("저평가")).length, [watchlistStocks]);
  const highCount  = useMemo(() => watchlistStocks.filter((s) => s.boxRange.currentPosition === "고점권").length, [watchlistStocks]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 1200);
  }, [refresh]);

  const handleFilter = useCallback((f: FilterType) => {
    setFilter(f);
    if (editMode) setEditMode(false);
  }, [editMode]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>관심종목</Text>
        <View style={styles.headerRight}>
          {newCount > 0 && (
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => router.push("/(tabs)/signals" as any)}
            >
              <Ionicons name="notifications" size={22} color={c.tint} />
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{newCount}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: editMode ? c.tint + "18" : "transparent" }]}
            onPress={() => setEditMode((v) => !v)}
          >
            <Text style={[styles.editBtnText, { color: editMode ? c.tint : c.textSecondary }]}>
              {editMode ? "완료" : "편집"}
            </Text>
          </TouchableOpacity>
        </View>
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
            <Text style={[styles.summaryVal, { color: "#F04452" }]}>{lowCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>저점 기회</Text>
          </TouchableOpacity>
          <View style={[styles.summaryDivider, { backgroundColor: c.separator }]} />
          <TouchableOpacity style={styles.summaryItem} onPress={() => setFilter("저평가")}>
            <Text style={[styles.summaryVal, { color: "#0064FF" }]}>{underCount}</Text>
            <Text style={[styles.summaryLbl, { color: c.textSecondary }]}>저평가</Text>
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
              // Pass computed props so React.memo can skip re-renders correctly
              quote={getQuote(stock.ticker, stock.market)}
              signal={getSignalForStock(stock.id) ?? null}
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

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle:  { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerRight:  { flexDirection: "row", alignItems: "center", gap: 4 },
  alertBtn:     { padding: 6, position: "relative" },
  alertBadge: {
    position: "absolute",
    top: 4, right: 4,
    backgroundColor: "#F04452",
    borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  alertBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  editBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  editBtnText:    { fontSize: 14, fontFamily: "Inter_600SemiBold" },
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
