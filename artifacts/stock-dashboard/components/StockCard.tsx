import React, { useEffect, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StockInfo, USD_KRW_RATE } from "@/constants/stockData";
import { LiveQuote } from "@/context/StockPriceContext";
import { calcBoxPosition } from "@/utils/boxPosition";

// Moved outside component – created once, not per render
function formatPrice(p: number): string {
  if (p >= 100000000) return `${(p / 100000000).toFixed(1)}억`;
  if (p >= 10000)     return `${Math.round(p / 10000)}만`;
  return p.toLocaleString();
}

interface StockCardProps {
  stock:    StockInfo;
  quote:    LiveQuote | null;
  signal?:  null;
  colors:   any;
  isDark:   boolean;
  onPress:  () => void;
  editMode?: boolean;
  onDelete?: () => void;
  isLast?:  boolean;
}

// useNativeDriver=true on native (translateX + opacity are supported),
// false on web (no native thread)
const USE_NATIVE = Platform.OS !== "web";

function StockCardInner({
  stock,
  quote,
  colors: c,
  isDark,
  onPress,
  editMode = false,
  onDelete,
  isLast = false,
}: StockCardProps) {
  const latestForecast =
    stock.forecasts.find((f) => f.period === "12개월 후" || f.period === "360일") ??
    stock.forecasts[Math.min(5, stock.forecasts.length - 1)];

  const displayPrice     = quote?.priceKRW      ?? stock.currentPrice;
  const rawChangePct     = quote ? quote.changePercent : null;
  const isLiveChange     = rawChangePct !== null;
  const displayChangePct = isLiveChange ? rawChangePct : (latestForecast?.changePercent ?? 0);
  const isPositiveChange = displayChangePct >= 0;

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: editMode ? 1 : 0,
      useNativeDriver: USE_NATIVE,
      tension: 120,
      friction: 14,
    }).start();
  }, [editMode]);

  const deleteOpacity = slideAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });
  const contentShift  = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 42] });

  const boxPos   = calcBoxPosition(stock.boxRange, quote);
  const boxColor = boxPos === "저점권" ? c.positiveGreen : boxPos === "고점권" ? c.positive : c.warning;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.deleteWrap, { opacity: deleteOpacity }]}
        pointerEvents={editMode ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="remove" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={USE_NATIVE
        ? { transform: [{ translateX: contentShift }] }
        : { transform: [{ translateX: contentShift }] }
      }>
        <TouchableOpacity
          style={[
            styles.row,
            { backgroundColor: c.card },
            !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
          ]}
          onPress={onPress}
          activeOpacity={editMode ? 1 : 0.6}
        >
          <View style={styles.left}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {stock.name}
              </Text>
            </View>
            <Text style={[styles.ticker, { color: c.textSecondary }]}>
              {stock.ticker}  ·  {stock.market}
            </Text>
          </View>

          <View style={styles.mid}>
            <View style={[styles.boxBadge, { backgroundColor: boxColor + "20" }]}>
              <Text style={[styles.boxText, { color: boxColor }]}>{boxPos}</Text>
            </View>
          </View>

          <View style={styles.right}>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: c.text }]}>₩{formatPrice(displayPrice)}</Text>
              {isLiveChange && <View style={styles.liveDot} />}
            </View>
            {stock.market === "NASDAQ" && (
              <Text style={[styles.usdPrice, { color: c.textTertiary }]}>
                ${(displayPrice / USD_KRW_RATE).toFixed(2)}
              </Text>
            )}
            <Text style={[styles.change, { color: isPositiveChange ? c.positive : c.negative }]}>
              {isPositiveChange ? "▲" : "▼"} {Math.abs(displayChangePct).toFixed(2)}%
              {!isLiveChange && " (예측)"}
            </Text>
          </View>

          {!editMode && (
            <Ionicons name="chevron-forward" size={14} color={c.textTertiary} style={styles.chevron} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// memo: skip re-render if props are shallowly equal
// quote reference changes only when THIS stock's price changes (passed from parent)
const StockCard = memo(StockCardInner, (prev, next) => {
  return (
    prev.editMode    === next.editMode   &&
    prev.isLast      === next.isLast     &&
    prev.stock.id    === next.stock.id   &&
    prev.isDark      === next.isDark     &&
    prev.colors      === next.colors     &&
    prev.quote       === next.quote
  );
});

export default StockCard;

const styles = StyleSheet.create({
  wrapper: { overflow: "hidden" },
  deleteWrap: {
    position: "absolute",
    left: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 1,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F04452",
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 64,
  },
  left: { flex: 1, gap: 4, marginRight: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ticker: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mid: { alignItems: "center", marginRight: 12 },
  boxBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  boxText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  right: { alignItems: "flex-end", gap: 3 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  price: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  usdPrice: { fontSize: 11, fontFamily: "Inter_400Regular" },
  change: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chevron: { marginLeft: 4 },
});
