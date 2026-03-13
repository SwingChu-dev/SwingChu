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
import { StockInfo, USD_KRW_RATE } from "@/constants/stockData";
import { SIGNAL_META } from "@/constants/smartMoney";
import { useSignals } from "@/context/SignalContext";

interface StockCardProps {
  stock: StockInfo;
  onPress: () => void;
  editMode?: boolean;
  onDelete?: () => void;
  isLast?: boolean;
}

export default function StockCard({
  stock,
  onPress,
  editMode = false,
  onDelete,
  isLast = false,
}: StockCardProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { getSignalForStock } = useSignals();
  const signal = getSignalForStock(stock.id);

  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: editMode ? 1 : 0,
      useNativeDriver: false,
      tension: 120,
      friction: 14,
    }).start();
  }, [editMode]);

  const deleteOpacity = slideAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });
  const contentShift = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 42] });

  const latestForecast =
    stock.forecasts.find((f) => f.period === "12개월 후" || f.period === "360일") ??
    stock.forecasts[Math.min(5, stock.forecasts.length - 1)];
  const forecastUp = latestForecast.changePercent >= 0;

  const boxPos = stock.boxRange.currentPosition;
  const boxColor =
    boxPos === "저점권" ? c.positiveGreen : boxPos === "고점권" ? c.positive : c.warning;

  const formatPrice = (p: number) => {
    if (p >= 100000000) return `${(p / 100000000).toFixed(1)}억`;
    if (p >= 10000) return `${Math.round(p / 10000)}만`;
    return p.toLocaleString();
  };

  const signalMeta = signal ? SIGNAL_META[signal.type] : null;

  return (
    <View style={{ overflow: "hidden" }}>
      <Animated.View
        style={[
          styles.deleteWrap,
          { opacity: deleteOpacity, pointerEvents: editMode ? "auto" : "none" },
        ]}
      >
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: "#F04452" }]}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="remove" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={{ transform: [{ translateX: contentShift }] }}>
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
              {signal && signal.isNew && (
                <View style={[styles.newDot, { backgroundColor: "#F04452" }]} />
              )}
            </View>
            <Text style={[styles.ticker, { color: c.textSecondary }]}>
              {stock.ticker}  ·  {stock.market}
            </Text>
          </View>

          <View style={styles.mid}>
            {signalMeta && signal ? (
              <View style={[styles.signalBadge, { backgroundColor: isDark ? signal.type === "세력이탈" || signal.type === "분산중" ? "#1B2744" : "#3A1218" : signalMeta.bg }]}>
                <Ionicons
                  name={signalMeta.icon as any}
                  size={11}
                  color={signalMeta.color}
                />
                <Text style={[styles.signalText, { color: signalMeta.color }]}>
                  {signal.type}
                </Text>
              </View>
            ) : (
              <View style={[styles.boxBadge, { backgroundColor: boxColor + "20" }]}>
                <Text style={[styles.boxText, { color: boxColor }]}>{boxPos}</Text>
              </View>
            )}
          </View>

          <View style={styles.right}>
            <Text style={[styles.price, { color: c.text }]}>
              ₩{formatPrice(stock.currentPrice)}
            </Text>
            {stock.market === "NASDAQ" && (
              <Text style={[styles.usdPrice, { color: c.textTertiary }]}>
                ${(stock.currentPrice / USD_KRW_RATE).toFixed(2)}
              </Text>
            )}
            <Text
              style={[
                styles.change,
                { color: forecastUp ? c.positive : c.negative },
              ]}
            >
              {forecastUp ? "▲" : "▼"} {Math.abs(latestForecast.changePercent).toFixed(1)}%
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

const styles = StyleSheet.create({
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
  left: {
    flex: 1,
    gap: 4,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  newDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ticker: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  mid: {
    alignItems: "center",
    marginRight: 12,
  },
  signalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  signalText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  boxBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  boxText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  right: {
    alignItems: "flex-end",
    gap: 3,
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  usdPrice: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  change: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  chevron: {
    marginLeft: 4,
  },
});
