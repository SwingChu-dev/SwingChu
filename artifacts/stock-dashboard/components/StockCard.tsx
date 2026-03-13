import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface StockCardProps {
  stock: StockInfo;
  onPress: () => void;
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

export default function StockCard({ stock, onPress }: StockCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

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
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.75}
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
          style={[
            styles.boxBadge,
            { backgroundColor: boxColor + "22" },
          ]}
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
            <Text style={[styles.themeText, { color: c.textSecondary }]}>{t}</Text>
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
                color:
                  stock.financials.evaluation.includes("저평가")
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
        <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
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
