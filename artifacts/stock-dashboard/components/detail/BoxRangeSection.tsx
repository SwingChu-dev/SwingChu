import React from "react";
import { View, Text, StyleSheet, useColorScheme, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";
import { useTechnicals } from "@/hooks/useTechnicals";

type BoxPos = "저점권" | "중간권" | "고점권";

interface BoxRangeSectionProps {
  stock:      StockInfo;
  livePrice?: number;
  dynBoxPos?: BoxPos;
}

function fmt(n: number) { return n.toLocaleString("ko-KR"); }
function fmtPct(n: number) { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }

export default function BoxRangeSection({ stock, livePrice, dynBoxPos }: BoxRangeSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const { support, resistance } = stock.boxRange;
  const range = resistance - support;

  const currentPos: number   = livePrice && livePrice > 0 ? livePrice : stock.currentPrice;
  const currentPosition: BoxPos = dynBoxPos ?? (stock.boxRange.currentPosition as BoxPos);
  const posRatio = range > 0 ? Math.max(0, Math.min(1, (currentPos - support) / range)) : 0.5;
  const isLive   = !!(livePrice && livePrice > 0 && dynBoxPos);

  const { ma5, ma20, trendUp, disparity5, disparity20, loading: techLoading } =
    useTechnicals(stock.ticker, stock.market, currentPos);

  const posColor =
    currentPosition === "저점권" ? c.positive :
    currentPosition === "고점권" ? c.negative : c.warning;

  // ── 추세 기반 진입 타점 조정 ───────────────────────────────────────
  // 하락 추세면 지지선 -4% (중간값) 로 조정
  const adjustedEntry = trendUp === false ? Math.round(support * 0.96) : support;
  const entryLabel    = trendUp === false
    ? `조정 진입가 (지지선 -4%)`
    : trendUp === true
    ? `1차 진입가 (지지선)`
    : `진입가 (지지선)`;

  // ── 이격도 신호 ────────────────────────────────────────────────────
  // 매수: 이격도 -5% ~ 0% → 안전 진입
  // 매도: 이격도 +5% 이상 → 단기 과열
  const buySignal  = disparity20 !== null && disparity20 >= -5 && disparity20 <= 0;
  const sellSignal = disparity5  !== null && disparity5  >= 5;

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      {/* 헤더 */}
      <View style={styles.sectionHeader}>
        <Ionicons name="stats-chart" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>박스권 + 추세 분석</Text>
        {isLive && (
          <View style={[styles.liveBadge, { backgroundColor: "#F04452" + "18" }]}>
            <View style={styles.liveDot} />
            <Text style={[styles.liveTxt, { color: "#F04452" }]}>실시간</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* 지지/저항 레이블 */}
        <View style={styles.labels}>
          <View style={styles.labelItem}>
            <View style={[styles.dot, { backgroundColor: c.positive }]} />
            <View>
              <Text style={[styles.labelTitle, { color: c.textTertiary }]}>저점 (지지선)</Text>
              <Text style={[styles.labelPrice, { color: c.text }]}>₩{fmt(support)}</Text>
            </View>
          </View>
          <View style={styles.labelItem}>
            <View style={[styles.dot, { backgroundColor: c.negative }]} />
            <View>
              <Text style={[styles.labelTitle, { color: c.textTertiary }]}>고점 (저항선)</Text>
              <Text style={[styles.labelPrice, { color: c.text }]}>₩{fmt(resistance)}</Text>
            </View>
          </View>
        </View>

        {/* 박스권 바 */}
        <View style={[styles.barTrack, { backgroundColor: c.backgroundTertiary }]}>
          <View style={[styles.barFill, { width: `${posRatio * 100}%` as any, backgroundColor: posColor }]} />
          <View style={[styles.currentIndicator, { left: `${posRatio * 100}%` as any, backgroundColor: posColor }]} />
        </View>

        {/* 현재가 + 포지션 */}
        <View style={styles.positionRow}>
          <View>
            <Text style={[styles.positionLabel, { color: c.textTertiary }]}>현재가</Text>
            <Text style={[styles.positionPrice, { color: c.text }]}>₩{fmt(currentPos)}</Text>
          </View>
          <View style={[styles.positionBadge, { backgroundColor: posColor + "22" }]}>
            <View style={[styles.positionDot, { backgroundColor: posColor }]} />
            <Text style={[styles.positionText, { color: posColor }]}>{currentPosition}</Text>
          </View>
        </View>

        {/* ── 추세(MA20) 섹션 ─────────────────────────────────────────── */}
        <View style={[styles.trendCard, { backgroundColor: c.backgroundTertiary }]}>
          <View style={styles.trendHeader}>
            <Ionicons
              name={trendUp === true ? "trending-up" : trendUp === false ? "trending-down" : "remove"}
              size={16}
              color={trendUp === true ? c.positive : trendUp === false ? c.negative : c.textTertiary}
            />
            <Text style={[styles.trendTitle, { color: c.text }]}>20일 이동평균선 추세</Text>
            {techLoading && <ActivityIndicator size="small" color={c.tint} style={{ marginLeft: 4 }} />}
            {!techLoading && trendUp !== null && (
              <View style={[styles.trendBadge, {
                backgroundColor: trendUp ? c.positive + "22" : c.negative + "22"
              }]}>
                <Text style={[styles.trendBadgeText, { color: trendUp ? c.positive : c.negative }]}>
                  {trendUp ? "우상향 ↗" : "하향 ↘"}
                </Text>
              </View>
            )}
          </View>

          {/* MA5/MA20 값 */}
          {!techLoading && (ma5 || ma20) && (
            <View style={styles.maRow}>
              {ma5 && (
                <View style={styles.maItem}>
                  <Text style={[styles.maLabel, { color: c.textTertiary }]}>MA5</Text>
                  <Text style={[styles.maValue, { color: c.text }]}>₩{fmt(Math.round(ma5))}</Text>
                </View>
              )}
              {ma20 && (
                <View style={styles.maItem}>
                  <Text style={[styles.maLabel, { color: c.textTertiary }]}>MA20</Text>
                  <Text style={[styles.maValue, { color: c.text }]}>₩{fmt(Math.round(ma20))}</Text>
                </View>
              )}
            </View>
          )}

          {/* 추세 기반 진입 타점 */}
          <View style={[styles.entryBox, {
            backgroundColor: trendUp === false ? c.negative + "12" : c.positive + "12",
            borderColor:      trendUp === false ? c.negative + "30" : c.positive + "30",
          }]}>
            <View style={styles.entryBoxTop}>
              <Ionicons
                name={trendUp === false ? "warning-outline" : "checkmark-circle-outline"}
                size={14}
                color={trendUp === false ? c.negative : c.positive}
              />
              <Text style={[styles.entryBoxLabel, { color: trendUp === false ? c.negative : c.positive }]}>
                {entryLabel}
              </Text>
            </View>
            <Text style={[styles.entryBoxPrice, { color: c.text }]}>₩{fmt(adjustedEntry)}</Text>
            {trendUp === false && (
              <Text style={[styles.entryBoxNote, { color: c.textTertiary }]}>
                20일선 하향 → 지지선보다 -4% 낮은 지점 확인 후 진입 권장
              </Text>
            )}
            {trendUp === true && (
              <Text style={[styles.entryBoxNote, { color: c.textTertiary }]}>
                20일선 우상향 → 지지선 ₩{fmt(support)} 터치 시 1차 진입 적기
              </Text>
            )}
          </View>
        </View>

        {/* ── 이격도 섹션 ──────────────────────────────────────────────── */}
        <View style={[styles.disparityCard, { backgroundColor: c.backgroundTertiary }]}>
          <View style={styles.trendHeader}>
            <Ionicons name="pulse" size={16} color={c.tint} />
            <Text style={[styles.trendTitle, { color: c.text }]}>이격도 (과열/침체 신호)</Text>
          </View>

          {techLoading ? (
            <ActivityIndicator size="small" color={c.tint} style={{ marginVertical: 8 }} />
          ) : (
            <>
              <View style={styles.disparityRow}>
                {disparity5 !== null && (
                  <View style={styles.disparityItem}>
                    <Text style={[styles.disparityLabel, { color: c.textTertiary }]}>5일선 이격</Text>
                    <Text style={[styles.disparityValue, {
                      color: Math.abs(disparity5) >= 5
                        ? (disparity5 > 0 ? c.negative : c.positive)
                        : c.text
                    }]}>
                      {fmtPct(disparity5)}
                    </Text>
                  </View>
                )}
                {disparity20 !== null && (
                  <View style={styles.disparityItem}>
                    <Text style={[styles.disparityLabel, { color: c.textTertiary }]}>20일선 이격</Text>
                    <Text style={[styles.disparityValue, {
                      color: disparity20 >= -5 && disparity20 <= 0 ? c.positive : c.text
                    }]}>
                      {fmtPct(disparity20)}
                    </Text>
                  </View>
                )}
              </View>

              {/* 신호 배너 */}
              {buySignal && (
                <View style={[styles.signalBanner, { backgroundColor: c.positive + "18", borderColor: c.positive + "40" }]}>
                  <Ionicons name="shield-checkmark" size={14} color={c.positive} />
                  <Text style={[styles.signalText, { color: c.positive }]}>
                    안전 진입 — 20일선 근접 (이격도 {fmtPct(disparity20!)})
                  </Text>
                </View>
              )}
              {sellSignal && (
                <View style={[styles.signalBanner, { backgroundColor: c.negative + "18", borderColor: c.negative + "40" }]}>
                  <Ionicons name="flame" size={14} color={c.negative} />
                  <Text style={[styles.signalText, { color: c.negative }]}>
                    단기 과열, 익절 준비 — 5일선 대비 {fmtPct(disparity5!)} 이격
                  </Text>
                </View>
              )}
              {!buySignal && !sellSignal && disparity20 !== null && (
                <View style={[styles.signalBanner, { backgroundColor: c.warning + "18", borderColor: c.warning + "40" }]}>
                  <Ionicons name="remove-circle-outline" size={14} color={c.warning} />
                  <Text style={[styles.signalText, { color: c.warning }]}>
                    중립 구간 — 20일선과 {fmtPct(Math.abs(disparity20))} 이격
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* 기존 전략 텍스트 */}
        <View style={[styles.strategy, { backgroundColor: c.backgroundTertiary }]}>
          <Text style={[styles.strategyTitle, { color: c.text }]}>
            {currentPosition === "저점권" ? "저점 진입 전략"
              : currentPosition === "고점권" ? "고점 주의 전략"
              : "중간 관망 전략"}
          </Text>
          <Text style={[styles.strategyText, { color: c.textSecondary }]}>
            {currentPosition === "저점권"
              ? `박스권 저점 근처. 지지선 ₩${fmt(support)} 확인 후 분할 진입 적기. 손절은 지지선 -5% 설정.`
              : currentPosition === "고점권"
              ? `박스권 상단 근처. 저항선 ₩${fmt(resistance)} 근처 신규 매수 자제. 기존 보유자는 일부 익절 고려.`
              : `박스권 중간 구간. 방향성 확인 후 진입 권장. 추가 하락 시 저점 분할매수, 상승 돌파 시 추격 매수 가능.`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 16, borderWidth: 1, marginHorizontal: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, paddingBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: "#F04452" },
  liveTxt:   { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  content:   { padding: 16, paddingTop: 0 },
  labels:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  labelItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  labelTitle:{ fontSize: 11, fontFamily: "Inter_400Regular" },
  labelPrice:{ fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  barTrack:  { height: 10, borderRadius: 5, marginBottom: 16, position: "relative", overflow: "visible" },
  barFill:   { height: "100%", borderRadius: 5 },
  currentIndicator: { position: "absolute", top: -4, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: "#FFF", marginLeft: -9 },
  positionRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  positionLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  positionPrice: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  positionBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  positionDot:   { width: 6, height: 6, borderRadius: 3 },
  positionText:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // 추세 카드
  trendCard:    { borderRadius: 12, padding: 12, marginBottom: 10 },
  trendHeader:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  trendTitle:   { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  trendBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  trendBadgeText:{ fontSize: 11, fontFamily: "Inter_700Bold" },
  maRow:        { flexDirection: "row", gap: 16, marginBottom: 10 },
  maItem:       { flex: 1 },
  maLabel:      { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  maValue:      { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  entryBox:     { borderRadius: 10, borderWidth: 1, padding: 10, gap: 3 },
  entryBoxTop:  { flexDirection: "row", alignItems: "center", gap: 5 },
  entryBoxLabel:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
  entryBoxPrice:{ fontSize: 18, fontFamily: "Inter_700Bold", marginLeft: 20 },
  entryBoxNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 20, lineHeight: 16 },

  // 이격도 카드
  disparityCard: { borderRadius: 12, padding: 12, marginBottom: 10 },
  disparityRow:  { flexDirection: "row", gap: 16, marginBottom: 10 },
  disparityItem: { flex: 1 },
  disparityLabel:{ fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  disparityValue:{ fontSize: 20, fontFamily: "Inter_700Bold" },
  signalBanner:  { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, padding: 8 },
  signalText:    { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },

  // 기존 전략
  strategy:      { padding: 12, borderRadius: 10, marginTop: 0 },
  strategyTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  strategyText:  { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
