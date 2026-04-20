import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { usePortfolioMarket } from "@/hooks/usePortfolioMarket";
import { analyzePortfolio } from "@/services/portfolioAnalyzer";
import {
  CATEGORY_LABEL, CATEGORY_COLOR, SECTOR_LABEL, Category, Sector,
} from "@/types/portfolio";
import { CATEGORY_LIMITS, SECTOR_LIMITS } from "@/constants/rules";
import AllocationBar from "@/components/portfolio/AllocationBar";
import HealthScoreCard from "@/components/portfolio/HealthScoreCard";

const SECTOR_COLORS: Partial<Record<Sector, string>> = {
  SEMICONDUCTOR: "#3478F6",
  ENERGY:        "#FF6B00",
  DEFENSE:       "#8E44AD",
  SHIPBUILDING:  "#0E7490",
  NUCLEAR:       "#22C55E",
  BIGTECH_AI:    "#E11D48",
  QUANTUM:       "#A855F7",
  MICROCAP:      "#71717A",
  POWER_INFRA:   "#F59E0B",
  BATTERY:       "#10B981",
  AUTO:          "#6366F1",
  INSURANCE:     "#0891B2",
};

function fmtKRW(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 100_000_000) return `${sign}${(a / 100_000_000).toFixed(2)}억`;
  if (a >= 10_000)      return `${sign}${(a / 10_000).toFixed(1)}만`;
  return `${sign}${Math.round(a).toLocaleString()}`;
}

export default function PortfolioScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { portfolio, pendingEntries, cooldownSaves, settings } = usePortfolio();
  const { lastUpdate } = useStockPrice();
  const market = usePortfolioMarket();

  const health = useMemo(
    () => analyzePortfolio(portfolio, market.fxRate),
    [portfolio, market.fxRate],
  );

  const pnlColor = market.totalPnLKRW > 0 ? "#FF3B30"
                : market.totalPnLKRW < 0 ? "#3478F6"
                : c.textSecondary;

  const categorySegments = useMemo(() => CATEGORY_LIMITS.map((cl) => ({
    key:   cl.category,
    label: CATEGORY_LABEL[cl.category],
    value: portfolio.categoryAllocation[cl.category] ?? 0,
    color: CATEGORY_COLOR[cl.category],
    hint:  `목표 ${cl.targetAllocation}%`,
  })), [portfolio.categoryAllocation]);

  const sectorSegments = useMemo(() => {
    const entries = Object.entries(portfolio.sectorAllocation)
      .filter(([, v]) => (v as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    return entries.map(([sector, value]) => {
      const lim = SECTOR_LIMITS.find(s => s.sector === sector as Sector);
      return {
        key:   sector,
        label: SECTOR_LABEL[sector as Sector] ?? sector,
        value: value as number,
        color: SECTOR_COLORS[sector as Sector] ?? "#888",
        hint:  lim ? `상한 ${lim.maxAllocation}%` : undefined,
      };
    });
  }, [portfolio.sectorAllocation]);

  const activePending = pendingEntries.filter(p => p.status === "PENDING");

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.separator }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>포트폴리오</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            총 자산 {fmtKRW(market.totalAssetKRW)}원 · 보유 {market.positions.length}종목
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: isDark ? "#2A2A2C" : "#E5E5EA" }]}
            onPress={() => router.push("/weekly-report")}
          >
            <Ionicons name="document-text-outline" size={16} color={c.text} />
            <Text style={[styles.addBtnText, { color: c.text }]}>주간</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: c.tint }]}
            onPress={() => router.push("/positions")}
          >
            <Ionicons name="settings-outline" size={16} color="#fff" />
            <Text style={styles.addBtnText}>보유 관리</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 평가금액 + 평가손익 (토스식) */}
        <View style={[styles.heroCard, { backgroundColor: c.card }]}>
          <Text style={[styles.heroLabel, { color: c.textSecondary }]}>내 투자 평가금액</Text>
          <Text style={[styles.heroValue, { color: c.text }]}>
            {fmtKRW(market.positionsValueKRW)}원
          </Text>
          <View style={styles.heroPnlRow}>
            <Text style={[styles.heroPnlText, { color: pnlColor }]}>
              {market.totalPnLKRW >= 0 ? "+" : ""}{fmtKRW(market.totalPnLKRW)}원
            </Text>
            <Text style={[styles.heroPnlPct, { color: pnlColor }]}>
              ({market.totalPnLPercent >= 0 ? "+" : ""}{market.totalPnLPercent.toFixed(2)}%)
            </Text>
          </View>
          {lastUpdate && (
            <Text style={[styles.heroUpdated, { color: c.textTertiary }]}>
              실시간 · {new Date(lastUpdate).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 갱신
              {" · "}USD/KRW {market.fxRate.toLocaleString()}원
            </Text>
          )}
        </View>

        {/* 원화/달러 잔고 카드 */}
        <View style={styles.cashRow}>
          <View style={[styles.cashCard, { backgroundColor: c.card }]}>
            <View style={styles.cashHead}>
              <Text style={[styles.cashFlag]}>🇰🇷</Text>
              <Text style={[styles.cashLabel, { color: c.textSecondary }]}>원화 잔고</Text>
            </View>
            <Text style={[styles.cashValue, { color: c.text }]}>
              {Math.round(market.cashKRW).toLocaleString()}원
            </Text>
          </View>
          <View style={[styles.cashCard, { backgroundColor: c.card }]}>
            <View style={styles.cashHead}>
              <Text style={[styles.cashFlag]}>🇺🇸</Text>
              <Text style={[styles.cashLabel, { color: c.textSecondary }]}>달러 잔고</Text>
            </View>
            <Text style={[styles.cashValue, { color: c.text }]}>
              ${market.cashUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.cashSub, { color: c.textTertiary }]}>
              ≈ {fmtKRW(market.cashUSDinKRW)}원
            </Text>
          </View>
        </View>

        {/* 보유 종목 라이브 카드 */}
        {market.positions.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>보유 종목</Text>
            {market.positions.map((m) => {
              const col = m.unrealizedPnLKRW > 0 ? "#FF3B30"
                       : m.unrealizedPnLKRW < 0 ? "#3478F6" : c.textSecondary;
              return (
                <View key={m.position.id} style={[styles.posRow, { borderTopColor: c.separator }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.posTicker, { color: c.text }]}>
                      {m.position.ticker.toUpperCase()}
                      <Text style={[styles.posQty, { color: c.textTertiary }]}>  {m.position.quantity}주</Text>
                    </Text>
                    <Text style={[styles.posName, { color: c.textSecondary }]} numberOfLines={1}>
                      {m.position.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.posValue, { color: c.text }]}>
                      {fmtKRW(m.marketValueKRW)}원
                    </Text>
                    <Text style={[styles.posPnl, { color: col }]}>
                      {m.unrealizedPnLKRW >= 0 ? "+" : ""}{fmtKRW(m.unrealizedPnLKRW)}원
                      {" "}({m.pnlPercent >= 0 ? "+" : ""}{m.pnlPercent.toFixed(2)}%)
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 헬스 스코어 */}
        <HealthScoreCard health={health} />

        {/* 카테고리 비중 */}
        <AllocationBar
          title="카테고리 비중"
          subtitle="A 코어 60% / B 이벤트 20% / C 역발상 12% / D 투기 5% 가이드"
          segments={categorySegments}
        />

        {/* 섹터 집중도 */}
        <AllocationBar
          title="섹터 집중도"
          subtitle="섹터별 상한 초과 시 신규 진입이 차단됩니다"
          segments={sectorSegments}
        />

        {/* 매수 플로우 진입 */}
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: c.tint }]}
          onPress={() => router.push("/buy")}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.ctaText}>새 매수 플로우 시작</Text>
        </TouchableOpacity>

        {/* 쿨다운 진행 중 */}
        {activePending.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>쿨다운 진행 중</Text>
            {activePending.map((p) => {
              const remainMs = p.cooldownUntil - Date.now();
              const remainH  = Math.max(0, Math.ceil(remainMs / 3_600_000));
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pendingRow, { borderTopColor: c.separator }]}
                  onPress={() => router.push(`/cooldown/${p.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pendingTicker, { color: c.text }]}>
                      {p.request.name} ({p.request.ticker.toUpperCase()})
                    </Text>
                    <Text style={[styles.pendingMeta, { color: c.textSecondary }]}>
                      목표 {p.request.targetAmount.toLocaleString()}원 · {CATEGORY_LABEL[p.request.category as Category]}
                    </Text>
                  </View>
                  <Text style={[styles.pendingRemain, {
                    color: remainH <= 0 ? "#22C55E" : "#F59E0B",
                  }]}>
                    {remainH <= 0 ? "진행 가능" : `${remainH}h 남음`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 뇌동 방지 성공 사례 */}
        {cooldownSaves.length > 0 && (
          <View style={[styles.section, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>
              뇌동 방지 성공 {cooldownSaves.length}건
            </Text>
            {cooldownSaves.slice(0, 5).map((s) => (
              <View key={s.id} style={[styles.saveRow, { borderTopColor: c.separator }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.saveTicker, { color: c.text }]}>
                    {s.ticker.toUpperCase()} · {s.targetAmount.toLocaleString()}원 회피
                  </Text>
                  <Text style={[styles.saveReason, { color: c.textSecondary }]} numberOfLines={2}>
                    {s.cancelReason}
                  </Text>
                </View>
                <Ionicons name="shield-checkmark" size={18} color="#22C55E" />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        {
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  headerTitle:   { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerSub:     { fontSize: 13, marginTop: 2 },
  addBtn:        {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  addBtnText:    { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },

  scroll:        { padding: 16, gap: 12 },

  heroCard:      { borderRadius: 16, padding: 18, gap: 4 },
  heroLabel:     { fontSize: 12, fontFamily: "Inter_500Medium" },
  heroValue:     { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 4 },
  heroPnlRow:    { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
  heroPnlText:   { fontSize: 16, fontFamily: "Inter_700Bold" },
  heroPnlPct:    { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  heroUpdated:   { fontSize: 11, marginTop: 8 },

  cashRow:       { flexDirection: "row", gap: 10 },
  cashCard:      { flex: 1, borderRadius: 14, padding: 14, gap: 4 },
  cashHead:      { flexDirection: "row", alignItems: "center", gap: 6 },
  cashFlag:      { fontSize: 16 },
  cashLabel:     { fontSize: 12, fontFamily: "Inter_500Medium" },
  cashValue:     { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  cashSub:       { fontSize: 11, marginTop: 2 },

  posRow:        {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  posTicker:     { fontSize: 14, fontFamily: "Inter_700Bold" },
  posQty:        { fontSize: 12, fontFamily: "Inter_500Medium" },
  posName:       { fontSize: 11, marginTop: 2 },
  posValue:      { fontSize: 14, fontFamily: "Inter_700Bold" },
  posPnl:        { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },

  cta:           {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 12,
  },
  ctaText:       { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  section:       { borderRadius: 14, padding: 16, gap: 4 },
  sectionTitle:  { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 8 },

  pendingRow:    {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  pendingTicker: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pendingMeta:   { fontSize: 11, marginTop: 2 },
  pendingRemain: { fontSize: 13, fontFamily: "Inter_700Bold" },

  saveRow:       {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveTicker:    { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveReason:    { fontSize: 11, marginTop: 2 },
});
