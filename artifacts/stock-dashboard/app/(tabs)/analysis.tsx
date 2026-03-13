import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { STOCKS } from "@/constants/stockData";

type SortKey = "name" | "eval" | "forecast" | "box";

const EVAL_ORDER = ["강한 저평가", "저평가", "적정", "거품", "심각한 거품"];
const EVAL_COLORS: Record<string, string> = {
  "심각한 거품": "#FF3B3B",
  "거품": "#FF6B35",
  "적정": "#F59E0B",
  "저평가": "#00C896",
  "강한 저평가": "#3B82F6",
};

export default function AnalysisScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [sortKey, setSortKey] = useState<SortKey>("eval");

  const sortedStocks = [...STOCKS].sort((a, b) => {
    if (sortKey === "eval") {
      return EVAL_ORDER.indexOf(a.financials.evaluation) - EVAL_ORDER.indexOf(b.financials.evaluation);
    }
    if (sortKey === "forecast") {
      return b.forecasts[b.forecasts.length - 1].changePercent - a.forecasts[a.forecasts.length - 1].changePercent;
    }
    if (sortKey === "box") {
      const boxOrder = { 저점권: 0, 중간권: 1, 고점권: 2 };
      return boxOrder[a.boxRange.currentPosition] - boxOrder[b.boxRange.currentPosition];
    }
    return a.name.localeCompare(b.name);
  });

  const SORT_BTNS: { key: SortKey; label: string }[] = [
    { key: "eval", label: "재무 평가순" },
    { key: "forecast", label: "상승 전망순" },
    { key: "box", label: "저점 우선" },
    { key: "name", label: "이름순" },
  ];

  const themes: Record<string, string[]> = {};
  STOCKS.forEach((s) => {
    s.themes.forEach((t) => {
      const mainTheme = t.split("/")[0];
      if (!themes[mainTheme]) themes[mainTheme] = [];
      if (!themes[mainTheme].includes(s.name)) themes[mainTheme].push(s.name);
    });
  });

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: c.text }]}>시장 분석</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          전체 포트폴리오 분석 리포트
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>재무 분포</Text>
          <View style={styles.evalGrid}>
            {EVAL_ORDER.map((ev) => {
              const count = STOCKS.filter((s) => s.financials.evaluation === ev).length;
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

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>테마별 분류</Text>
          {Object.entries(themes)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 8)
            .map(([theme, stocks]) => (
              <View key={theme} style={styles.themeRow}>
                <View style={styles.themeLeft}>
                  <View style={[styles.themeBar, { backgroundColor: c.tint, width: Math.max(stocks.length * 20, 4) }]} />
                  <Text style={[styles.themeName, { color: c.text }]}>{theme}</Text>
                </View>
                <View style={styles.themeStocks}>
                  {stocks.map((s) => (
                    <View key={s} style={[styles.stockTag, { backgroundColor: c.backgroundTertiary }]}>
                      <Text style={[styles.stockTagText, { color: c.textSecondary }]}>{s.length > 4 ? s.slice(0, 4) + ".." : s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: c.text }]}>종목별 분석표</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {SORT_BTNS.map((btn) => (
                <TouchableOpacity
                  key={btn.key}
                  style={[
                    styles.sortBtn,
                    { backgroundColor: sortKey === btn.key ? c.tint + "22" : c.backgroundTertiary },
                  ]}
                  onPress={() => setSortKey(btn.key)}
                >
                  <Text style={[styles.sortBtnText, { color: sortKey === btn.key ? c.tint : c.textSecondary }]}>
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.tableHeader, { borderBottomColor: c.separator }]}>
            <Text style={[styles.th, { color: c.textTertiary, flex: 2 }]}>종목</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 1 }]}>재무</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 1 }]}>박스권</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 1 }]}>12M</Text>
            <Text style={[styles.th, { color: c.textTertiary, flex: 1.2 }]}>1차 진입</Text>
          </View>

          {sortedStocks.map((stock, i) => {
            const evalColor = EVAL_COLORS[stock.financials.evaluation] || "#888";
            const boxPos = stock.boxRange.currentPosition;
            const boxColor = boxPos === "저점권" ? c.positive : boxPos === "고점권" ? c.negative : c.warning;
            const forecast12m = stock.forecasts[stock.forecasts.length - 1];
            const isForecastPos = forecast12m.changePercent >= 0;
            return (
              <View
                key={stock.id}
                style={[
                  styles.tableRow,
                  {
                    borderBottomColor: c.separator,
                    borderBottomWidth: i < sortedStocks.length - 1 ? 1 : 0,
                    backgroundColor: i % 2 === 0 ? "transparent" : c.backgroundTertiary + "40",
                  },
                ]}
              >
                <View style={{ flex: 2 }}>
                  <Text style={[styles.td, { color: c.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {stock.name}
                  </Text>
                  <Text style={[styles.tdSub, { color: c.textTertiary }]}>{stock.market}</Text>
                </View>
                <View style={[styles.evalCell, { flex: 1 }]}>
                  <Text style={[styles.tdBadge, { color: evalColor, backgroundColor: evalColor + "18" }]}>
                    {stock.financials.evaluation.replace("강한 ", "★").replace("심각한 ", "‼")}
                  </Text>
                </View>
                <Text style={[styles.td, { color: boxColor, flex: 1 }]}>{boxPos}</Text>
                <Text style={[styles.td, { color: isForecastPos ? c.positive : c.negative, flex: 1 }]}>
                  {isForecastPos ? "+" : ""}{forecast12m.changePercent.toFixed(0)}%
                </Text>
                <Text style={[styles.td, { color: c.tint, flex: 1.2 }]} numberOfLines={1}>
                  -{stock.splitEntries[0].dropPercent}%
                </Text>
              </View>
            );
          })}
        </View>

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
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    marginBottom: 12,
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
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
    marginRight: 8,
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
  bottomPad: {
    height: 100,
  },
});
