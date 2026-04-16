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

import { API_BASE } from "@/utils/apiBase";

interface DayData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 5% 매수그물: 0/-5/-10/-15/-20%, 비중 10/15/20/25/30%
const GRID_DROPS   = [0, 5, 10, 15, 20];
const GRID_WEIGHTS = [0.10, 0.15, 0.20, 0.25, 0.30];
// avg entry factor (기준가 대비 가중평균 비율)
const AVG_ENTRY_FACTOR = GRID_DROPS.reduce(
  (sum, d, i) => sum + GRID_WEIGHTS[i] * (1 - d / 100), 0
); // ≈ 0.875

// 3·5·8·15% 분할 익절 (25%씩)
const EXIT_PCTS    = [3, 5, 8, 15];

interface BacktestResult {
  entry1Price: number; entry2Price: number; entry3Price: number;
  entry4Price: number; entry5Price: number;
  exit1Price: number;  exit2Price: number;  exit3Price: number; exit4Price: number;
  totalReturn: number;
  grossReturn: number;
  totalCost: number;
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

interface BacktestParams {
  commissionPct: number;
  slippagePct: number;
}

function runBacktest(
  data: DayData[],
  _stock: StockInfo,
  params: BacktestParams
): BacktestResult | null {
  if (data.length < 10) return null;

  const { commissionPct, slippagePct } = params;
  const oneWayCost   = commissionPct + slippagePct;
  const roundTripCost = 2 * oneWayCost;

  const startPrice  = data[0].close;
  const endPrice    = data[data.length - 1].close;
  const periodReturn = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  // 진입 트리거: 최근 20봉 고점 대비 -10% 이상 하락 시 (3차 그물망 진입 기준)
  const TRIGGER_DROP = 10;

  let wins = 0, tradeCount = 0, grossReturn = 0, netReturn = 0, maxDrawdown = 0;

  for (let i = 5; i < data.length - 5; i++) {
    const refHigh = Math.max(...data.slice(Math.max(0, i - 20), i).map((d) => d.high));
    const cur = data[i].close;
    const dropFromHigh = refHigh > 0 ? ((cur - refHigh) / refHigh) * 100 : 0;

    if (dropFromHigh <= -TRIGGER_DROP) {
      tradeCount++;

      // 5% 그물망 가중평균 진입가 (0/-5/-10/-15/-20%, 10/15/20/25/30%)
      const avgEntry = cur * AVG_ENTRY_FACTOR;
      const effectiveEntry = avgEntry * (1 + oneWayCost / 100);

      const future = data.slice(i + 1, Math.min(i + 40, data.length));
      const peak   = future.reduce((m, d) => Math.max(m, d.high), 0);
      const trough = future.reduce((m, d) => Math.min(m, d.low), cur);

      const effectivePeak = peak > 0 ? peak * (1 - oneWayCost / 100) : 0;
      const gross = peak > 0 ? ((peak - avgEntry) / avgEntry) * 100 : 0;
      const dd    = ((trough - avgEntry) / avgEntry) * 100;

      if (dd < maxDrawdown) maxDrawdown = dd;

      const [pt1, pt2, pt3, pt4] = EXIT_PCTS;
      const wouldHit = gross >= pt1;

      if (wouldHit) {
        wins++;
        // 3·5·8·15 분할 익절 (25%씩 가중 평균)
        const blendedGross =
          0.25 * pt1 +
          0.25 * Math.min(gross, pt2) +
          0.25 * Math.min(gross, pt3) +
          0.25 * Math.min(gross, pt4);
        grossReturn += blendedGross;
        netReturn   += blendedGross - roundTripCost;
      } else {
        grossReturn += dd;
        netReturn   += dd - roundTripCost;
      }

      // 같은 구간 중복 진입 방지: 5봉 건너뜀
      i += 5;
    }
  }

  const hitRate  = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;
  const avgGross = tradeCount > 0 ? grossReturn / tradeCount : 0;
  const avgNet   = tradeCount > 0 ? netReturn   / tradeCount : 0;
  const totalCostImpact = avgGross - avgNet;

  const p = endPrice;
  return {
    entry1Price: Math.round(p),
    entry2Price: Math.round(p * 0.95),
    entry3Price: Math.round(p * 0.90),
    entry4Price: Math.round(p * 0.85),
    entry5Price: Math.round(p * 0.80),
    exit1Price:  Math.round(p * AVG_ENTRY_FACTOR * 1.03),
    exit2Price:  Math.round(p * AVG_ENTRY_FACTOR * 1.05),
    exit3Price:  Math.round(p * AVG_ENTRY_FACTOR * 1.08),
    exit4Price:  Math.round(p * AVG_ENTRY_FACTOR * 1.15),
    totalReturn:  avgNet,
    grossReturn:  avgGross,
    totalCost:    totalCostImpact,
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

const COMMISSION_OPTIONS = [
  { label: "0.015%", value: 0.015 },
  { label: "0.025%", value: 0.025 },
  { label: "0.1%",   value: 0.1   },
  { label: "0.25%",  value: 0.25  },
];
const SLIPPAGE_OPTIONS = [
  { label: "0.02%", value: 0.02 },
  { label: "0.05%", value: 0.05 },
  { label: "0.1%",  value: 0.1  },
  { label: "0.2%",  value: 0.2  },
];

export default function BacktestSection({ stock }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const isKorean = stock.market === "KOSPI" || stock.market === "KOSDAQ";
  const [period, setPeriod] = useState<typeof PERIODS[number]>("6mo");
  const [commissionPct, setCommissionPct] = useState(isKorean ? 0.015 : 0.1);
  const [slippagePct, setSlippagePct] = useState(0.05);
  const [showCostPanel, setShowCostPanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<DayData[]>([]);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState(false);

  const fetchData = useCallback(
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
          const data: DayData[] = d.data ?? [];
          setRawData(data);
          setResult(runBacktest(data, stock, { commissionPct, slippagePct }));
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    },
    [stock, commissionPct, slippagePct]
  );

  useEffect(() => {
    fetchData(period);
  }, [period]);

  // 수수료/슬리피지 바뀌면 데이터 재사용해 빠르게 재계산
  useEffect(() => {
    if (rawData.length > 0) {
      setResult(runBacktest(rawData, stock, { commissionPct, slippagePct }));
    }
  }, [commissionPct, slippagePct, rawData]);

  const roundTripCost = 2 * (commissionPct + slippagePct);

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

      {/* 수수료·슬리피지 패널 */}
      <TouchableOpacity
        style={[styles.costToggle, { backgroundColor: c.card, borderColor: c.separator }]}
        onPress={() => setShowCostPanel(!showCostPanel)}
        activeOpacity={0.7}
      >
        <View style={styles.costToggleLeft}>
          <Ionicons name="settings-outline" size={15} color="#0064FF" />
          <Text style={[styles.costToggleTxt, { color: c.text }]}>거래 비용 설정</Text>
          <View style={[styles.costBadge, { backgroundColor: isDark ? "#1A2B4A" : "#E8F0FF" }]}>
            <Text style={styles.costBadgeTxt}>왕복 {roundTripCost.toFixed(3)}%</Text>
          </View>
        </View>
        <Ionicons
          name={showCostPanel ? "chevron-up" : "chevron-down"}
          size={14}
          color={c.textSecondary}
        />
      </TouchableOpacity>

      {showCostPanel && (
        <View style={[styles.costPanel, { backgroundColor: isDark ? "#141B2D" : "#F7F9FF", borderColor: c.separator }]}>
          <View style={styles.costSection}>
            <Text style={[styles.costSectionLabel, { color: c.textSecondary }]}>
              수수료 (편도)
            </Text>
            <View style={styles.optionRow}>
              {COMMISSION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionBtn,
                    { borderColor: c.separator, backgroundColor: c.card },
                    opt.value === commissionPct && { backgroundColor: "#0064FF", borderColor: "#0064FF" },
                  ]}
                  onPress={() => setCommissionPct(opt.value)}
                >
                  <Text
                    style={[
                      styles.optionTxt,
                      { color: c.textSecondary },
                      opt.value === commissionPct && { color: "#fff" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.costSection}>
            <Text style={[styles.costSectionLabel, { color: c.textSecondary }]}>
              슬리피지 (편도, 체결 오차)
            </Text>
            <View style={styles.optionRow}>
              {SLIPPAGE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionBtn,
                    { borderColor: c.separator, backgroundColor: c.card },
                    opt.value === slippagePct && { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
                  ]}
                  onPress={() => setSlippagePct(opt.value)}
                >
                  <Text
                    style={[
                      styles.optionTxt,
                      { color: c.textSecondary },
                      opt.value === slippagePct && { color: "#fff" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.costNote, { backgroundColor: isDark ? "#1C1C1E" : "#fff" }]}>
            <Ionicons name="information-circle-outline" size={13} color="#0064FF" />
            <Text style={[styles.costNoteTxt, { color: c.textSecondary }]}>
              국내 MTS: 약 0.015% · 해외주식: 약 0.1~0.25% · 슬리피지는 호가창 스프레드에 따라 달라집니다
            </Text>
          </View>
        </View>
      )}

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
              <Ionicons name="git-network-outline" size={16} color="#0064FF" />
              <Text style={[styles.stratTitle, { color: c.text }]}>5% 매수그물 · 3·5·8·15 익절</Text>
            </View>
            <Text style={[styles.stratDesc, { color: c.textSecondary }]}>
              {PERIOD_LABELS[period]} 기준 {result.tradeCount}번 진입 기회 · 왕복 비용 {roundTripCost.toFixed(3)}% 적용
            </Text>
          </View>

          {/* 핵심 지표 — 수수료 반영 수익 vs 미반영 수익 */}
          <View style={styles.metricsGrid}>
            {[
              {
                label: "순 수익률",
                sub:   "(수수료·슬리피지 후)",
                value: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(1)}%`,
                color: result.totalReturn >= 0 ? "#F04452" : "#1B63E8",
                icon: "trending-up-outline" as const,
                highlight: true,
              },
              {
                label: "비용 차감분",
                sub:   "(왕복 비용 영향)",
                value: `-${result.totalCost.toFixed(2)}%`,
                color: "#F59E0B",
                icon: "receipt-outline" as const,
                highlight: false,
              },
              {
                label: "전략 적중률",
                sub:   "(익절 목표 달성)",
                value: `${result.hitRate.toFixed(0)}%`,
                color: result.hitRate >= 60 ? "#F04452" : "#F59E0B",
                icon: "checkmark-circle-outline" as const,
                highlight: false,
              },
              {
                label: "최대 손실",
                sub:   "(MDD)",
                value: `${result.maxDrawdown.toFixed(1)}%`,
                color: "#1B63E8",
                icon: "arrow-down-outline" as const,
                highlight: false,
              },
            ].map((m) => (
              <View
                key={m.label}
                style={[
                  styles.metricBox,
                  { backgroundColor: c.card },
                  m.highlight && { borderWidth: 1.5, borderColor: "#0064FF" },
                ]}
              >
                <Ionicons name={m.icon} size={18} color={m.color} />
                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                <Text style={[styles.metricLabel, { color: c.text }]}>{m.label}</Text>
                <Text style={[styles.metricSub, { color: c.textTertiary }]}>{m.sub}</Text>
              </View>
            ))}
          </View>

          {/* 기간 등락 비교 */}
          <View style={[styles.compareRow, { backgroundColor: c.card }]}>
            <View style={styles.compareItem}>
              <Text style={[styles.compareLabel, { color: c.textSecondary }]}>기간 단순 등락</Text>
              <Text style={[styles.compareValue, { color: result.periodReturn >= 0 ? "#F04452" : "#1B63E8" }]}>
                {result.periodReturn >= 0 ? "+" : ""}{result.periodReturn.toFixed(1)}%
              </Text>
            </View>
            <View style={[styles.compareDivider, { backgroundColor: c.separator }]} />
            <View style={styles.compareItem}>
              <Text style={[styles.compareLabel, { color: c.textSecondary }]}>전략 순 수익률</Text>
              <Text style={[styles.compareValue, { color: result.totalReturn >= 0 ? "#F04452" : "#1B63E8" }]}>
                {result.totalReturn >= 0 ? "+" : ""}{result.totalReturn.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* 현재가 기준 매수그물 · 익절 레벨 */}
          <View style={[styles.priceCard, { backgroundColor: c.card }]}>
            <Text style={[styles.priceCardTitle, { color: c.text }]}>현재가 기준 매수·익절 레벨</Text>
            <View style={styles.priceTable}>
              {[
                { label: "1차 매수 (기준가)",  price: result.entry1Price, ratio: "10%", color: "#3B82F6" },
                { label: "2차 매수 (-5%)",    price: result.entry2Price, ratio: "15%", color: "#6366F1" },
                { label: "3차 매수 (-10%)",   price: result.entry3Price, ratio: "20%", color: "#8B5CF6" },
                { label: "4차 매수 (-15%)",   price: result.entry4Price, ratio: "25%", color: "#A855F7" },
                { label: "5차 매수 (-20%)",   price: result.entry5Price, ratio: "30%", color: "#EC4899" },
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
                { label: "1차 익절 (+3%)",  price: result.exit1Price, color: "#F59E0B" },
                { label: "2차 익절 (+5%)",  price: result.exit2Price, color: "#00C896" },
                { label: "3차 익절 (+8%)",  price: result.exit3Price, color: "#3B82F6" },
                { label: "4차 익절 (+15%)", price: result.exit4Price, color: "#A855F7" },
              ].map((r) => (
                <View key={r.label} style={styles.priceRow}>
                  <View style={[styles.priceDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.priceRowLabel, { color: c.textSecondary }]}>{r.label}</Text>
                  <Text style={[styles.priceRowRatio, { color: c.textTertiary }]}>25%</Text>
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
              과거 수익률이 미래를 보장하지 않습니다. 수수료·슬리피지가 반영된 시뮬레이션입니다.
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

  costToggle:    {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1,
  },
  costToggleLeft:{ flexDirection: "row", alignItems: "center", gap: 8 },
  costToggleTxt: { fontSize: 13, fontFamily: "Inter_500Medium" },
  costBadge:     { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  costBadgeTxt:  { fontSize: 11, color: "#0064FF", fontFamily: "Inter_600SemiBold" },

  costPanel:     { borderRadius: 12, padding: 12, gap: 12, borderWidth: 1 },
  costSection:   { gap: 8 },
  costSectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  optionRow:     { flexDirection: "row", gap: 6 },
  optionBtn:     { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: "center" },
  optionTxt:     { fontSize: 12, fontFamily: "Inter_500Medium" },
  costNote:      { flexDirection: "row", alignItems: "flex-start", gap: 5, padding: 8, borderRadius: 8 },
  costNoteTxt:   { fontSize: 11, flex: 1, lineHeight: 16 },

  stratCard:     { borderRadius: 14, padding: 14, gap: 6 },
  stratHeader:   { flexDirection: "row", alignItems: "center", gap: 6 },
  stratTitle:    { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stratDesc:     { fontSize: 12, lineHeight: 18 },

  metricsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricBox:     { flex: 1, minWidth: "45%", borderRadius: 12, padding: 14, alignItems: "center", gap: 2 },
  metricValue:   { fontSize: 20, fontFamily: "Inter_700Bold" },
  metricLabel:   { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  metricSub:     { fontSize: 10, textAlign: "center" },

  compareRow:    { flexDirection: "row", borderRadius: 12, overflow: "hidden" },
  compareItem:   { flex: 1, padding: 14, alignItems: "center", gap: 4 },
  compareLabel:  { fontSize: 11 },
  compareValue:  { fontSize: 17, fontFamily: "Inter_700Bold" },
  compareDivider:{ width: StyleSheet.hairlineWidth },

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
