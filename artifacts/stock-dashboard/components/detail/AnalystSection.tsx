import React from "react";
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { USD_KRW_RATE } from "@/constants/stockData";
import { useAnalyst } from "@/hooks/useAnalyst";

interface Props {
  ticker:        string;
  market:        string;
  currentPriceKRW: number;
}

const CONSENSUS_COLOR: Record<string, string> = {
  "Strong Buy":  "#10B981",
  "Buy":         "#22C55E",
  "Hold":        "#F59E0B",
  "Sell":        "#F97316",
  "Strong Sell": "#EF4444",
};

const CONSENSUS_KR: Record<string, string> = {
  "Strong Buy":  "강력 매수",
  "Buy":         "매수",
  "Hold":        "유지",
  "Sell":        "매도",
  "Strong Sell": "강력 매도",
};

export default function AnalystSection({ ticker, market, currentPriceKRW }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { data, loading } = useAnalyst(ticker, market);

  if (loading && !data) {
    return (
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <ActivityIndicator size="small" color={c.textTertiary} />
        <Text style={[styles.muted, { color: c.textTertiary }]}>애널리스트 컨센서스 로딩 중…</Text>
      </View>
    );
  }
  if (!data || (!data.recommendation && !data.priceTarget)) {
    return (
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Ionicons name="information-circle-outline" size={16} color={c.textTertiary} />
        <Text style={[styles.muted, { color: c.textTertiary }]}>
          {market === "NASDAQ" || market === "NYSE"
            ? "애널리스트 컨센서스 데이터가 없습니다"
            : "한국 종목은 애널리스트 컨센서스가 제공되지 않습니다"}
        </Text>
      </View>
    );
  }

  const isUSD = market === "NASDAQ" || market === "NYSE";
  const rec = data.recommendation;
  const pt  = data.priceTarget;

  // 가격 비교: targetMean (USD) vs 현재가 (USD)
  const currentInUsd = isUSD ? currentPriceKRW / USD_KRW_RATE : currentPriceKRW;
  const upsidePct = pt?.targetMean && currentInUsd
    ? ((pt.targetMean - currentInUsd) / currentInUsd) * 100
    : null;

  const fmtPrice = (v: number) => isUSD ? `$${v.toFixed(2)}` : `₩${Math.round(v).toLocaleString()}`;

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.header}>
        <Ionicons name="people-outline" size={15} color={c.text} />
        <Text style={[styles.title, { color: c.text }]}>애널리스트 컨센서스</Text>
        {rec && (
          <View style={[styles.consensusBadge, { backgroundColor: (CONSENSUS_COLOR[rec.consensusLabel ?? ""] ?? "#94A3B8") + "22" }]}>
            <Text style={[styles.consensusText, { color: CONSENSUS_COLOR[rec.consensusLabel ?? ""] ?? "#94A3B8" }]}>
              {CONSENSUS_KR[rec.consensusLabel ?? ""] ?? "—"}
            </Text>
          </View>
        )}
      </View>

      {rec && rec.total > 0 && (
        <View style={styles.recBlock}>
          <View style={styles.barRow}>
            {(["strongBuy", "buy", "hold", "sell", "strongSell"] as const).map((k) => {
              const colors = { strongBuy: "#10B981", buy: "#22C55E", hold: "#F59E0B", sell: "#F97316", strongSell: "#EF4444" };
              const v = rec[k];
              if (v <= 0) return null;
              const pct = (v / rec.total) * 100;
              return (
                <View key={k} style={{ flex: pct, height: 8, backgroundColor: colors[k], borderRadius: 2, marginHorizontal: 1 }} />
              );
            })}
          </View>
          <View style={styles.recCounts}>
            <Text style={[styles.recCount, { color: c.textSecondary }]}>
              총 {rec.total}명 · 강력매수 {rec.strongBuy} · 매수 {rec.buy} · 유지 {rec.hold} · 매도 {rec.sell + rec.strongSell}
            </Text>
          </View>
        </View>
      )}

      {pt && pt.targetMean && (
        <View style={[styles.ptBlock, { borderTopColor: c.separator }]}>
          <View style={styles.ptRow}>
            <Text style={[styles.ptLabel, { color: c.textTertiary }]}>평균 목표가</Text>
            <Text style={[styles.ptValue, { color: c.text }]}>{fmtPrice(pt.targetMean)}</Text>
          </View>
          {upsidePct != null && (
            <View style={styles.ptRow}>
              <Text style={[styles.ptLabel, { color: c.textTertiary }]}>현재가 대비</Text>
              <Text style={[styles.ptValue, { color: upsidePct >= 0 ? c.positive : c.negative }]}>
                {upsidePct >= 0 ? "+" : ""}{upsidePct.toFixed(1)}%
              </Text>
            </View>
          )}
          {pt.targetHigh && pt.targetLow && (
            <View style={styles.ptRow}>
              <Text style={[styles.ptLabel, { color: c.textTertiary }]}>목표가 범위</Text>
              <Text style={[styles.ptRange, { color: c.textSecondary }]}>
                {fmtPrice(pt.targetLow)} ~ {fmtPrice(pt.targetHigh)}
              </Text>
            </View>
          )}
          {pt.numberOfAnalysts != null && pt.numberOfAnalysts > 0 && (
            <Text style={[styles.ptFoot, { color: c.textTertiary }]}>
              {pt.numberOfAnalysts}명 애널리스트 기준
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:     { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 14 },
  header:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  title:    { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  muted:    { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 8 },
  consensusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  consensusText:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  recBlock: { marginBottom: 10 },
  barRow:   { flexDirection: "row", marginBottom: 6 },
  recCounts:{ },
  recCount: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14 },
  ptBlock:  { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  ptRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  ptLabel:  { fontSize: 11, fontFamily: "Inter_500Medium" },
  ptValue:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ptRange:  { fontSize: 12, fontFamily: "Inter_500Medium" },
  ptFoot:   { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
});
