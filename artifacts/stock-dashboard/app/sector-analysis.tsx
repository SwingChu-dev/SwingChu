import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, Dimensions, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import { API_BASE } from "@/utils/apiBase";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 32;

// ── 고정 색상 팔레트 ─────────────────────────────────────────────────────────
const PALETTE = [
  "#0064FF", "#F04452", "#2DB55D", "#F59E0B",
  "#8B5CF6", "#06B6D4", "#EC4899", "#10B981",
];
function colorFor(i: number) { return PALETTE[i % PALETTE.length]; }

// ── 상관계수 → 색상 ───────────────────────────────────────────────────────────
function corrColor(v: number): string {
  if (v >=  0.7) return "#1A6B3C";
  if (v >=  0.4) return "#2DB55D";
  if (v >=  0.1) return "#86EFAC";
  if (v >= -0.1) return "#94A3B8";
  if (v >= -0.4) return "#FCA5A5";
  if (v >= -0.7) return "#F04452";
  return "#991B1B";
}
function corrTextColor(v: number): string {
  return Math.abs(v) >= 0.4 ? "#fff" : "#1E293B";
}

// ── 필터 칩 ──────────────────────────────────────────────────────────────────
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: selected ? c.tint : c.card, borderColor: selected ? c.tint : c.separator }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipTxt, { color: selected ? "#fff" : c.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

type Period = "3mo" | "6mo" | "1y";

export default function SectorAnalysisScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { watchlistStocks } = useWatchlist();

  // 미국 종목만 분석 대상 (ETF와 같은 시장)
  const usTickers = useMemo(
    () => watchlistStocks.filter(s => s.region === "미국장").map(s => s.ticker),
    [watchlistStocks]
  );

  const [period,    setPeriod]  = useState<Period>("6mo");
  const [data,      setData]    = useState<any>(null);
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const extra = usTickers.join(",");
      const res   = await fetch(`${API_BASE}/sector/analysis?tickers=${extra}&period=${period}`);
      const json  = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setFocusTick(usTickers[0] ?? null);
    } catch (e: any) {
      setError(e.message ?? "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [usTickers, period]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // ── 차트 데이터 준비 ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!data) return null;
    const { tickers, returns, labels } = data;
    if (!tickers || tickers.length === 0) return null;

    // 모든 시리즈 날짜
    const firstTick = tickers[0];
    const allPoints: { date: string; value: number }[] = returns[firstTick] ?? [];
    const totalPts = allPoints.length;
    if (totalPts < 2) return null;

    // 날짜 라벨 — 5개 균등 간격
    const step  = Math.max(1, Math.floor(totalPts / 5));
    const chartLabels: string[] = allPoints
      .filter((_, i) => i % step === 0 || i === totalPts - 1)
      .map(p => {
        const d = new Date(p.date);
        return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, "0")}`;
      });

    // 데이터셋 (각 티커)
    const datasets = tickers.map((t: string, i: number) => ({
      data:         (returns[t] ?? []).map((p: any) => p.value),
      color:        (opacity = 1) => colorFor(i) + Math.round(opacity * 255).toString(16).padStart(2, "0"),
      strokeWidth:  usTickers.includes(t) ? 3 : 1.5,
      label:        labels[t] ?? t,
      ticker:       t,
    }));

    return { labels: chartLabels, datasets };
  }, [data, usTickers]);

  // ── 상관관계 행렬 ─────────────────────────────────────────────────────────
  const corrTickers = useMemo(() => data?.tickers ?? [], [data]);
  const corrMatrix  = useMemo(() => data?.correlation ?? {}, [data]);
  const labelMap    = useMemo(() => data?.labels ?? {}, [data]);

  // 포커스 종목의 상위 동조 섹터
  const focusCorrs = useMemo(() => {
    if (!focusTick || !corrMatrix[focusTick]) return [];
    return corrTickers
      .filter((t: string) => t !== focusTick)
      .map((t: string) => ({ ticker: t, label: labelMap[t] ?? t, value: corrMatrix[focusTick][t] }))
      .sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value));
  }, [focusTick, corrMatrix, corrTickers, labelMap]);

  const topSector = focusCorrs[0];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>섹터 수익률 분석</Text>
        <TouchableOpacity onPress={fetch_} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={c.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── 기간 선택 ── */}
        <View style={styles.periodRow}>
          {(["3mo","6mo","1y"] as Period[]).map(p => (
            <Chip key={p} label={{ "3mo":"3개월","6mo":"6개월","1y":"1년" }[p]!}
              selected={period === p} onPress={() => setPeriod(p)} />
          ))}
        </View>

        {/* ── 로딩 / 에러 ── */}
        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={c.tint} />
            <Text style={[styles.loadingTxt, { color: c.textSecondary }]}>데이터 수집 중...</Text>
          </View>
        )}
        {error && !loading && (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#F04452" />
            <Text style={[styles.errTxt, { color: c.textSecondary }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: c.tint }]} onPress={fetch_}>
              <Text style={styles.retryTxt}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 누적 수익률 차트 ── */}
        {!loading && chartData && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.textSecondary }]}>누적 수익률 추이</Text>

            {/* 범례 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legend}>
              {chartData.datasets.map((ds: any, i: number) => (
                <View key={ds.ticker} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colorFor(i), width: usTickers.includes(ds.ticker) ? 12 : 8, height: usTickers.includes(ds.ticker) ? 12 : 8 }]} />
                  <Text style={[styles.legendTxt, { color: c.textSecondary, fontFamily: usTickers.includes(ds.ticker) ? "Inter_700Bold" : "Inter_400Regular" }]}>
                    {ds.label}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <LineChart
              data={{ labels: chartData.labels, datasets: chartData.datasets }}
              width={CHART_W - 16}
              height={220}
              withDots={false}
              withInnerLines={true}
              withOuterLines={false}
              withShadow={false}
              chartConfig={{
                backgroundColor: c.card,
                backgroundGradientFrom: c.card,
                backgroundGradientTo:   c.card,
                decimalPlaces: 1,
                color: (opacity = 1) => isDark
                  ? `rgba(255,255,255,${opacity * 0.3})`
                  : `rgba(0,0,0,${opacity * 0.1})`,
                labelColor: (opacity = 1) => isDark
                  ? `rgba(255,255,255,${opacity * 0.5})`
                  : `rgba(0,0,0,${opacity * 0.4})`,
                propsForLabels: { fontSize: 10, fontFamily: "Inter_400Regular" },
                formatYLabel: (v: string) => `${parseFloat(v) > 0 ? "+" : ""}${parseFloat(v).toFixed(0)}%`,
              }}
              style={{ borderRadius: 12, marginLeft: -8 }}
              bezier
            />

            <Text style={[styles.chartNote, { color: c.textTertiary }]}>
              * 시작점 0% 정규화 기준. 내 종목은 굵은 선.
            </Text>
          </View>
        )}

        {/* ── 상관관계 히트맵 ── */}
        {!loading && corrTickers.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.textSecondary }]}>상관관계 히트맵</Text>
            <Text style={[styles.cardSub, { color: c.textTertiary }]}>
              1.0 = 완전 동조 · 0 = 무관 · -1.0 = 반대
            </Text>

            {/* 히트맵 그리드 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* 열 헤더 */}
                <View style={styles.corrRow}>
                  <View style={styles.corrLabel} />
                  {corrTickers.map((t: string) => (
                    <View key={t} style={styles.corrCell}>
                      <Text style={[styles.corrHeader, { color: c.textSecondary }]} numberOfLines={2}>
                        {labelMap[t] ?? t}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* 행 */}
                {corrTickers.map((rowT: string) => (
                  <View key={rowT} style={styles.corrRow}>
                    <View style={styles.corrLabel}>
                      <Text style={[styles.corrRowLabel, { color: c.text }]} numberOfLines={1}>
                        {(labelMap[rowT] ?? rowT).split(" ")[0]}
                      </Text>
                    </View>
                    {corrTickers.map((colT: string) => {
                      const v = corrMatrix[rowT]?.[colT] ?? 0;
                      const bg = corrColor(v);
                      const fg = corrTextColor(v);
                      return (
                        <View key={colT} style={[styles.corrCell, { backgroundColor: bg }]}>
                          <Text style={[styles.corrVal, { color: fg }]}>{v.toFixed(2)}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── 포커스 종목 동조화 분석 ── */}
        {!loading && usTickers.length > 0 && focusCorrs.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.textSecondary }]}>동조화 분석</Text>

            {/* 종목 선택 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {usTickers.filter((t: string) => corrTickers.includes(t)).map((t: string) => (
                <Chip key={t} label={t} selected={focusTick === t} onPress={() => setFocusTick(t)} />
              ))}
            </ScrollView>

            {/* 메인 분석 */}
            {topSector && (
              <View style={[styles.topCorrBanner, { backgroundColor: corrColor(topSector.value) + "22" }]}>
                <Ionicons name="analytics-outline" size={20} color={corrColor(topSector.value)} />
                <Text style={[styles.topCorrTxt, { color: c.text }]}>
                  <Text style={{ fontFamily: "Inter_700Bold" }}>{focusTick}</Text>
                  {" "}과 가장 동조화된 섹터:{"\n"}
                  <Text style={{ color: corrColor(topSector.value), fontFamily: "Inter_700Bold" }}>
                    {topSector.label}
                  </Text>
                  {` (r = ${topSector.value.toFixed(2)})`}
                </Text>
              </View>
            )}

            {/* 전체 동조 순위 */}
            {focusCorrs.map((item: any, i: number) => (
              <View key={item.ticker} style={styles.corrRankRow}>
                <Text style={[styles.corrRankNum, { color: c.textTertiary }]}>{i + 1}</Text>
                <View style={styles.corrRankBarWrap}>
                  <Text style={[styles.corrRankLabel, { color: c.text }]}>{item.label}</Text>
                  <View style={styles.corrBarTrack}>
                    <View style={[
                      styles.corrBarFill,
                      {
                        width: `${Math.abs(item.value) * 100}%` as any,
                        backgroundColor: corrColor(item.value),
                      }
                    ]} />
                  </View>
                </View>
                <Text style={[styles.corrRankVal, { color: corrColor(item.value) }]}>
                  {item.value > 0 ? "+" : ""}{item.value.toFixed(2)}
                </Text>
              </View>
            ))}

            {/* 투자 시사점 */}
            {topSector && (
              <View style={[styles.insightBox, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                <Text style={[styles.insightTitle, { color: c.text }]}>💡 투자 시사점</Text>
                <Text style={[styles.insightTxt, { color: c.textSecondary }]}>
                  {topSector.value >= 0.7
                    ? `${focusTick}는 ${topSector.label}와 강한 양의 상관관계(${topSector.value.toFixed(2)})를 보입니다. 해당 섹터 ETF의 방향성을 선행 지표로 활용하세요.`
                    : topSector.value >= 0.4
                    ? `${focusTick}는 ${topSector.label}와 중간 수준의 동조성(${topSector.value.toFixed(2)})을 보입니다. 섹터 뉴스 모니터링이 도움됩니다.`
                    : topSector.value <= -0.4
                    ? `${focusTick}는 ${topSector.label}와 역의 상관관계(${topSector.value.toFixed(2)})를 보입니다. 해당 섹터 하락 시 ${focusTick} 상승 가능성 주시.`
                    : `${focusTick}는 분석 섹터들과 독립적으로 움직이는 경향이 있습니다. 고유 재료에 집중하세요.`}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const CELL_SIZE = 58;

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn:      { width: 40, height: 40, justifyContent: "center" },
  refreshBtn:   { width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" },
  headerTitle:  { fontSize: 18, fontFamily: "Inter_700Bold" },

  periodRow:    { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 4, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  chipTxt:      { fontSize: 13, fontFamily: "Inter_500Medium" },

  centerBox:    { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  loadingTxt:   { fontSize: 14, fontFamily: "Inter_400Regular" },
  errTxt:       { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  retryBtn:     { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryTxt:     { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },

  card:         { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16 },
  cardTitle:    { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  cardSub:      { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 10, marginTop: -4 },

  legend:       { marginBottom: 8 },
  legendItem:   { flexDirection: "row", alignItems: "center", gap: 6, marginRight: 14 },
  legendDot:    { borderRadius: 6 },
  legendTxt:    { fontSize: 11 },

  chartNote:    { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "center" },

  // 히트맵
  corrRow:      { flexDirection: "row", alignItems: "center" },
  corrLabel:    { width: 64, paddingRight: 8 },
  corrRowLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  corrHeader:   { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  corrCell:     {
    width: CELL_SIZE, height: CELL_SIZE,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  corrVal:      { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // 동조화 분석
  topCorrBanner:{
    flexDirection: "row", alignItems: "flex-start",
    gap: 10, padding: 14, borderRadius: 12,
    marginBottom: 14,
  },
  topCorrTxt:   { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, flex: 1 },

  corrRankRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  corrRankNum:  { width: 18, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  corrRankBarWrap: { flex: 1, gap: 3 },
  corrRankLabel:{ fontSize: 12, fontFamily: "Inter_500Medium" },
  corrBarTrack: { height: 6, borderRadius: 3, backgroundColor: "#E5E7EB", overflow: "hidden" },
  corrBarFill:  { height: "100%", borderRadius: 3 },
  corrRankVal:  { width: 44, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "right" },

  insightBox:   { borderRadius: 12, padding: 14, marginTop: 12, gap: 6 },
  insightTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  insightTxt:   { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
