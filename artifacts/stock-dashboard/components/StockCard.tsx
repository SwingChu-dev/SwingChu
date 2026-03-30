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
import { AISmartMoneySignal } from "@/context/AISignalContext";
import { calcBoxPosition } from "@/utils/boxPosition";

function formatPrice(p: number): string {
  if (p >= 100000000) return `${(p / 100000000).toFixed(1)}억`;
  if (p >= 10000)     return `${Math.round(p / 10000)}만`;
  return p.toLocaleString();
}

// MA5/20/60 + RSI + BB 종합 구간 판단
// 단기~중기 이동평균 배열 우선, RSI·BB로 보정
function zoneFromIndicators(ind: AISmartMoneySignal["indicators"]): "저점권" | "중간권" | "고점권" {
  const { rsi14, ma5, ma20, ma60, bbUpper, bbLower, currentPrice } = ind;

  const bbRange = bbUpper - bbLower;
  const bbPos   = bbRange > 0 ? (currentPrice - bbLower) / bbRange : 0.5;

  const isFullBull = ma5 > ma20 && ma20 > ma60; // 완전 정배열
  const isFullBear = ma5 < ma20 && ma20 < ma60; // 완전 역배열

  // ── 저점권 스코어 ────────────────────────────────────────────
  // MA 역배열 / 현재가 각 선 아래 / RSI 과매도
  const lowScore =
    (isFullBear ? 2 : ma5 < ma20 ? 1 : 0) +           // MA 배열
    (currentPrice < ma20 ? 1 : 0) +                    // 단기 이평 아래
    (currentPrice < ma60 ? 1 : 0) +                    // 중기 이평 아래
    (rsi14 <= 35 ? 2 : rsi14 <= 45 ? 1 : 0) +         // RSI 과매도
    (bbPos <= 0.20 ? 1 : 0);                           // BB 하단

  // ── 고점권 스코어 ────────────────────────────────────────────
  // MA 완전 정배열 + RSI 과매수 + BB 상단
  const highScore =
    (isFullBull ? 2 : ma5 > ma20 ? 1 : 0) +           // MA 배열
    (currentPrice > ma20 && currentPrice > ma60 ? 1 : 0) + // 이평 위
    (rsi14 >= 70 ? 2 : rsi14 >= 63 ? 1 : 0) +         // RSI 과매수
    (bbPos >= 0.80 ? 1 : 0);                           // BB 상단

  if (lowScore  >= 3) return "저점권";
  if (highScore >= 3) return "고점권";
  return "중간권";
}

// 세력진입 조건: AI가 진입/매집 판단 + 강도 중~강
function isSmartEntry(sig: AISmartMoneySignal): boolean {
  if (sig.type !== "세력진입" && sig.type !== "매집중") return false;
  if (sig.strength === "약") return false;
  // 이중 검증: 거래량 기준도 만족해야
  const { volumeRatio, rsi14, macdHistogram } = sig.indicators;
  return volumeRatio >= 1.5 && rsi14 >= 30 && rsi14 <= 62 && macdHistogram > -1;
}

interface StockCardProps {
  stock:    StockInfo;
  quote:    LiveQuote | null;
  signal:   AISmartMoneySignal | null;
  colors:   any;
  isDark:   boolean;
  onPress:  () => void;
  editMode?: boolean;
  onDelete?: () => void;
  isLast?:  boolean;
}

const USE_NATIVE = Platform.OS !== "web";

function StockCardInner({
  stock,
  quote,
  signal,
  colors: c,
  isDark,
  onPress,
  editMode = false,
  onDelete,
  isLast = false,
}: StockCardProps) {
  const displayPrice     = quote?.priceKRW ?? stock.currentPrice;
  const rawChangePct     = quote ? quote.changePercent : null;
  const isLiveChange     = rawChangePct !== null;
  const displayChangePct = isLiveChange ? rawChangePct : 0;
  const isPositiveChange = displayChangePct >= 0;

  // 구간 판단: AI 지표 우선, 없으면 boxRange 기반
  const boxPos = signal?.indicators
    ? zoneFromIndicators(signal.indicators)
    : calcBoxPosition(stock.boxRange, quote);

  const boxColor =
    boxPos === "저점권" ? c.positiveGreen :
    boxPos === "고점권" ? c.positive      : c.warning;

  // 세력진입 마크
  const showEntryMark = signal ? isSmartEntry(signal) : false;

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

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.deleteWrap, { opacity: deleteOpacity }]}
        pointerEvents={editMode ? "auto" : "none"}
      >
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
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
          {/* ── 왼쪽: 종목명 + 티커 ── */}
          <View style={styles.left}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {stock.name}
              </Text>
              {showEntryMark && (
                <View style={styles.entryMark}>
                  <Ionicons name="flash" size={10} color="#F04452" />
                  <Text style={styles.entryMarkText}>진입</Text>
                </View>
              )}
            </View>
            <Text style={[styles.ticker, { color: c.textSecondary }]}>
              {stock.ticker}  ·  {stock.market}
            </Text>
          </View>

          {/* ── 가운데: 구간 배지 + 기술 지표 ── */}
          <View style={styles.mid}>
            <View style={[styles.boxBadge, { backgroundColor: boxColor + "20" }]}>
              <Text style={[styles.boxText, { color: boxColor }]}>{boxPos}</Text>
            </View>
            {signal?.indicators && (() => {
              const { rsi14, volumeRatio, ma20, currentPrice } = signal.indicators;
              const rsiColor =
                rsi14 >= 70 ? "#F04452" :
                rsi14 <= 30 ? "#1B63E8" : c.textTertiary;
              const rsiLabel =
                rsi14 >= 70 ? `RSI ${rsi14}▲` :
                rsi14 <= 30 ? `RSI ${rsi14}▼` : `RSI ${rsi14}`;
              const ma20Dev = ma20 > 0
                ? +((currentPrice - ma20) / ma20 * 100).toFixed(1)
                : null;
              const showVol = volumeRatio >= 1.8;
              return (
                <View style={styles.indicatorRow}>
                  <Text style={[styles.rsiText, { color: rsiColor }]}>{rsiLabel}</Text>
                  {showVol && (
                    <View style={[styles.volBadge, { backgroundColor: "#FF6B0018" }]}>
                      <Text style={styles.volText}>Vol {volumeRatio.toFixed(1)}x</Text>
                    </View>
                  )}
                  {ma20Dev !== null && (
                    <Text style={[styles.maDevText, {
                      color: ma20Dev >= 0 ? c.positive : c.negative,
                    }]}>
                      MA {ma20Dev >= 0 ? "+" : ""}{ma20Dev}%
                    </Text>
                  )}
                </View>
              );
            })()}
          </View>

          {/* ── 오른쪽: 가격 + 등락 ── */}
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
            {isLiveChange && (
              <Text style={[styles.change, { color: isPositiveChange ? c.positive : c.negative }]}>
                {isPositiveChange ? "▲" : "▼"} {Math.abs(displayChangePct).toFixed(2)}%
              </Text>
            )}
          </View>

          {!editMode && (
            <Ionicons name="chevron-forward" size={14} color={c.textTertiary} style={styles.chevron} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const StockCard = memo(StockCardInner, (prev, next) => {
  return (
    prev.editMode    === next.editMode   &&
    prev.isLast      === next.isLast     &&
    prev.stock.id    === next.stock.id   &&
    prev.isDark      === next.isDark     &&
    prev.colors      === next.colors     &&
    prev.quote       === next.quote      &&
    prev.signal      === next.signal
  );
});

export default StockCard;

const styles = StyleSheet.create({
  wrapper:    { overflow: "hidden" },
  deleteWrap: { position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 },
  deleteBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F04452", justifyContent: "center", alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 64,
  },
  left:    { flex: 1, gap: 4, marginRight: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "nowrap" },
  name:    { fontSize: 15, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  entryMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#F0445218",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  entryMarkText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#F04452" },
  ticker:  { fontSize: 12, fontFamily: "Inter_400Regular" },
  mid:          { alignItems: "center", marginRight: 12, gap: 3 },
  boxBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  boxText:      { fontSize: 10, fontFamily: "Inter_500Medium" },
  indicatorRow: { alignItems: "center", gap: 2 },
  rsiText:      { fontSize: 9, fontFamily: "Inter_500Medium" },
  volBadge:     { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  volText:      { fontSize: 8, fontFamily: "Inter_700Bold", color: "#FF6B00" },
  maDevText:    { fontSize: 8, fontFamily: "Inter_400Regular" },
  right:   { alignItems: "flex-end", gap: 3 },
  priceRow:{ flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  price:   { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  usdPrice:{ fontSize: 11, fontFamily: "Inter_400Regular" },
  change:  { fontSize: 12, fontFamily: "Inter_500Medium" },
  chevron: { marginLeft: 4 },
});
