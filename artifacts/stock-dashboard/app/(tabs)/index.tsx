import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import StockCard from "@/components/StockCard";
import FilterChip from "@/components/FilterChip";

type FilterType = "전체" | "미국장" | "국내장" | "우량주" | "소형주" | "저점권";

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("전체");
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { watchlistStocks, removeStock } = useWatchlist();

  const filters: FilterType[] = ["전체", "미국장", "국내장", "우량주", "소형주", "저점권"];

  const filteredStocks = useMemo(() => {
    switch (selectedFilter) {
      case "미국장":
        return watchlistStocks.filter((s) => s.region === "미국장");
      case "국내장":
        return watchlistStocks.filter((s) => s.region === "국내장");
      case "우량주":
        return watchlistStocks.filter((s) => s.grade === "우량주");
      case "소형주":
        return watchlistStocks.filter((s) => s.grade === "소형주");
      case "저점권":
        return watchlistStocks.filter((s) => s.boxRange.currentPosition === "저점권");
      default:
        return watchlistStocks;
    }
  }, [selectedFilter, watchlistStocks]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const lowPoints = watchlistStocks.filter((s) => s.boxRange.currentPosition === "저점권");
  const undervalued = watchlistStocks.filter((s) =>
    s.financials.evaluation.includes("저평가")
  );
  const highPoints = watchlistStocks.filter((s) => s.boxRange.currentPosition === "고점권");

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: c.background },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>
            내 관심 종목
          </Text>
          <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
            {watchlistStocks.length}개 종목 · 스윙 트레이딩 대시보드
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.vixBadge, { backgroundColor: c.negative + "18" }]}
          >
            <Ionicons name="pulse" size={13} color={c.negative} />
            <Text style={[styles.vixText, { color: c.negative }]}>
              VIX 27.53
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.editBtn,
              {
                backgroundColor: editMode
                  ? c.tint + "20"
                  : c.backgroundTertiary,
              },
            ]}
            onPress={() => setEditMode((v) => !v)}
          >
            <Text
              style={[
                styles.editBtnText,
                { color: editMode ? c.tint : c.textSecondary },
              ]}
            >
              {editMode ? "완료" : "편집"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.tint}
          />
        }
      >
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[
              styles.summaryCard,
              { backgroundColor: c.positive + "15", borderColor: c.positive + "30" },
            ]}
            onPress={() => setSelectedFilter("저점권")}
          >
            <Text style={[styles.summaryNum, { color: c.positive }]}>
              {lowPoints.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: c.positive }]}>
              저점 기회
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.summaryCard,
              { backgroundColor: c.tintBlue + "15", borderColor: c.tintBlue + "30" },
            ]}
          >
            <Text style={[styles.summaryNum, { color: c.tintBlue }]}>
              {undervalued.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: c.tintBlue }]}>
              저평가
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: c.warning + "15", borderColor: c.warning + "30" },
            ]}
          >
            <Text style={[styles.summaryNum, { color: c.warning }]}>
              {highPoints.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: c.warning }]}>
              고점 주의
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((f) => (
            <FilterChip
              key={f}
              label={f}
              selected={selectedFilter === f}
              onPress={() => {
                if (editMode) setEditMode(false);
                setSelectedFilter(f);
              }}
            />
          ))}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={[styles.listCount, { color: c.textSecondary }]}>
            {filteredStocks.length}개 종목
          </Text>
          {editMode && (
            <Text style={[styles.editHint, { color: c.textTertiary }]}>
              — 을 눌러 삭제
            </Text>
          )}
        </View>

        {filteredStocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            editMode={editMode}
            onDelete={() => removeStock(stock.id)}
            onPress={() => {
              if (editMode) return;
              router.push({
                pathname: "/stock/[id]",
                params: { id: stock.id },
              });
            }}
          />
        ))}

        {!editMode && (
          <TouchableOpacity
            style={[
              styles.addBtn,
              { borderColor: c.tint + "60", backgroundColor: c.tint + "10" },
            ]}
            onPress={() => router.push("/add-stock")}
          >
            <Ionicons name="add-circle-outline" size={20} color={c.tint} />
            <Text style={[styles.addBtnText, { color: c.tint }]}>
              종목 추가하기
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vixBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  vixText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryNum: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 2,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  editHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  addBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  bottomPad: {
    height: 100,
  },
});
