import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface StockCardProps {
  stock: StockInfo;
  onPress: () => void;
  editMode?: boolean;
  onDelete?: () => void;
}

const MARKET_COLORS: Record<string, string> = {
  NASDAQ: "#3B82F6",
  KOSPI: "#8B5CF6",
  KOSDAQ: "#F59E0B",
};

const GRADE_COLORS: Record<string, string> = {
  우량주: "#00C896",
  중형주: "#3B82F6",
  소형주: "#F59E0B",
};

export default function StockCard({ stock, onPress, editMode = false, onDelete }: StockCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: editMode ? 1 : 0,
      useNativeDriver: false,
      tension: 120,
      friction: 12,
    }).start();
  }, [editMode]);

  const deleteTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-48, 0],
  });
  const deleteOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });
  const contentShift = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 44],
  });

  const latestForecast = stock.forecasts[stock.forecasts.length - 1];
  const isPositive = latestForecast.changePercent >= 0;
  const marketColor = MARKET_COLORS[stock.market] || "#888";
  const gradeColor = GRADE_COLORS[stock.grade] || "#888";

  const boxPos = stock.boxRange.currentPosition;
  const boxColor =
    boxPos === "저점권" ? "#00C896" : boxPos === "고점권" ? "#FF3B3B" : "#F59E0B";

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 10000) return `${(price / 10000).toFixed(0)}만`;
    return price.toLocaleString();
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.deleteArea,
          {
            opacity: deleteOpacity,
            transform: [{ translateX: deleteTranslateX }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: c.negative }]}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="remove" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[{ transform: [{ translateX: contentShift }] }]}
      >
        <TouchableOpacity
          style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
          onPress={onPress}
          activeOpacity={editMode ? 1 : 0.75}
        >
          <View style={styles.header}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: c.text }]}>{stock.name}</Text>
              <Text style={[styles.ticker, { color: c.textTertiary }]}>
                {stock.ticker}
              </Text>
            </View>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: marketColor + "22" }]}>
                <Text style={[styles.badgeText, { color: marketColor }]}>
                  {stock.market}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: gradeColor + "22" }]}>
                <Text style={[styles.badgeText, { color: gradeColor }]}>
                  {stock.grade}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: c.text }]}>
              ₩{stock.currentPrice.toLocaleString()}
            </Text>
            <View
              style={[styles.boxBadge, { backgroundColor: boxColor + "18" }]}
            >
              <View style={[styles.boxDot, { backgroundColor: boxColor }]} />
              <Text style={[styles.boxText, { color: boxColor }]}>{boxPos}</Text>
            </View>
          </View>

          <View style={styles.themes}>
            {stock.themes.slice(0, 3).map((t) => (
              <View
                key={t}
                style={[styles.themeTag, { backgroundColor: c.backgroundTertiary }]}
              >
                <Text style={[styles.themeText, { color: c.textSecondary }]}>
                  {t}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.footer, { borderTopColor: c.separator }]}>
            <View style={styles.footerItem}>
              <Text style={[styles.footerLabel, { color: c.textTertiary }]}>
                12개월 예상
              </Text>
              <Text
                style={[
                  styles.footerValue,
                  { color: isPositive ? c.positive : c.negative },
                ]}
              >
                {isPositive ? "+" : ""}
                {latestForecast.changePercent.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={[styles.footerLabel, { color: c.textTertiary }]}>
                재무 평가
              </Text>
              <Text
                style={[
                  styles.footerValue,
                  {
                    color: stock.financials.evaluation.includes("저평가")
                      ? c.positive
                      : stock.financials.evaluation.includes("거품")
                      ? c.negative
                      : c.warning,
                  },
                ]}
              >
                {stock.financials.evaluation}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={[styles.footerLabel, { color: c.textTertiary }]}>
                진입 추천
              </Text>
              <Text style={[styles.footerValue, { color: c.tint }]}>
                ₩{formatPrice(stock.splitEntries[0].targetPrice)}
              </Text>
            </View>
            {!editMode && (
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  deleteArea: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 44,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  nameRow: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  ticker: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  price: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  boxBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  boxDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  boxText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  themes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  themeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  themeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
