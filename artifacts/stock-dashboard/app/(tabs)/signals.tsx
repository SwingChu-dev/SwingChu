import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useSignals } from "@/context/SignalContext";
import { SIGNAL_META, STRENGTH_META, SmartMoneySignal } from "@/constants/smartMoney";

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 60000;
  if (diff < 60) return `${Math.round(diff)}분 전`;
  if (diff < 1440) return `${Math.round(diff / 60)}시간 전`;
  return `${Math.round(diff / 1440)}일 전`;
}

function SignalCard({ sig, isDark, c }: { sig: SmartMoneySignal; isDark: boolean; c: any }) {
  const meta = SIGNAL_META[sig.type];
  const strength = STRENGTH_META[sig.strength];
  const isEntry = sig.type === "세력진입" || sig.type === "매집중";
  const accentColor = isEntry ? "#F04452" : "#1B63E8";
  const bgColor = isDark
    ? isEntry ? "rgba(240,68,82,0.08)" : "rgba(27,99,232,0.08)"
    : isEntry ? "#FEF8F8" : "#F0F5FF";

  return (
    <TouchableOpacity
      style={[styles.sigCard, { backgroundColor: c.card }]}
      onPress={() => router.push({ pathname: "/stock/[id]", params: { id: sig.stockId } })}
      activeOpacity={0.7}
    >
      {/* Top row */}
      <View style={styles.sigTop}>
        <View style={styles.sigTopLeft}>
          <View style={[styles.sigTypePill, { backgroundColor: bgColor }]}>
            <Ionicons name={meta.icon as any} size={12} color={accentColor} />
            <Text style={[styles.sigTypeText, { color: accentColor }]}>{sig.type}</Text>
            <View style={[styles.strengthDot, { backgroundColor: strength.color }]} />
            <Text style={[styles.strengthText, { color: strength.color }]}>
              {sig.strength}
            </Text>
          </View>
          {sig.isNew && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sigTime, { color: c.textTertiary }]}>
          {timeAgo(sig.detectedAt)}
        </Text>
      </View>

      {/* Stock name */}
      <View style={styles.sigNameRow}>
        <Text style={[styles.sigStockName, { color: c.text }]}>{sig.stockName}</Text>
        <Text style={[styles.sigTicker, { color: c.textSecondary }]}>{sig.ticker}</Text>
      </View>

      {/* Summary */}
      <Text style={[styles.sigSummary, { color: c.textSecondary }]} numberOfLines={2}>
        {sig.summary}
      </Text>

      {/* Metrics */}
      <View style={[styles.metricsRow, { borderTopColor: c.separator }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: isEntry ? "#F04452" : "#1B63E8" }]}>
            {sig.volumeRatio.toFixed(1)}×
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>거래량</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text
            style={[
              styles.metricVal,
              { color: sig.institutionalNet >= 0 ? "#F04452" : "#1B63E8" },
            ]}
          >
            {sig.institutionalNet >= 0 ? "+" : ""}
            {(sig.institutionalNet / 100).toFixed(0)}억
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>기관</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text
            style={[
              styles.metricVal,
              { color: sig.foreignerNet >= 0 ? "#F04452" : "#1B63E8" },
            ]}
          >
            {sig.foreignerNet >= 0 ? "+" : ""}
            {(sig.foreignerNet / 100).toFixed(0)}억
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>외국인</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: c.textSecondary }]}>
            {sig.priceVsSupport.toFixed(0)}%
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>지지선↑</Text>
        </View>
      </View>

      {/* Signal tags */}
      <View style={styles.sigTags}>
        {sig.signals.slice(0, 3).map((s) => (
          <View key={s} style={[styles.sigTag, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
            <Text style={[styles.sigTagText, { color: c.textSecondary }]}>{s}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

export default function SignalsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { signals, newCount, markAllSeen } = useSignals();

  useEffect(() => {
    const timer = setTimeout(() => markAllSeen(), 1500);
    return () => clearTimeout(timer);
  }, []);

  const newSignals = signals.filter((s) => s.isNew);
  const oldSignals = signals.filter((s) => !s.isNew);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>세력 감지</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            기관·외국인 이상 매매 포착 시스템
          </Text>
        </View>
        {newCount > 0 && (
          <View style={[styles.newCountBadge, { backgroundColor: "#F04452" }]}>
            <Text style={styles.newCountText}>신규 {newCount}건</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* How it works */}
        <View style={[styles.infoCard, { backgroundColor: c.card }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={16} color={c.tint} />
            <Text style={[styles.infoText, { color: c.textSecondary }]}>
              거래량 급증·기관/외국인 순매수 패턴으로 세력 진입/이탈을 감지합니다. 투자 참고용이며 확정 신호가 아닙니다.
            </Text>
          </View>
        </View>

        {newSignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#F04452" }]} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>새로운 신호</Text>
            </View>
            {newSignals.map((sig) => (
              <SignalCard key={sig.id} sig={sig} isDark={isDark} c={c} />
            ))}
          </View>
        )}

        {oldSignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>이전 신호</Text>
            </View>
            {oldSignals.map((sig) => (
              <SignalCard key={sig.id} sig={sig} isDark={isDark} c={c} />
            ))}
          </View>
        )}

        {signals.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="eye-off-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>감지된 신호 없음</Text>
            <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
              이상 매매 패턴 감지 시 여기에 표시됩니다
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  newCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  newCountText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sigCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sigTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sigTopLeft: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  sigTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sigTypeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  strengthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 2,
  },
  strengthText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  newPill: {
    backgroundColor: "#F04452",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newPillText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  sigTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  sigNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sigStockName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  sigTicker: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sigSummary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  metricVal: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  metricLbl: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  sigTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sigTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sigTagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
