import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAISignals, AISmartMoneySignal, SignalType, SignalStrength } from "@/context/AISignalContext";
import { useWatchlist } from "@/context/WatchlistContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1)   return "방금 전";
  if (diff < 60)  return `${Math.round(diff)}분 전`;
  if (diff < 1440) return `${Math.round(diff / 60)}시간 전`;
  return `${Math.round(diff / 1440)}일 전`;
}

// ─── 신호 메타 ────────────────────────────────────────────────────────────────

const SIGNAL_META: Record<SignalType, { icon: string; color: string; bg: string }> = {
  세력진입: { icon: "trending-up",     color: "#F04452", bg: "#FEF0F1" },
  세력이탈: { icon: "trending-down",   color: "#1B63E8", bg: "#EDF3FF" },
  매집중:   { icon: "layers-outline",  color: "#F04452", bg: "#FEF8F8" },
  분산중:   { icon: "git-branch",      color: "#FF6B00", bg: "#FFF4EC" },
  관망:     { icon: "eye-off-outline", color: "#8E8E93", bg: "#F2F4F6" },
};

const STRENGTH_META: Record<SignalStrength, { color: string; label: string }> = {
  강: { color: "#F04452", label: "강" },
  중: { color: "#FF6B00", label: "중" },
  약: { color: "#8E8E93", label: "약" },
};

// ─── 세력 사이클 가이드 ───────────────────────────────────────────────────────

const CYCLE_PHASES = [
  {
    phase: "1단계", name: "조용한 매집",
    icon: "layers-outline" as const, color: "#3B82F6", bg: "#EFF6FF", darkBg: "#1E2D4A",
    duration: "2~8주",
    description: "주가가 낮고 뉴스도 없을 때, 세력은 조용히 물량을 모읍니다. 거래량은 적지만 이상하게 안 빠지는 구간이에요.",
    signals: ["거래량 평균 이하인데 주가 방어", "기관 소폭 순매수 꾸준히 지속", "악재에도 주가 반응 둔감"],
    tip: "이 구간에서 매수하면 가장 유리하지만 언제 올라올지 몰라 기다리기 힘들어요.",
  },
  {
    phase: "2단계", name: "급등·상승 국면",
    icon: "trending-up" as const, color: "#F04452", bg: "#FEF0F1", darkBg: "#4A1E22",
    duration: "1~4주",
    description: "뉴스·테마가 터지며 거래량이 폭발합니다. 개인 투자자들이 뒤늦게 몰려들고 주가는 빠르게 오릅니다.",
    signals: ["거래량 3배 이상 급증 + 양봉 연속", "외국인·기관 동반 순매수", "뉴스·공시 호재 연속 등장", "RSI 70 이상 과매수 진입"],
    tip: "이 구간에 뛰어드는 건 위험해요. 세력은 이미 많이 올라온 상태에서 판매 준비를 시작합니다.",
  },
  {
    phase: "3단계", name: "슬그머니 분산",
    icon: "git-branch-outline" as const, color: "#FF6B00", bg: "#FFF4EC", darkBg: "#4A2E1E",
    duration: "1~3주",
    description: "주가가 고점 근처에서 횡보할 때, 세력은 조용히 팔기 시작합니다. 뉴스는 좋은데 주가가 안 오르는 이상한 느낌이 이 구간이에요.",
    signals: ["고점권 거래량 증가 + 위꼬리 긴 음봉", "기관 순매도 전환", "호재 뉴스에도 주가 반응 둔감", "RSI 하락 다이버전스"],
    tip: "이 신호가 보이면 서둘러 익절하는 게 좋아요.",
  },
  {
    phase: "4단계", name: "하락·청산",
    icon: "trending-down" as const, color: "#1B63E8", bg: "#EDF3FF", darkBg: "#1A2A4A",
    duration: "2~6주",
    description: "세력이 다 팔고 나면 주가는 떨어집니다. 이때 개인은 물려있고, 세력은 다음 종목으로 이동하거나 다시 저점 매집을 준비합니다.",
    signals: ["기관·외국인 동반 순매도", "거래량 없는 하락 지속", "악재 뉴스 연속 등장", "주가 지지선 연속 이탈"],
    tip: "이 구간에서 손절 타이밍을 놓치면 오래 물릴 수 있어요.",
  },
];

function CycleGuide({ isDark, c }: { isDark: boolean; c: any }) {
  const [open, setOpen] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
    Animated.timing(rotateAnim, { toValue: open ? 0 : 1, duration: 220, useNativeDriver: false }).start();
  };

  const arrowRotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={[styles.guideCard, { backgroundColor: c.card }]}>
      <TouchableOpacity style={styles.guideHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.guideHeaderLeft}>
          <View style={[styles.guideIconWrap, { backgroundColor: "#0064FF18" }]}>
            <Ionicons name="analytics" size={16} color="#0064FF" />
          </View>
          <View>
            <Text style={[styles.guideTitle, { color: c.text }]}>세력 움직임 사이클 가이드</Text>
            <Text style={[styles.guideSub, { color: c.textTertiary }]}>매집 → 상승 → 분산 → 하락 4단계 패턴</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
          <Ionicons name="chevron-down" size={18} color={c.textTertiary} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <View style={styles.guideBody}>
          <View style={[styles.guideDivider, { backgroundColor: c.separator }]} />
          <View style={styles.timelineStrip}>
            {CYCLE_PHASES.map((ph, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: ph.color }]} />
                {i < CYCLE_PHASES.length - 1 && <View style={[styles.timelineLine, { backgroundColor: c.separator }]} />}
              </View>
            ))}
          </View>
          <View style={styles.timelineLabelRow}>
            {CYCLE_PHASES.map((ph, i) => (
              <Text key={i} style={[styles.timelineLabel, { color: ph.color }]}>{ph.name}</Text>
            ))}
          </View>
          <View style={{ height: 12 }} />
          {CYCLE_PHASES.map((ph, i) => {
            const isExpanded = expandedPhase === i;
            const bgColor = isDark ? ph.darkBg : ph.bg;
            return (
              <View key={i} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.phaseRow, { backgroundColor: bgColor }]}
                  onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedPhase(p => p === i ? null : i); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.phaseIconWrap, { backgroundColor: ph.color + "28" }]}>
                    <Ionicons name={ph.icon} size={16} color={ph.color} />
                  </View>
                  <View style={styles.phaseInfo}>
                    <View style={styles.phaseNameRow}>
                      <Text style={[styles.phaseTag, { color: ph.color }]}>{ph.phase}</Text>
                      <Text style={[styles.phaseName, { color: isDark ? "#fff" : "#0E0E10" }]}>{ph.name}</Text>
                    </View>
                    <Text style={[styles.phaseDuration, { color: ph.color + "CC" }]}>평균 기간: {ph.duration}</Text>
                  </View>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={ph.color + "80"} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={[styles.phaseDetail, { backgroundColor: bgColor, borderTopColor: ph.color + "30" }]}>
                    <Text style={[styles.phaseDesc, { color: isDark ? "#E0E0E0" : "#2C2C2E" }]}>{ph.description}</Text>
                    <Text style={[styles.phaseSignalsTitle, { color: ph.color }]}>감지 신호</Text>
                    {ph.signals.map((s, si) => (
                      <View key={si} style={styles.phaseSignalRow}>
                        <View style={[styles.phaseBullet, { backgroundColor: ph.color }]} />
                        <Text style={[styles.phaseSignalText, { color: isDark ? "#C8C8C8" : "#3C3C3E" }]}>{s}</Text>
                      </View>
                    ))}
                    <View style={[styles.phaseTipBox, { backgroundColor: ph.color + "18", borderColor: ph.color + "40" }]}>
                      <Ionicons name="bulb-outline" size={13} color={ph.color} />
                      <Text style={[styles.phaseTipText, { color: ph.color }]}>{ph.tip}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          <View style={[styles.guideNote, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
            <Ionicons name="time-outline" size={12} color={c.textTertiary} />
            <Text style={[styles.guideNoteText, { color: c.textTertiary }]}>
              세력 사이클은 종목마다 다릅니다. 위 4단계는 일반적인 패턴이며, 단기 테마주는 사이클이 훨씬 짧고 급격합니다.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── 지표 배지 ────────────────────────────────────────────────────────────────

function IndicatorBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[indBadge.wrap, { backgroundColor: color + "18" }]}>
      <Text style={[indBadge.val, { color }]}>{value}</Text>
      <Text style={indBadge.lbl}>{label}</Text>
    </View>
  );
}

const indBadge = StyleSheet.create({
  wrap: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", minWidth: 60 },
  val:  { fontSize: 13, fontFamily: "Inter_700Bold" },
  lbl:  { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 1 },
});

// ─── 신호 카드 ────────────────────────────────────────────────────────────────

function SignalCard({ sig, stockId, stockName, isDark, c }: {
  sig: AISmartMoneySignal; stockId: string; stockName: string; isDark: boolean; c: any
}) {
  const [expanded, setExpanded] = useState(false);
  const meta     = SIGNAL_META[sig.type];
  const strength = STRENGTH_META[sig.strength];
  const isEntry  = sig.type === "세력진입" || sig.type === "매집중";
  const ind      = sig.indicators;

  const rsiColor = ind.rsi14 >= 70 ? "#F04452" : ind.rsi14 <= 35 ? "#05C072" : "#8E8E93";
  const macdColor = ind.macdHistogram > 0 ? "#F04452" : "#1B63E8";

  const instText = sig.institutionalNet !== 0
    ? `${sig.institutionalNet > 0 ? "+" : ""}${sig.institutionalNet.toLocaleString()}주`
    : "데이터 없음";
  const instColor = sig.institutionalNet > 0 ? "#F04452" : sig.institutionalNet < 0 ? "#1B63E8" : "#8E8E93";

  const fgnText = sig.foreignerNet !== 0
    ? `${sig.foreignerNet > 0 ? "+" : ""}${sig.foreignerNet.toLocaleString()}주`
    : "데이터 없음";
  const fgnColor = sig.foreignerNet > 0 ? "#F04452" : sig.foreignerNet < 0 ? "#1B63E8" : "#8E8E93";

  return (
    <TouchableOpacity
      style={[styles.sigCard, { backgroundColor: c.card }]}
      onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(v => !v); }}
      activeOpacity={0.8}
    >
      {/* ── 헤더 ── */}
      <View style={styles.sigTop}>
        <View style={styles.sigTopLeft}>
          <View style={[styles.sigTypePill, { backgroundColor: isDark ? meta.color + "20" : meta.bg }]}>
            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.sigTypeText, { color: meta.color }]}>{sig.type}</Text>
            <View style={[styles.strengthDot, { backgroundColor: strength.color }]} />
            <Text style={[styles.strengthText, { color: strength.color }]}>{sig.strength}도</Text>
          </View>
          <View style={[styles.aiBadge]}>
            <Ionicons name="sparkles" size={10} color="#7C3AED" />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.sigTime, { color: c.textTertiary }]}>{timeAgo(sig.generatedAt)}</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/stock/[id]", params: { id: stockId } })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="open-outline" size={14} color={c.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 종목명 ── */}
      <View style={styles.sigNameRow}>
        <Text style={[styles.sigStockName, { color: c.text }]}>{stockName}</Text>
        <Text style={[styles.sigTicker, { color: c.textSecondary }]}>{sig.ticker}  ·  {sig.market}</Text>
      </View>

      {/* ── AI 요약 ── */}
      <Text style={[styles.sigSummary, { color: c.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
        {sig.summary}
      </Text>

      {/* ── 핵심 지표 ── */}
      <View style={[styles.metricsRow, { borderTopColor: c.separator }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: rsiColor }]}>{ind.rsi14}</Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>RSI-14</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: ind.volumeRatio >= 2 ? "#F04452" : c.text }]}>
            {ind.volumeRatio.toFixed(1)}×
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>거래량</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: instColor }]}>{instText}</Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>기관</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: fgnColor }]}>{fgnText}</Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>외국인</Text>
        </View>
      </View>

      {/* ── 확장: 기술 지표 + 신호 태그 ── */}
      {expanded && (
        <View style={styles.expandedWrap}>
          <Text style={[styles.expandTitle, { color: c.textSecondary }]}>기술적 지표</Text>
          <View style={styles.indGrid}>
            <IndicatorBadge label="MACD" value={`${ind.macd > 0 ? "+" : ""}${ind.macd.toFixed(2)}`} color={macdColor} />
            <IndicatorBadge label="히스토그램" value={`${ind.macdHistogram > 0 ? "+" : ""}${ind.macdHistogram.toFixed(2)}`} color={macdColor} />
            <IndicatorBadge label="BB폭" value={`${ind.bbWidth.toFixed(1)}%`} color="#8E8E93" />
            <IndicatorBadge label="MA5/20" value={`${ind.ma5 > ind.ma20 ? "↑" : "↓"}정배열`} color={ind.ma5 > ind.ma20 ? "#F04452" : "#1B63E8"} />
            <IndicatorBadge label="52주위치" value={`${Math.round(ind.pct52Range * 100)}%`} color={ind.pct52Range > 0.7 ? "#F04452" : "#05C072"} />
            <IndicatorBadge label="고점대비" value={`${ind.distFrom52High.toFixed(1)}%`} color={ind.distFrom52High >= -5 ? "#F04452" : "#05C072"} />
          </View>

          <Text style={[styles.expandTitle, { color: c.textSecondary, marginTop: 10 }]}>감지 신호</Text>
          <View style={styles.sigTags}>
            {sig.signals.map((s, i) => (
              <View key={i} style={[styles.sigTag, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
                <Text style={[styles.sigTagText, { color: c.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.expandToggle, { borderTopColor: c.separator }]}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(v => !v); }}
      >
        <Text style={[styles.expandToggleText, { color: c.tint }]}>
          {expanded ? "접기" : "지표 상세 보기"}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={c.tint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function SignalsScreen() {
  const isDark = useColorScheme() === "dark";
  const c      = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { smartMoneySignals, loading, lastFetch, refresh } = useAISignals();
  const { watchlistStocks } = useWatchlist();

  const allSignals = useMemo(() => {
    return watchlistStocks
      .map(stock => {
        const sig = smartMoneySignals[stock.ticker];
        if (!sig) return null;
        return { sig, stock };
      })
      .filter((x): x is { sig: AISmartMoneySignal; stock: typeof watchlistStocks[0] } => x !== null)
      .sort((a, b) => {
        const order: Record<string, number> = { 세력진입: 0, 매집중: 1, 세력이탈: 2, 분산중: 3, 관망: 4 };
        return (order[a.sig.type] ?? 5) - (order[b.sig.type] ?? 5);
      });
  }, [smartMoneySignals, watchlistStocks]);

  const entrySignals = allSignals.filter(({ sig }) => sig.type === "세력진입" || sig.type === "매집중");
  const exitSignals  = allSignals.filter(({ sig }) => sig.type === "세력이탈" || sig.type === "분산중");
  const watchSignals = allSignals.filter(({ sig }) => sig.type === "관망");

  const lastUpdate = lastFetch
    ? new Date(lastFetch).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.headerTitle, { color: c.text }]}>세력 감지</Text>
            <View style={styles.aiLabel}>
              <Ionicons name="sparkles" size={11} color="#7C3AED" />
              <Text style={styles.aiLabelText}>Claude AI</Text>
            </View>
          </View>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            수급 · 기술지표 · AI 분석
            {lastUpdate ? `  ·  ${lastUpdate} 기준` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={refresh} disabled={loading} style={styles.refreshBtn}>
          {loading
            ? <ActivityIndicator size="small" color={c.tint} />
            : <Ionicons name="refresh" size={18} color={c.tint} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.tint} />}
      >
        {/* 사이클 가이드 */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <CycleGuide isDark={isDark} c={c} />
        </View>

        {/* 로딩 */}
        {loading && allSignals.length === 0 && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>
              AI 신호 분석 중...
            </Text>
            <Text style={[styles.loadingSubText, { color: c.textTertiary }]}>
              Claude가 실시간 지표를 분석하고 있습니다
            </Text>
          </View>
        )}

        {/* 매수 신호 */}
        {entrySignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#F04452" }]} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>매수 신호</Text>
              <View style={[styles.countBadge, { backgroundColor: "#F0445218" }]}>
                <Text style={[styles.countBadgeText, { color: "#F04452" }]}>{entrySignals.length}</Text>
              </View>
            </View>
            {entrySignals.map(({ sig, stock }) => (
              <SignalCard key={stock.ticker} sig={sig} stockId={stock.id} stockName={stock.name} isDark={isDark} c={c} />
            ))}
          </View>
        )}

        {/* 매도 신호 */}
        {exitSignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#1B63E8" }]} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>매도 신호</Text>
              <View style={[styles.countBadge, { backgroundColor: "#1B63E818" }]}>
                <Text style={[styles.countBadgeText, { color: "#1B63E8" }]}>{exitSignals.length}</Text>
              </View>
            </View>
            {exitSignals.map(({ sig, stock }) => (
              <SignalCard key={stock.ticker} sig={sig} stockId={stock.id} stockName={stock.name} isDark={isDark} c={c} />
            ))}
          </View>
        )}

        {/* 관망 신호 */}
        {watchSignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#8E8E93" }]} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>관망 종목</Text>
              <View style={[styles.countBadge, { backgroundColor: "#8E8E9318" }]}>
                <Text style={[styles.countBadgeText, { color: "#8E8E93" }]}>{watchSignals.length}</Text>
              </View>
            </View>
            {watchSignals.map(({ sig, stock }) => (
              <SignalCard key={stock.ticker} sig={sig} stockId={stock.id} stockName={stock.name} isDark={isDark} c={c} />
            ))}
          </View>
        )}

        {/* 신호 없음 */}
        {!loading && allSignals.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="eye-off-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>감지된 신호 없음</Text>
            <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
              워치리스트 종목의 AI 분석이 완료되면{"\n"}이상 매매 패턴이 여기에 표시됩니다
            </Text>
            <TouchableOpacity style={[styles.refreshBtnLarge, { backgroundColor: "#7C3AED18" }]} onPress={refresh}>
              <Ionicons name="sparkles" size={16} color="#7C3AED" />
              <Text style={[styles.refreshBtnLargeText, { color: "#7C3AED" }]}>AI 분석 시작</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  aiLabel: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#7C3AED18", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  aiLabelText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#7C3AED" },
  refreshBtn: { padding: 6 },

  loadingWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  loadingSubText: { fontSize: 12, fontFamily: "Inter_400Regular" },

  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  countBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },

  sigCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: "hidden" },
  sigTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 10 },
  sigTopLeft: { flexDirection: "row", gap: 6, alignItems: "center" },
  sigTypePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sigTypeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  strengthDot: { width: 4, height: 4, borderRadius: 2, marginLeft: 2 },
  strengthText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#7C3AED18", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  aiBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#7C3AED" },
  sigTime: { fontSize: 11, fontFamily: "Inter_400Regular" },

  sigNameRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  sigStockName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sigTicker: { fontSize: 13, fontFamily: "Inter_400Regular" },

  sigSummary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, paddingHorizontal: 16, paddingBottom: 12 },

  metricsRow: {
    flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  metricLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  metricDivider: { width: StyleSheet.hairlineWidth, marginVertical: 4 },

  expandedWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  expandTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  indGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  sigTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  sigTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sigTagText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  expandToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  expandToggleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  emptyWrap: { alignItems: "center", paddingVertical: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  refreshBtnLarge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  refreshBtnLargeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Cycle guide styles
  guideCard: { borderRadius: 16, overflow: "hidden" },
  guideHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  guideHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  guideIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  guideTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  guideSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  guideBody: { paddingHorizontal: 14, paddingBottom: 14 },
  guideDivider: { height: StyleSheet.hairlineWidth, marginBottom: 14 },
  timelineStrip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  timelineItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { flex: 1, height: 2 },
  timelineLabelRow: { flexDirection: "row", paddingHorizontal: 2, marginTop: 5 },
  timelineLabel: { flex: 1, fontSize: 9, fontFamily: "Inter_600SemiBold" },
  phaseRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, gap: 10 },
  phaseIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  phaseInfo: { flex: 1 },
  phaseNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  phaseTag: { fontSize: 10, fontFamily: "Inter_700Bold" },
  phaseName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  phaseDuration: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  phaseDetail: { borderRadius: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 12, borderTopWidth: 1, gap: 8, marginTop: -6 },
  phaseDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  phaseSignalsTitle: { fontSize: 11, fontFamily: "Inter_700Bold", marginTop: 4 },
  phaseSignalRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  phaseBullet: { width: 4, height: 4, borderRadius: 2, marginTop: 7 },
  phaseSignalText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  phaseTipBox: { flexDirection: "row", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: "flex-start", marginTop: 4 },
  phaseTipText: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18, flex: 1 },
  guideNote: { flexDirection: "row", gap: 6, padding: 10, borderRadius: 10, alignItems: "flex-start", marginTop: 4 },
  guideNoteText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});
