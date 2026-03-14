import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface FinancialsSectionProps {
  stock: StockInfo;
}

const EVAL_COLORS: Record<string, string> = {
  "심각한 거품": "#FF3B3B",
  "거품": "#FF6B35",
  "적정": "#F59E0B",
  "저평가": "#00C896",
  "강한 저평가": "#3B82F6",
};

export default function FinancialsSection({ stock }: FinancialsSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { financials } = stock;
  const evalColor = EVAL_COLORS[financials.evaluation] || "#888";

  const isStub = financials.per === 0 && financials.pbr === 0 && financials.roe === 0;

  const fmtPer = () => {
    if (isStub || financials.per == null) return "N/A";
    if (financials.per < 0) return "적자";
    return `${financials.per}배`;
  };
  const fmtPbr = () => {
    if (isStub || financials.pbr == null || financials.pbr === 0) return "N/A";
    return `${financials.pbr}배`;
  };
  const fmtRoe = () => {
    if (isStub || financials.roe == null || financials.roe === 0) return "N/A";
    if (financials.roe < 0) return `${financials.roe}%`;
    return `${financials.roe}%`;
  };
  const fmtDebt = () => {
    if (isStub || financials.debtRatio == null || financials.debtRatio === 0) return "N/A";
    return `${financials.debtRatio}%`;
  };
  const fmtRev = () => {
    if (isStub || financials.revenueGrowth == null || financials.revenueGrowth === 0) return "N/A";
    return `${financials.revenueGrowth > 0 ? "+" : ""}${financials.revenueGrowth}%`;
  };

  const metrics = [
    { label: "PER (주가수익비율)",  value: fmtPer(),  good: !isStub && financials.per > 0 && financials.per < 25,     na: isStub || financials.per  <= 0 },
    { label: "PBR (주가순자산비율)",value: fmtPbr(),  good: !isStub && financials.pbr > 0 && financials.pbr < 3,      na: isStub || financials.pbr  === 0 },
    { label: "ROE (자기자본이익률)",value: fmtRoe(),  good: !isStub && financials.roe > 15,                            na: isStub || financials.roe  === 0 },
    { label: "부채비율",            value: fmtDebt(), good: !isStub && financials.debtRatio > 0 && financials.debtRatio < 100, na: isStub || financials.debtRatio === 0 },
    { label: "매출 성장률",         value: fmtRev(),  good: !isStub && financials.revenueGrowth > 10,                 na: isStub || financials.revenueGrowth === 0 },
  ];

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="bar-chart" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>재무제표 분석</Text>
      </View>

      <View style={[styles.evalBanner, { backgroundColor: evalColor + "18" }]}>
        <View style={[styles.evalIcon, { backgroundColor: evalColor + "30" }]}>
          <Ionicons
            name={
              financials.evaluation.includes("저평가")
                ? "trending-up"
                : financials.evaluation.includes("거품")
                ? "warning"
                : "remove"
            }
            size={20}
            color={evalColor}
          />
        </View>
        <View style={styles.evalInfo}>
          <Text style={[styles.evalLabel, { color: c.textSecondary }]}>종합 평가</Text>
          <Text style={[styles.evalValue, { color: evalColor }]}>
            {financials.evaluation}
          </Text>
        </View>
      </View>

      {metrics.map((m, i) => (
        <View
          key={i}
          style={[
            styles.metricRow,
            { borderBottomColor: c.separator, borderBottomWidth: i < metrics.length - 1 ? 1 : 0 },
          ]}
        >
          <Text style={[styles.metricLabel, { color: c.textSecondary }]}>{m.label}</Text>
          <View style={styles.metricRight}>
            <View
              style={[
                styles.metricBadge,
                {
                  backgroundColor: m.na
                    ? c.backgroundTertiary
                    : m.good
                    ? c.positive + "22"
                    : c.negative + "22",
                },
              ]}
            >
              <Text
                style={[
                  styles.metricValue,
                  {
                    color: m.na
                      ? c.textSecondary
                      : m.good
                      ? c.positive
                      : c.negative,
                  },
                ]}
              >
                {m.value}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <View style={[styles.summary, { backgroundColor: c.backgroundTertiary }]}>
        <Text style={[styles.summaryText, { color: c.textSecondary }]}>
          {financials.summary}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  evalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  evalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  evalInfo: {},
  evalLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  evalValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  metricRight: {
    alignItems: "flex-end",
  },
  metricBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  summary: {
    margin: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
