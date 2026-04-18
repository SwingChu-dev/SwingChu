import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import { buildWeeklyReport, fetchWeeklyCoach, type CoachComment } from "@/services/weeklyReport";
import { CATEGORY_COLOR, CATEGORY_LABEL, SECTOR_LABEL } from "@/types/portfolio";
import { analyzePortfolio } from "@/services/portfolioAnalyzer";

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtMan(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`;
  if (Math.abs(n) >= 10_000)      return `${(n / 10_000).toFixed(1)}만`;
  return n.toLocaleString();
}

export default function WeeklyReportScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { portfolio, cooldownSaves, settings } = usePortfolio();

  const r = useMemo(
    () => buildWeeklyReport(portfolio, cooldownSaves),
    [portfolio, cooldownSaves],
  );
  const health = useMemo(
    () => analyzePortfolio(portfolio, settings.fxRateUSDKRW),
    [portfolio, settings.fxRateUSDKRW],
  );

  const [coach,        setCoach]        = useState<CoachComment | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError,   setCoachError]   = useState<string | null>(null);

  const loadCoach = async () => {
    setCoachLoading(true);
    setCoachError(null);
    try {
      const result = await fetchWeeklyCoach(r, portfolio, health.healthScore);
      setCoach(result);
    } catch (e: any) {
      setCoachError(e?.message ?? "AI 코치 호출 실패");
    } finally {
      setCoachLoading(false);
    }
  };

  useEffect(() => {
    loadCoach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>주간 리포트</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.periodCard, { backgroundColor: c.card }]}>
          <Text style={[styles.periodLabel, { color: c.textSecondary }]}>기간</Text>
          <Text style={[styles.periodValue, { color: c.text }]}>
            {fmtDate(r.period.from)} ~ {fmtDate(r.period.to)}
          </Text>
        </View>

        {/* AI 코치 코멘트 */}
        <View style={[styles.coachCard, { backgroundColor: c.card, borderColor: c.tint + "44" }]}>
          <View style={styles.coachHeader}>
            <Ionicons name="sparkles" size={16} color={c.tint} />
            <Text style={[styles.coachTitle, { color: c.text }]}>AI 코치 코멘트</Text>
            {!coachLoading && (
              <TouchableOpacity onPress={loadCoach} style={{ marginLeft: "auto" }}>
                <Ionicons name="refresh" size={16} color={c.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {coachLoading && (
            <View style={styles.coachLoading}>
              <ActivityIndicator size="small" color={c.tint} />
              <Text style={[styles.coachLoadingText, { color: c.textSecondary }]}>
                Gemini가 이번 주를 분석 중...
              </Text>
            </View>
          )}

          {coachError && !coachLoading && (
            <Text style={[styles.coachError, { color: "#F04452" }]}>
              {coachError}
            </Text>
          )}

          {coach && !coachLoading && (
            <View style={{ gap: 10 }}>
              {coach.praise ? (
                <View>
                  <Text style={[styles.coachLabel, { color: "#22C55E" }]}>👍 잘한 점</Text>
                  <Text style={[styles.coachText, { color: c.text }]}>{coach.praise}</Text>
                </View>
              ) : null}
              {coach.warning ? (
                <View>
                  <Text style={[styles.coachLabel, { color: "#F59E0B" }]}>⚠ 위험 신호</Text>
                  <Text style={[styles.coachText, { color: c.text }]}>{coach.warning}</Text>
                </View>
              ) : null}
              {coach.nextWeek.length > 0 && (
                <View>
                  <Text style={[styles.coachLabel, { color: c.tint }]}>📌 다음 주 가이드</Text>
                  {coach.nextWeek.map((g, i) => (
                    <Text key={i} style={[styles.coachText, { color: c.text }]}>
                      · {g}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* 핵심 수치 4분할 */}
        <View style={styles.statsGrid}>
          <StatCell c={c} label="신규 진입"    value={`${r.newPositions.length}건`} />
          <StatCell c={c} label="뇌동 차단"    value={`${r.cooldownSaves.length}건`} accent="#22C55E" />
          <StatCell c={c} label="손절 알림"    value={`${r.firedStopLossCount}회`} accent={r.firedStopLossCount > 0 ? "#F04452" : undefined} />
          <StatCell c={c} label="익절 알림"    value={`${r.firedTakeProfitCount}회`} accent={r.firedTakeProfitCount > 0 ? "#22C55E" : undefined} />
        </View>

        {r.totalSavedKRW > 0 && (
          <View style={[styles.savedCard, { backgroundColor: "#22C55E22", borderColor: "#22C55E55" }]}>
            <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.savedLabel, { color: c.textSecondary }]}>추정 절약 손실</Text>
              <Text style={[styles.savedValue, { color: "#22C55E" }]}>
                약 {fmtMan(r.totalSavedKRW)}원
              </Text>
            </View>
          </View>
        )}

        {/* 하이라이트 */}
        {r.highlights.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>이번 주 잘한 점</Text>
            {r.highlights.map((h, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: "#22C55E" }]}>✓</Text>
                <Text style={[styles.bulletText, { color: c.text }]}>{h}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 경고 */}
        {r.warnings.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>점검 필요</Text>
            {r.warnings.map((w, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: "#F59E0B" }]}>!</Text>
                <Text style={[styles.bulletText, { color: c.text }]}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 신규 진입 */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            신규 진입 ({r.newPositions.length})
          </Text>
          {r.newPositions.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textTertiary }]}>없음</Text>
          ) : r.newPositions.map(p => (
            <View key={p.id} style={[styles.posRow, { borderBottomColor: c.separator }]}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_COLOR[p.category] }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.posTicker, { color: c.text }]}>
                  {p.ticker.toUpperCase()} · {p.name}
                </Text>
                <Text style={[styles.posMeta, { color: c.textTertiary }]}>
                  {CATEGORY_LABEL[p.category]} · {fmtDate(p.entryDate)}
                  {p.isImpulseBuy ? " · ⚠︎ 뇌동" : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 뇌동 방지 사례 */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            뇌동 방지 사례 ({r.cooldownSaves.length})
          </Text>
          {r.cooldownSaves.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textTertiary }]}>없음</Text>
          ) : r.cooldownSaves.map(s => (
            <View key={s.id} style={[styles.saveRow, { borderBottomColor: c.separator }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.saveTicker, { color: c.text }]}>
                  {s.ticker.toUpperCase()} · 목표 {fmtMan(s.targetAmount)}원
                </Text>
                <Text style={[styles.saveReason, { color: c.textSecondary }]}>
                  {s.cancelReason}
                </Text>
              </View>
              {s.estimatedSaved != null && s.estimatedSaved > 0 && (
                <Text style={[styles.savedAmt, { color: "#22C55E" }]}>
                  -{fmtMan(s.estimatedSaved)}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* 카테고리 비중 */}
        {r.topCategories.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>카테고리 비중</Text>
            {r.topCategories.map(t => (
              <View key={t.category} style={styles.allocRow}>
                <View style={[styles.catDot, { backgroundColor: CATEGORY_COLOR[t.category] }]} />
                <Text style={[styles.allocLabel, { color: c.text, flex: 1 }]}>{t.label}</Text>
                <Text style={[styles.allocPct, { color: c.textSecondary }]}>
                  {t.pct.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 섹터 비중 */}
        {r.topSectors.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>섹터 집중도 Top 5</Text>
            {r.topSectors.map(t => (
              <View key={t.sector} style={styles.allocRow}>
                <Text style={[styles.allocLabel, { color: c.text, flex: 1 }]}>{t.label}</Text>
                <Text style={[styles.allocPct, { color: c.textSecondary }]}>
                  {t.pct.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCell({
  c, label, value, accent,
}: { c: any; label: string; value: string; accent?: string }) {
  return (
    <View style={[styles.statCell, { backgroundColor: c.card }]}>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent ?? c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle:  { fontSize: 17, fontFamily: "Inter_700Bold" },

  scroll:       { padding: 16, gap: 12 },

  periodCard:   { borderRadius: 12, padding: 14, gap: 4 },
  periodLabel:  { fontSize: 11, fontFamily: "Inter_500Medium" },
  periodValue:  { fontSize: 16, fontFamily: "Inter_700Bold" },

  statsGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell:     {
    flexBasis: "47%", flexGrow: 1,
    borderRadius: 12, padding: 14, gap: 4,
  },
  statLabel:    { fontSize: 11, fontFamily: "Inter_500Medium" },
  statValue:    { fontSize: 20, fontFamily: "Inter_700Bold" },

  savedCard:    {
    flexDirection: "row", gap: 10, alignItems: "center",
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  savedLabel:   { fontSize: 11, fontFamily: "Inter_500Medium" },
  savedValue:   { fontSize: 18, fontFamily: "Inter_700Bold" },

  section:      { borderRadius: 12, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },

  bulletRow:    { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet:       { fontSize: 14, fontFamily: "Inter_700Bold", width: 14 },
  bulletText:   { fontSize: 13, lineHeight: 19, flex: 1 },

  emptyText:    { fontSize: 12, fontStyle: "italic" },

  posRow:       {
    flexDirection: "row", gap: 8, alignItems: "center",
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catDot:       { width: 8, height: 8, borderRadius: 4 },
  posTicker:    { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  posMeta:      { fontSize: 11, marginTop: 2 },

  saveRow:      {
    flexDirection: "row", gap: 8, alignItems: "center",
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  saveTicker:   { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveReason:   { fontSize: 12, marginTop: 2 },
  savedAmt:     { fontSize: 13, fontFamily: "Inter_700Bold" },

  allocRow:     {
    flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4,
  },
  allocLabel:   { fontSize: 13 },
  allocPct:     { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  coachCard:        {
    borderRadius: 12, padding: 14, gap: 10, borderWidth: 1,
  },
  coachHeader:      { flexDirection: "row", alignItems: "center", gap: 6 },
  coachTitle:       { fontSize: 14, fontFamily: "Inter_700Bold" },
  coachLoading:     { flexDirection: "row", gap: 8, alignItems: "center", paddingVertical: 12 },
  coachLoadingText: { fontSize: 12 },
  coachError:       { fontSize: 12 },
  coachLabel:       { fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 4 },
  coachText:        { fontSize: 13, lineHeight: 19 },
});
