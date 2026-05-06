import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  calculateYearlyTax,
  listYearsFromTrades,
  OVERSEAS_DEDUCTION_KRW,
  OVERSEAS_TAX_RATE,
} from "@/utils/capitalGainsTax";

const fmtKRW = (n: number) =>
  `${n < 0 ? "-" : ""}₩${Math.round(Math.abs(n)).toLocaleString()}`;

export default function TaxScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { closedTrades } = usePortfolio();

  const years = useMemo(() => {
    const all = listYearsFromTrades(closedTrades);
    if (all.length === 0) all.push(new Date().getFullYear());
    return all;
  }, [closedTrades]);

  const [selectedYear, setSelectedYear] = useState(years[0]);
  const summary = useMemo(
    () => calculateYearlyTax(closedTrades, selectedYear),
    [closedTrades, selectedYear],
  );

  const ov = summary.overseas;
  const dm = summary.domestic;

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>양도소득세 계산</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.yearRow}
        >
          {years.map((y) => {
            const selected = y === selectedYear;
            return (
              <TouchableOpacity
                key={y}
                onPress={() => setSelectedYear(y)}
                style={[
                  s.yearChip,
                  {
                    backgroundColor: selected ? c.tint : c.card,
                    borderColor: selected ? c.tint : c.cardBorder,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    s.yearChipText,
                    { color: selected ? "#fff" : c.text },
                  ]}
                >
                  {y}년
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 해외주식 */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          <View style={s.cardHeader}>
            <View style={[s.iconWrap, { backgroundColor: "#0064FF18" }]}>
              <Ionicons name="globe-outline" size={20} color="#0064FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: c.text }]}>해외주식 양도소득세</Text>
              <Text style={[s.cardSub, { color: c.textSecondary }]}>
                NASDAQ · 매도 {ov.tradeCount}건
              </Text>
            </View>
          </View>

          <Row label="실현 이익 (+)" value={fmtKRW(ov.totalProfit)} c={c} positive />
          <Row label="실현 손실 (-)" value={fmtKRW(ov.totalLoss)} c={c} negative />
          <Divider c={c} />
          <Row label="손익 통산" value={fmtKRW(ov.netGain)} c={c} bold />
          <Row label="기본공제" value={`-${fmtKRW(OVERSEAS_DEDUCTION_KRW)}`} c={c} muted />
          <Divider c={c} />
          <Row label="과세표준" value={fmtKRW(ov.taxableGain)} c={c} bold />
          <Row
            label={`세율 (${(OVERSEAS_TAX_RATE * 100).toFixed(0)}%)`}
            value=""
            c={c}
            muted
          />
          <Divider c={c} />
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: c.text }]}>예상 납부세액</Text>
            <Text
              style={[
                s.totalValue,
                { color: ov.taxAmount > 0 ? "#F04452" : c.textSecondary },
              ]}
            >
              {fmtKRW(ov.taxAmount)}
            </Text>
          </View>
        </View>

        {/* 국내주식 */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          <View style={s.cardHeader}>
            <View style={[s.iconWrap, { backgroundColor: "#05C07218" }]}>
              <Ionicons name="flag-outline" size={20} color="#05C072" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: c.text }]}>국내주식 (참고용)</Text>
              <Text style={[s.cardSub, { color: c.textSecondary }]}>
                KOSPI · KOSDAQ · 매도 {dm.tradeCount}건
              </Text>
            </View>
          </View>

          <Row label="실현 이익" value={fmtKRW(dm.totalProfit)} c={c} positive />
          <Row label="실현 손실" value={fmtKRW(dm.totalLoss)} c={c} negative />
          <Divider c={c} />
          <Row label="손익 합계" value={fmtKRW(dm.netGain)} c={c} bold />
          <Row
            label="추정 거래세 (0.18%)"
            value={fmtKRW(dm.estTransactionTax)}
            c={c}
            muted
          />
          <Text style={[s.note, { color: c.textTertiary, marginTop: 6 }]}>
            대주주 아닌 일반 투자자 기준 양도소득세 비과세. 거래세는 매도 시 자동 원천징수.
          </Text>
        </View>

        <Text style={[s.footnote, { color: c.textTertiary }]}>
          • 청산 시점에 기록된 환율로 KRW 환산한 값이라 홈택스 신고 시 국세청 고시 환율과 차이 발생 가능.{"\n"}
          • 대주주(지분율·시총 기준) 또는 금투세 적용 대상은 별도 계산 필요.{"\n"}
          • 법정 신고는 매년 5월. 이 화면은 참고용이며 실제 신고는 세무사·홈택스 권장.
        </Text>
      </ScrollView>
    </View>
  );
}

type ColorScheme = typeof Colors.dark;

interface RowProps {
  label:    string;
  value:    string;
  c:        ColorScheme;
  positive?: boolean;
  negative?: boolean;
  bold?:    boolean;
  muted?:   boolean;
}
function Row({ label, value, c, positive, negative, bold, muted }: RowProps) {
  const valueColor = positive
    ? "#F04452"
    : negative
      ? "#1B63E8"
      : muted
        ? c.textSecondary
        : c.text;
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { color: muted ? c.textSecondary : c.text }]}>
        {label}
      </Text>
      <Text
        style={[
          s.rowValue,
          { color: valueColor, fontFamily: bold ? "Inter_700Bold" : "Inter_500Medium" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider({ c }: { c: ColorScheme }) {
  return <View style={[s.divider, { backgroundColor: c.separator }]} />;
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll:      { padding: 16, gap: 14 },

  yearRow:     { gap: 8, paddingBottom: 4 },
  yearChip:    {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
  },
  yearChipText:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },

  card:        { borderRadius: 16, padding: 18, gap: 8 },
  cardHeader:  {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  iconWrap:    {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle:   { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardSub:     { fontSize: 12, marginTop: 2 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  rowLabel:    { fontSize: 13, fontFamily: "Inter_400Regular" },
  rowValue:    { fontSize: 14 },
  divider:     { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  totalRow:    {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  totalLabel:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalValue:  { fontSize: 18, fontFamily: "Inter_700Bold" },

  note:        { fontSize: 11, lineHeight: 16 },
  footnote:    { fontSize: 11, lineHeight: 17, paddingHorizontal: 4 },
});
