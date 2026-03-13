import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface BoxRangeSectionProps {
  stock: StockInfo;
}

export default function BoxRangeSection({ stock }: BoxRangeSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const { support, resistance, currentPosition } = stock.boxRange;
  const range = resistance - support;
  const currentPos = stock.currentPrice;
  const posRatio = Math.max(0, Math.min(1, (currentPos - support) / range));

  const posColor =
    currentPosition === "저점권"
      ? c.positive
      : currentPosition === "고점권"
      ? c.negative
      : c.warning;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="stats-chart" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>박스권 분석</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.labels}>
          <View style={styles.labelItem}>
            <View style={[styles.dot, { backgroundColor: c.positive }]} />
            <View>
              <Text style={[styles.labelTitle, { color: c.textTertiary }]}>저점 (지지선)</Text>
              <Text style={[styles.labelPrice, { color: c.text }]}>
                ₩{support.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.labelItem}>
            <View style={[styles.dot, { backgroundColor: c.negative }]} />
            <View>
              <Text style={[styles.labelTitle, { color: c.textTertiary }]}>고점 (저항선)</Text>
              <Text style={[styles.labelPrice, { color: c.text }]}>
                ₩{resistance.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.barTrack, { backgroundColor: c.backgroundTertiary }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${posRatio * 100}%`,
                backgroundColor: posColor,
              },
            ]}
          />
          <View
            style={[
              styles.currentIndicator,
              { left: `${posRatio * 100}%`, backgroundColor: posColor },
            ]}
          />
        </View>

        <View style={styles.positionRow}>
          <Text style={[styles.positionLabel, { color: c.textTertiary }]}>현재 위치</Text>
          <View style={[styles.positionBadge, { backgroundColor: posColor + "22" }]}>
            <View style={[styles.positionDot, { backgroundColor: posColor }]} />
            <Text style={[styles.positionText, { color: posColor }]}>
              {currentPosition}
            </Text>
          </View>
        </View>

        <View style={[styles.strategy, { backgroundColor: c.backgroundTertiary }]}>
          <Text style={[styles.strategyTitle, { color: c.text }]}>
            {currentPosition === "저점권"
              ? "저점 진입 전략"
              : currentPosition === "고점권"
              ? "고점 주의 전략"
              : "중간 관망 전략"}
          </Text>
          <Text style={[styles.strategyText, { color: c.textSecondary }]}>
            {currentPosition === "저점권"
              ? `박스권 저점 근처. 지지선 ₩${support.toLocaleString()} 확인 후 분할 진입 적기. 손절은 지지선 -5% 설정.`
              : currentPosition === "고점권"
              ? `박스권 상단 근처. 저항선 ₩${resistance.toLocaleString()} 근처 신규 매수 자제. 기존 보유자는 일부 익절 고려.`
              : `박스권 중간 구간. 방향성 확인 후 진입 권장. 추가 하락 시 저점 분할매수, 상승 돌파 시 추격 매수 가능.`}
          </Text>
        </View>
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  labelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  labelTitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  labelPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    position: "relative",
    marginBottom: 16,
    overflow: "visible",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  currentIndicator: {
    position: "absolute",
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#FFF",
    marginLeft: -10,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  positionLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  positionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  positionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  positionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  strategy: {
    padding: 12,
    borderRadius: 10,
  },
  strategyTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  strategyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
