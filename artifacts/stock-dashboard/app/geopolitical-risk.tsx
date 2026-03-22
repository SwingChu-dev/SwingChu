import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useMarketRisk, RiskLevel } from "@/hooks/useMarketRisk";
import { useWatchlist } from "@/context/WatchlistContext";
import { IMEC_MAP, IMEC_COLORS, ImecExposure } from "@/constants/imecData";

// ── 위험 수준별 색상 ─────────────────────────────────────────────────────────
const RISK_COLOR: Record<RiskLevel, string> = {
  낮음: "#2DB55D",
  보통: "#F59E0B",
  높음: "#FF6B00",
  위험: "#F04452",
};

// ── 게이지 바 ────────────────────────────────────────────────────────────────
function ScoreGauge({ score, level }: { score: number; level: RiskLevel }) {
  const color = RISK_COLOR[level];
  return (
    <View style={gauge.wrap}>
      <View style={gauge.track}>
        <View style={[gauge.fill, { width: `${score}%` as any, backgroundColor: color }]} />
      </View>
      <View style={gauge.labels}>
        {(["낮음", "보통", "높음", "위험"] as RiskLevel[]).map((l) => (
          <Text key={l} style={[gauge.lbl, { color: RISK_COLOR[l], fontFamily: l === level ? "Inter_700Bold" : "Inter_400Regular" }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const gauge = StyleSheet.create({
  wrap:   { gap: 6 },
  track:  { height: 10, borderRadius: 5, backgroundColor: "#E5E7EB", overflow: "hidden" },
  fill:   { height: "100%", borderRadius: 5 },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  lbl:    { fontSize: 11 },
});

// ── 지표 행 ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={stat.row}>
      <Text style={[stat.lbl, { color: c.textSecondary }]}>{label}</Text>
      <View style={stat.right}>
        <Text style={[stat.val, { color: color ?? c.text }]}>{value}</Text>
        {sub && <Text style={[stat.sub, { color: c.textTertiary }]}>{sub}</Text>}
      </View>
    </View>
  );
}

const stat = StyleSheet.create({
  row:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  lbl:   { fontSize: 14, fontFamily: "Inter_400Regular" },
  right: { alignItems: "flex-end", gap: 2 },
  val:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sub:   { fontSize: 11, fontFamily: "Inter_400Regular" },
});

// ── IMEC 뱃지 ────────────────────────────────────────────────────────────────
function ImecBadge({ exposure }: { exposure: ImecExposure }) {
  const color = IMEC_COLORS[exposure];
  return (
    <View style={[imec.badge, { backgroundColor: color + "20" }]}>
      <Text style={[imec.txt, { color }]}>{exposure}</Text>
    </View>
  );
}

const imec = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  txt:   { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

export default function GeopoliticalRiskScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { data, loading, error, refresh } = useMarketRisk();
  const { watchlistStocks } = useWatchlist();

  // 관심 종목 + IMEC 매핑
  const imecStocks = useMemo(() =>
    watchlistStocks
      .map((s) => ({ stock: s, imec: IMEC_MAP[s.ticker] ?? null }))
      .filter((x) => x.imec !== null)
      .sort((a, b) => {
        const ord: Record<ImecExposure, number> = { 수혜: 0, 중립: 1, 소외: 2 };
        return ord[a.imec!.exposure] - ord[b.imec!.exposure];
      }),
  [watchlistStocks]);

  const fmt = (v: number, isChg = false) => {
    const pct = isChg ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : `${v.toFixed(2)}`;
    return pct;
  };

  const riskColor = data ? RISK_COLOR[data.level] : c.textSecondary;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>지경학적 리스크</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.tint} />}
      >
        {/* ── 리스크 스코어 ── */}
        <View style={[styles.card, { backgroundColor: c.card, marginTop: 12 }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>복합 위험도</Text>

          {loading && !data && (
            <ActivityIndicator color={c.tint} style={{ margin: 24 }} />
          )}
          {error && !data && (
            <Text style={[styles.errTxt, { color: c.textSecondary }]}>데이터 로드 실패 — 새로고침</Text>
          )}

          {data && (
            <>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreBig, { color: riskColor }]}>{data.score}</Text>
                <View style={[styles.levelBadge, { backgroundColor: riskColor + "20" }]}>
                  <Text style={[styles.levelTxt, { color: riskColor }]}>{data.level}</Text>
                </View>
              </View>
              <ScoreGauge score={data.score} level={data.level} />
              <Text style={[styles.recTxt, { color: c.text, marginTop: 14 }]}>
                {data.recommendation}
              </Text>
            </>
          )}
        </View>

        {/* ── 구성 지표 ── */}
        {data && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>구성 지표</Text>
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <StatRow
              label="VIX (공포지수)"
              value={data.components.vix.toFixed(2)}
              color={data.components.vix >= 30 ? "#F04452" : data.components.vix >= 20 ? "#FF6B00" : "#2DB55D"}
            />
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <StatRow
              label="WTI 유가"
              value={`$${data.components.oilPrice.toFixed(1)}`}
              sub={`전일대비 ${fmt(data.components.oil, true)}`}
              color={Math.abs(data.components.oil) >= 3 ? "#F04452" : c.text}
            />
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <StatRow
              label="금 (XAU/USD)"
              value={`$${data.components.goldPrice.toLocaleString()}`}
              sub={`전일대비 ${fmt(data.components.gold, true)}`}
              color={data.components.gold >= 1 ? "#FF6B00" : c.text}
            />
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <StatRow
              label="달러 인덱스 (DXY)"
              value={data.components.dxyLevel.toFixed(2)}
              sub={`전일대비 ${fmt(data.components.dxy, true)}`}
              color={data.components.dxy >= 1 ? "#FF6B00" : c.text}
            />
          </View>
        )}

        {/* ── 포트폴리오 권고 행동 ── */}
        {data && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>포트폴리오 권고</Text>
            {data.actions.map((action, i) => (
              <View key={i} style={styles.actionRow}>
                <View style={[styles.actionDot, { backgroundColor: riskColor }]} />
                <Text style={[styles.actionTxt, { color: c.text }]}>{action}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── IMEC 수혜/소외 분류 ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>IMEC 수혜 / 소외 분류</Text>
          <Text style={[styles.imecSub, { color: c.textSecondary }]}>
            인도-중동-유럽 물류 코리더 기반 섹터 노출도
          </Text>

          {imecStocks.length === 0 && (
            <Text style={[styles.emptyTxt, { color: c.textTertiary }]}>관심 종목 없음</Text>
          )}

          {imecStocks.map(({ stock, imec }, i) => (
            <React.Fragment key={stock.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: c.separator }]} />}
              <View style={styles.imecRow}>
                <View style={styles.imecLeft}>
                  <Text style={[styles.imecName, { color: c.text }]}>{stock.name}</Text>
                  <Text style={[styles.imecReason, { color: c.textSecondary }]} numberOfLines={2}>
                    {imec!.reason}
                  </Text>
                </View>
                <ImecBadge exposure={imec!.exposure} />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── 지경학적 리스크 해석 안내 ── */}
        <View style={[styles.noteCard, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}>
          <Ionicons name="information-circle-outline" size={16} color="#F59E0B" />
          <Text style={[styles.noteTxt, { color: c.textSecondary }]}>
            <Text style={{ fontFamily: "Inter_600SemiBold", color: c.text }}>위험도 산출 기준</Text>{"\n"}
            VIX(35%) + 유가 변화(30%) + 금 변화(20%) + 달러 강세(15%) 복합 계산.{"\n"}
            중동 분쟁·공급망 충격 시 유가 급등, 안전자산(금·달러) 동반 상승으로 위험도 상승.{"\n"}
            실시간 뉴스 키워드는 미반영, 가격 지표 기반 프록시 값임.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn:    { width: 40, height: 40, justifyContent: "center" },
  headerTitle:{ fontSize: 18, fontFamily: "Inter_700Bold" },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },
  scoreRow:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  scoreBig:   { fontSize: 52, fontFamily: "Inter_700Bold", lineHeight: 58 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  levelTxt:   { fontSize: 16, fontFamily: "Inter_700Bold" },
  recTxt:     { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 22 },
  divider:    { height: StyleSheet.hairlineWidth },
  actionRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 7 },
  actionDot:  { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  actionTxt:  { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, flex: 1 },
  imecSub:    { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10, marginTop: -4 },
  imecRow:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingVertical: 12 },
  imecLeft:   { flex: 1, gap: 3 },
  imecName:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  imecReason: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  emptyTxt:   { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  errTxt:     { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  noteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  noteTxt:    { fontSize: 12, flex: 1, lineHeight: 20 },
});
