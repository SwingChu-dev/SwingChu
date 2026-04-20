import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  CATEGORY_LABEL, CATEGORY_COLOR, Category,
  EXIT_TYPE_LABEL, EXIT_TYPE_COLOR, ExitType,
  DEVIATION_LABEL,
} from "@/types/portfolio";
import {
  computeStats, statsByCategory, exitTypeBreakdown,
  deviationBreakdown, filterByTime, TimeFilter,
} from "@/services/tradeStats";

const FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "WEEK",    label: "1주" },
  { key: "MONTH",   label: "1달" },
  { key: "QUARTER", label: "3달" },
  { key: "ALL",     label: "전체" },
];

function fmtKRW(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 100_000_000) return `${sign}${(a / 100_000_000).toFixed(2)}억`;
  if (a >= 10_000)      return `${sign}${(a / 10_000).toFixed(1)}만`;
  return `${sign}${Math.round(a).toLocaleString()}`;
}

export default function StatsScreen() {
  const isDark  = useColorScheme() === "dark";
  const c       = isDark ? Colors.dark : Colors.light;
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { closedTrades } = usePortfolio();

  const [filter, setFilter] = useState<TimeFilter>("MONTH");
  const trades = useMemo(() => filterByTime(closedTrades, filter), [closedTrades, filter]);
  const stats  = useMemo(() => computeStats(trades), [trades]);
  const byCat  = useMemo(() => statsByCategory(trades), [trades]);
  const byExit = useMemo(() => exitTypeBreakdown(trades), [trades]);
  const byDev  = useMemo(() => deviationBreakdown(trades), [trades]);

  const winColor  = "#FF3B30";  // 토스 빨강(수익)
  const lossColor = "#3478F6";  // 토스 파랑(손실)
  const pnlColor  = stats.totalPnLKRW > 0 ? winColor : stats.totalPnLKRW < 0 ? lossColor : c.textSecondary;
  const expectColor = stats.expectancyKRW > 0 ? winColor : stats.expectancyKRW < 0 ? lossColor : c.textSecondary;
  const payoffStr = !Number.isFinite(stats.payoffRatio)
    ? "∞"
    : stats.payoffRatio === 0 ? "—" : stats.payoffRatio.toFixed(2);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>매매 성과</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}>
        {/* 기간 필터 */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterBtn,
                filter === f.key
                  ? { backgroundColor: c.tint, borderColor: c.tint }
                  : { borderColor: c.separator },
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: filter === f.key ? "#fff" : c.textSecondary },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {trades.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: c.card }]}>
            <Ionicons name="bar-chart-outline" size={32} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              해당 기간 청산 기록이 없습니다.{"\n"}
              보유 종목에서 매도하면 여기에 통계가 누적됩니다.
            </Text>
          </View>
        ) : (
          <>
            {/* 핵심 3 지표 */}
            <View style={[styles.heroCard, { backgroundColor: c.card }]}>
              <Text style={[styles.heroLabel, { color: c.textTertiary }]}>총 실현 손익</Text>
              <Text style={[styles.heroAmount, { color: pnlColor }]}>
                {stats.totalPnLKRW >= 0 ? "+" : ""}{fmtKRW(stats.totalPnLKRW)}원
              </Text>
              <Text style={[styles.heroSub, { color: c.textSecondary }]}>
                {stats.totalCount}건 · 승 {stats.winCount} / 패 {stats.lossCount}
                {stats.breakEvenCount > 0 && ` / 본전 ${stats.breakEvenCount}`}
              </Text>
            </View>

            <View style={styles.kpiRow}>
              <Kpi label="승률" value={`${(stats.winRate * 100).toFixed(0)}%`} c={c} />
              <Kpi label="손익비 (R:R)" value={payoffStr} c={c} hint="평균이익 ÷ 평균손실" />
              <Kpi
                label="기대값/건"
                value={`${stats.expectancyKRW >= 0 ? "+" : ""}${fmtKRW(stats.expectancyKRW)}`}
                c={c}
                valueColor={expectColor}
              />
            </View>

            {/* 평균 익절/손절 */}
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>평균 손익</Text>
              <View style={styles.barRow}>
                <BarItem
                  label={`승 ${stats.winCount}건`}
                  amount={`+${fmtKRW(stats.avgWinKRW)}`}
                  pct={Math.abs(stats.avgWinKRW)}
                  total={Math.abs(stats.avgWinKRW) + Math.abs(stats.avgLossKRW)}
                  color={winColor}
                  c={c}
                />
                <BarItem
                  label={`패 ${stats.lossCount}건`}
                  amount={`${fmtKRW(stats.avgLossKRW)}`}
                  pct={Math.abs(stats.avgLossKRW)}
                  total={Math.abs(stats.avgWinKRW) + Math.abs(stats.avgLossKRW)}
                  color={lossColor}
                  c={c}
                />
              </View>
              <Text style={[styles.helperText, { color: c.textTertiary }]}>
                {stats.expectancyKRW > 0
                  ? `1건당 평균 +${fmtKRW(stats.expectancyKRW)}원 기대 — 같은 패턴을 유지하세요.`
                  : stats.expectancyKRW < 0
                  ? `1건당 평균 ${fmtKRW(stats.expectancyKRW)}원 — 손절 폭 또는 진입 기준 점검 필요.`
                  : `샘플이 적어 신뢰도 낮음. 매매 횟수 누적 후 다시 확인하세요.`}
              </Text>
            </View>

            {/* 카테고리별 */}
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>카테고리별 성과</Text>
              {(["A_CORE", "B_EVENT", "C_CONTRARIAN", "D_SPECULATIVE"] as Category[]).map(cat => {
                const s = byCat[cat];
                if (s.totalCount === 0) return null;
                const color = s.totalPnLKRW > 0 ? winColor : s.totalPnLKRW < 0 ? lossColor : c.textSecondary;
                return (
                  <View key={cat} style={[styles.catRow, { borderTopColor: c.separator }]}>
                    <View style={[styles.catDot, { backgroundColor: CATEGORY_COLOR[cat] }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.catName, { color: c.text }]}>{CATEGORY_LABEL[cat]}</Text>
                      <Text style={[styles.catSub, { color: c.textTertiary }]}>
                        {s.totalCount}건 · 승률 {(s.winRate * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <Text style={[styles.catPnl, { color }]}>
                      {s.totalPnLKRW >= 0 ? "+" : ""}{fmtKRW(s.totalPnLKRW)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* 청산 타입별 */}
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>청산 타입 분포</Text>
              {(["TAKE_PROFIT_PARTIAL", "TAKE_PROFIT_FULL", "STOP_LOSS", "BREAK_EVEN", "DISCRETIONARY"] as ExitType[])
                .filter(t => byExit[t].count > 0)
                .map(t => {
                  const v = byExit[t];
                  const color = v.pnlKRW > 0 ? winColor : v.pnlKRW < 0 ? lossColor : c.textSecondary;
                  return (
                    <View key={t} style={[styles.catRow, { borderTopColor: c.separator }]}>
                      <View style={[styles.catDot, { backgroundColor: EXIT_TYPE_COLOR[t] }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.catName, { color: c.text }]}>{EXIT_TYPE_LABEL[t]}</Text>
                        <Text style={[styles.catSub, { color: c.textTertiary }]}>{v.count}건</Text>
                      </View>
                      <Text style={[styles.catPnl, { color }]}>
                        {v.pnlKRW >= 0 ? "+" : ""}{fmtKRW(v.pnlKRW)}
                      </Text>
                    </View>
                  );
                })}
            </View>

            {/* 원칙 준수 */}
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>원칙 준수율</Text>
              <Text style={[styles.bigPct, { color: stats.ruleAdherence >= 0.8 ? winColor : lossColor }]}>
                {(stats.ruleAdherence * 100).toFixed(0)}%
              </Text>
              <Text style={[styles.helperText, { color: c.textTertiary }]}>
                {stats.ruleAdherence >= 0.8
                  ? "원칙대로 매매 중. 이 페이스를 유지하세요."
                  : "원칙 이탈이 잦습니다. 진입 전 시나리오를 더 구체적으로 적어보세요."}
              </Text>

              {byDev.length > 0 && (
                <>
                  <Text style={[styles.subTitle, { color: c.textSecondary }]}>벗어남 사유</Text>
                  {byDev.map(d => (
                    <View key={d.reason} style={[styles.catRow, { borderTopColor: c.separator }]}>
                      <Ionicons name="alert-circle-outline" size={16} color="#F04452" />
                      <View style={{ flex: 1, marginLeft: 6 }}>
                        <Text style={[styles.catName, { color: c.text }]}>{DEVIATION_LABEL[d.reason]}</Text>
                        <Text style={[styles.catSub, { color: c.textTertiary }]}>{d.count}건</Text>
                      </View>
                      <Text style={[styles.catPnl, { color: d.pnlKRW < 0 ? lossColor : winColor }]}>
                        {d.pnlKRW >= 0 ? "+" : ""}{fmtKRW(d.pnlKRW)}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* 평균 보유일 */}
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>평균 보유 기간</Text>
              <Text style={[styles.bigPct, { color: c.text }]}>
                {stats.avgHoldingDays.toFixed(1)}일
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value, c, hint, valueColor }: {
  label: string; value: string; c: any; hint?: string; valueColor?: string;
}) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: c.card }]}>
      <Text style={[styles.kpiLabel, { color: c.textTertiary }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: valueColor ?? c.text }]}>{value}</Text>
      {hint && <Text style={[styles.kpiHint, { color: c.textTertiary }]}>{hint}</Text>}
    </View>
  );
}

function BarItem({ label, amount, pct, total, color, c }: {
  label: string; amount: string; pct: number; total: number; color: string; c: any;
}) {
  const w = total > 0 ? Math.max(8, (pct / total) * 100) : 0;
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[styles.barLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.barAmount, { color }]}>{amount}</Text>
      <View style={[styles.barTrack, { backgroundColor: c.separator }]}>
        <View style={[styles.barFill, { backgroundColor: color, width: `${w}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  scroll:      { padding: 16, gap: 12 },

  filterRow:   { flexDirection: "row", gap: 8 },
  filterBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  filterText:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  empty:       { borderRadius: 14, padding: 32, alignItems: "center", gap: 10, marginTop: 20 },
  emptyText:   { textAlign: "center", fontSize: 13, lineHeight: 19 },

  heroCard:    { borderRadius: 14, padding: 18, gap: 4 },
  heroLabel:   { fontSize: 12 },
  heroAmount:  { fontSize: 28, fontFamily: "Inter_700Bold" },
  heroSub:     { fontSize: 12, marginTop: 4 },

  kpiRow:      { flexDirection: "row", gap: 8 },
  kpiCard:     { flex: 1, borderRadius: 12, padding: 12, gap: 4 },
  kpiLabel:    { fontSize: 11 },
  kpiValue:    { fontSize: 18, fontFamily: "Inter_700Bold" },
  kpiHint:     { fontSize: 9 },

  card:        { borderRadius: 14, padding: 14, gap: 10 },
  cardTitle:   { fontSize: 14, fontFamily: "Inter_700Bold" },

  barRow:      { flexDirection: "row", gap: 14 },
  barLabel:    { fontSize: 11 },
  barAmount:   { fontSize: 14, fontFamily: "Inter_700Bold" },
  barTrack:    { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  barFill:     { height: "100%", borderRadius: 3 },
  helperText:  { fontSize: 11, lineHeight: 16, marginTop: 4 },

  catRow:      {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  catDot:      { width: 8, height: 8, borderRadius: 4 },
  catName:     { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  catSub:      { fontSize: 11, marginTop: 1 },
  catPnl:      { fontSize: 13, fontFamily: "Inter_700Bold" },

  bigPct:      { fontSize: 28, fontFamily: "Inter_700Bold" },
  subTitle:    { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 8, marginBottom: 4 },
});
