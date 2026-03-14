import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

type BoxPos = "저점권" | "중간권" | "고점권";

interface BoxRangeSectionProps {
  stock:      StockInfo;
  livePrice?: number;
  dynBoxPos?: BoxPos;
}

export default function BoxRangeSection({ stock, livePrice, dynBoxPos }: BoxRangeSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const { support, resistance } = stock.boxRange;
  const range = resistance - support;

  // Use live price if available, otherwise fall back to stub
  const currentPos   = livePrice && livePrice > 0 ? livePrice : stock.currentPrice;
  const currentPosition: BoxPos = dynBoxPos ?? (stock.boxRange.currentPosition as BoxPos);
  const posRatio     = range > 0 ? Math.max(0, Math.min(1, (currentPos - support) / range)) : 0.5;
  const isLive       = !!(livePrice && livePrice > 0 && dynBoxPos);

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
        {isLive && (
          <View style={[styles.liveBadge, { backgroundColor: "#F04452" + "18" }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveTxt, { color: "#F04452" }]}>실시간</Text>
          </View>
        )}
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
                width: `${posRatio * 100}%` as any,
                backgroundColor: posColor,
              },
            ]}
          />
          <View
            style={[
              styles.currentIndicator,
              { left: `${posRatio * 100}%` as any, backgroundColor: posColor },
            ]}
          />
        </View>

        <View style={styles.positionRow}>
          <View>
            <Text style={[styles.positionLabel, { color: c.textTertiary }]}>
              현재가
            </Text>
            <Text style={[styles.positionPrice, { color: c.text }]}>
              ₩{currentPos.toLocaleString()}
            </Text>
          </View>
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
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#F04452",
  },
  liveTxt: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  labelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelTitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  labelPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    marginBottom: 16,
    position: "relative",
    overflow: "visible",
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  currentIndicator: {
    position: "absolute",
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#FFF",
    marginLeft: -9,
  },
  positionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  positionLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  positionPrice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
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
