import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface DayData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface BacktestResult {
  entryDate: string;
  entry1Price: number;
  entry2Price: number;
  entry3Price: number;
  exit1Price: number;
  exit2Price: number;
  exit3Price: number;
  entry1Pct: number;
  entry2Pct: number;
  entry3Pct: number;
  totalReturn: number;
  maxDrawdown: number;
  hitRate: number;
  tradeCount: number;
  startPrice: number;
  endPrice: number;
  periodReturn: number;
}

const PERIODS = ["1mo", "3mo", "6mo", "1y"] as const;
const PERIOD_LABELS: Record<typeof PERIODS[number], string> = {
  "1mo": "1개월",
  "3mo": "3개월",
  "6mo": "6개월",
  "1y": "1년",
};

function runBacktest(data: DayData[], stock: StockInfo): BacktestResult | null {
  if (data.length < 10) return null;

  const startPrice = data[0].close;
  const endPrice = data[data.length - 1].close;
  const periodReturn = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  const e1 = stock.splitEntries[0]?.dropPercent ?? 8;
  const e2 = stock.splitEntries[1]?.dropPercent ?? 15;
  const e3 = stock.splitEntries[2]?.dropPercent ?? 25;

  const pt1 = stock.profitTargets[0]?.percent ?? 5;
  const pt2 = stock.profitTargets[1]?.percent ?? 10;
  const pt3 = stock.profitTargets[2]?.percent ?? 20;

  let wins = 0;
  let tradeCount = 0;
  let totalReturn = 0;
  let maxDrawdown = 0;

  for (let i = 5; i < data.length - 5; i++) {
    const refHigh = Math.max(...data.slice(Math.max(0, i - 10), i).map((d) => d.high));
    const cur = data[i].close;
    const dropFromHigh = refHigh > 0 ? ((cur - refHigh) / refHigh) * 100 : 0;

    if (dropFromHigh <= -e2) {
      tradeCount++;
      const avgEntry =
        0.3 * cur * (1 - e1 / 100) +
        0.3 * cur * (1 - e2 / 100) +
        0.4 * cur * (1 - e3 / 100);

      const future = data.slice(i + 1, Math.min(i + 30, data.length));
      const peak = future.reduce((m, d) => Math.max(m, d.high), 0);
      const trough = future.reduce((m, d) => Math.min(m, d.low), cur);

      const gain = peak > 0 ? ((peak - avgEntry) / avgEntry) * 100 : 0;
      const dd = ((trough - avgEntry) / avgEntry) * 100;

      if (dd < maxDrawdown) maxDrawdown = dd;

      const wouldHit = gain >= pt1;
      if (wouldHit) {
        wins++;
        const blended =
          0.3 * pt1 + 0.3 * Math.min(gain, pt2) + 0.4 * Math.min(gain, pt3);
        totalReturn += blended;
      } else {
        totalReturn += dd;
      }
    }
  }

  const hitRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;

  return {
    entryDate: data[0].date,
    entry1Price: Math.round(endPrice * (1 - e1 / 100)),
    entry2Price: Math.round(endPrice * (1 - e2 / 100)),
    entry3Price: Math.round(endPrice * (1 - e3 / 100)),
    exit1Price: Math.round(endPrice * (1 + pt1 / 100)),
    exit2Price: Math.round(endPrice * (1 + pt2 / 100)),
    exit3Price: Math.round(endPrice * (1 + pt3 / 100)),
    entry1Pct: -e1,
    entry2Pct: -e2,
    entry3Pct: -e3,
    totalReturn: tradeCount > 0 ? totalReturn / tradeCount : 0,
    maxDrawdown,
    hitRate,
    tradeCount,
    startPrice,
    endPrice,
    periodReturn,
  };
}

interface Props {
  stock: StockInfo;
}

export default function BacktestSection({ stock }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [period, setPeriod] = useState<typeof PERIODS[number]>("6mo");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState(false);

  const runTest = useCallback(
    (p: typeof PERIODS[number]) => {
      setLoading(true);
      setError(false);
      globalThis
        .fetch(
          `${API_BASE}/stocks/history?ticker=${encodeURIComponent(stock.ticker)}&market=${stock.market}&period=${p}`
        )
        .then((r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.json();
        })
        .then((d) => {
          const res = runBacktest(d.data ?? [], stock);
          setResult(res);
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    },
    [stock]
  );

  useEffect(() => {
    runTest(period);
  }, [period]);

  return (
    <View style={styles.wrapper}>
      {/* 기간 선택 */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodBtn,
              { borderColor: c.separator, backgroundColor: c.card },
              p === period && { backgroundColor: "#0064FF", borderColor: "#0064FF" },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodTxt,
                { color: c.textSecondary },
                p === period && { color: "#fff" },
              ]}
            >
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.tint} />
          <Text style={[styles.loadingTxt, { color: c.textSecondary }]}>
            과거 데이터로 시뮬레이션 중...
          </Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={c.textSecondary} />
          <Text style={[styles.loadingTxt, { color: c.textSecondary }]}>
            데이터를 불러올 수 없습니다.
          </Text>
        </View>
      )}

      {!loading && !error && result && (
        <>
          {/* 전략 설명 */}
          <View style={[styles.stratCard, { backgroundColor: isDark ? "#141B2D" : "#F0F4FF" }]}>
            <View style={styles.stratHeader}>
              <Ionicons name="git-branch-outline" size={16} color="#0064FF" />
              <Text style={[styles.stratTitle, { color: c.text }]}>30/30/40 분할 매수 전략</Text>
            </View>
            <Text style={[styles.stratDesc, { color: c.textSecondary }]}>
              {PERIOD_LABELS[period]} 과거 데이터 기준, {result.tradeCount}번의 진입 기회 시뮬레이션
            </Text>
          </View>

          {/* 핵심 지표 */}
          <View style={styles.metricsGrid}>
            {[
              {
                label: "평균 수익률",
                value: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(1)}%`,
                color: result.totalReturn >= 0 ? "#F04452" : "#1B63E8",
                icon: "trending-up-outline" as const,
              },
              {
                label: "전략 적중률",
                value: `${result.hitRate.toFixed(0)}%`,
                color: result.hitRate >= 60 ? "#F04452" : "#F59E0B",
                icon: "checkmark-circle-outline" as const,
              },
              {
                label: "최대 손실",
                value: `${result.maxDrawdown.toFixed(1)}%`,
                color: "#1B63E8",
                icon: "arrow-down-outline" as const,
              },
              {
                label: "기간 등락",
                value: `${result.periodReturn >= 0 ? "+" : ""}${result.periodReturn.toFixed(1)}%`,
                color: result.periodReturn >= 0 ? "#F04452" : "#1B63E8",
                icon: "stats-chart-outline" as const,
              },
            ].map((m) => (
              <View key={m.label} style={[styles.metricBox, { backgroundColor: c.card }]}>
                <Ionicons name={m.icon} size={18} color={m.color} />
                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                <Text style={[styles.metricLabel, { color: c.textSecondary }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* 현재가 기준 진입·익절 레벨 */}
          <View style={[styles.priceCard, { backgroundColor: c.card }]}>
            <Text style={[styles.priceCardTitle, { color: c.text }]}>현재가 기준 매수·매도 레벨</Text>
            <View style={styles.priceTable}>
              {[
                { label: "1차 매수 (-" + Math.abs(result.entry1Pct) + "%)", price: result.entry1Price, ratio: "30%", color: "#22C55E" },
                { label: "2차 매수 (-" + Math.abs(result.entry2Pct) + "%)", price: result.entry2Price, ratio: "30%", color: "#F59E0B" },
                { label: "3차 매수 (-" + Math.abs(result.entry3Pct) + "%)", price: result.entry3Price, ratio: "40%", color: "#F04452" },
              ].map((r) => (
                <View key={r.label} style={styles.priceRow}>
                  <View style={[styles.priceDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.priceRowLabel, { color: c.textSecondary }]}>{r.label}</Text>
                  <Text style={[styles.priceRowRatio, { color: c.textTertiary }]}>{r.ratio}</Text>
                  <Text style={[styles.priceRowVal, { color: c.text }]}>
                    ₩{r.price.toLocaleString()}
                  </Text>
                </View>
              ))}
              <View style={[styles.priceDivider, { backgroundColor: c.separator }]} />
              {[
                { label: "1차 익절 (+" + stock.profitTargets[0]?.percent + "%)", price: result.exit1Price, color: "#F04452" },
                { label: "2차 익절 (+" + stock.profitTargets[1]?.percent + "%)", price: result.exit2Price, color: "#F04452" },
                { label: "3차 익절 (+" + stock.profitTargets[2]?.percent + "%)", price: result.exit3Price, color: "#F04452" },
              ].map((r) => (
                <View key={r.label} style={styles.priceRow}>
                  <View style={[styles.priceDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.priceRowLabel, { color: c.textSecondary }]}>{r.label}</Text>
                  <Text style={[styles.priceRowRatio, { color: c.textTertiary }]} />
                  <Text style={[styles.priceRowVal, { color: r.color }]}>
                    ₩{r.price.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.disclaimer, { backgroundColor: c.backgroundTertiary }]}>
            <Ionicons name="information-circle-outline" size={14} color={c.textTertiary} />
            <Text style={[styles.disclaimerText, { color: c.textTertiary }]}>
              과거 수익률이 미래를 보장하지 않습니다. 시뮬레이션은 참고용입니다.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:       { padding: 16, gap: 12 },
  center:        { paddingTop: 60, alignItems: "center", gap: 12 },
  loadingTxt:    { fontSize: 14 },

  periodRow:     { flexDirection: "row", gap: 8 },
  periodBtn:     { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  periodTxt:     { fontSize: 13, fontFamily: "Inter_500Medium" },

  stratCard:     { borderRadius: 14, padding: 14, gap: 6 },
  stratHeader:   { flexDirection: "row", alignItems: "center", gap: 6 },
  stratTitle:    { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stratDesc:     { fontSize: 12, lineHeight: 18 },

  metricsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricBox:     { flex: 1, minWidth: "45%", borderRadius: 12, padding: 14, alignItems: "center", gap: 4 },
  metricValue:   { fontSize: 20, fontFamily: "Inter_700Bold" },
  metricLabel:   { fontSize: 11, textAlign: "center" },

  priceCard:     { borderRadius: 14, padding: 14, gap: 10 },
  priceCardTitle:{ fontSize: 14, fontFamily: "Inter_600SemiBold" },
  priceTable:    { gap: 8 },
  priceRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  priceDot:      { width: 8, height: 8, borderRadius: 4 },
  priceRowLabel: { flex: 1, fontSize: 12 },
  priceRowRatio: { fontSize: 11, width: 28, textAlign: "right" },
  priceRowVal:   { fontSize: 13, fontFamily: "Inter_600SemiBold", minWidth: 90, textAlign: "right" },
  priceDivider:  { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  disclaimer:    { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 10 },
  disclaimerText:{ fontSize: 11, flex: 1, lineHeight: 16 },
});
