import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useSignals } from "@/context/SignalContext";
import { SIGNAL_META, STRENGTH_META, SmartMoneySignal } from "@/constants/smartMoney";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 60000;
  if (diff < 60) return `${Math.round(diff)}분 전`;
  if (diff < 1440) return `${Math.round(diff / 60)}시간 전`;
  return `${Math.round(diff / 1440)}일 전`;
}

const CYCLE_PHASES = [
  {
    phase: "1단계",
    name: "조용한 매집",
    icon: "layers-outline" as const,
    color: "#3B82F6",
    bg: "#EFF6FF",
    darkBg: "#1E2D4A",
    duration: "2~8주",
    description: "주가가 낮고 뉴스도 없을 때, 세력은 조용히 물량을 모읍니다. 거래량은 적지만 이상하게 안 빠지는 구간이에요.",
    signals: ["거래량 평균 이하인데 주가 방어", "기관 소폭 순매수 꾸준히 지속", "악재에도 주가 반응 둔감"],
    tip: "이 구간에서 매수하면 가장 유리하지만 언제 올라올지 몰라 기다리기 힘들어요.",
  },
  {
    phase: "2단계",
    name: "급등·상승 국면",
    icon: "trending-up" as const,
    color: "#F04452",
    bg: "#FEF0F1",
    darkBg: "#4A1E22",
    duration: "1~4주",
    description: "뉴스·테마가 터지며 거래량이 폭발합니다. 개인 투자자들이 뒤늦게 몰려들고 주가는 빠르게 오릅니다.",
    signals: ["거래량 3배 이상 급증 + 양봉 연속", "외국인·기관 동반 순매수", "뉴스·공시 호재 연속 등장", "RSI 70 이상 과매수 진입"],
    tip: "이 구간에 뛰어드는 건 위험해요. 세력은 이미 많이 올라온 상태에서 판매 준비를 시작합니다.",
  },
  {
    phase: "3단계",
    name: "슬그머니 분산",
    icon: "git-branch-outline" as const,
    color: "#FF6B00",
    bg: "#FFF4EC",
    darkBg: "#4A2E1E",
    duration: "1~3주",
    description: "주가가 고점 근처에서 횡보할 때, 세력은 조용히 팔기 시작합니다. 뉴스는 좋은데 주가가 안 오르는 이상한 느낌이 이 구간이에요.",
    signals: ["고점권 거래량 증가 + 위꼬리 긴 음봉", "기관 순매도 전환", "호재 뉴스에도 주가 반응 둔감", "RSI 하락 다이버전스"],
    tip: "이 신호가 보이면 서둘러 익절하는 게 좋아요. 개인 투자자가 사는 걸 세력이 받아줍니다.",
  },
  {
    phase: "4단계",
    name: "하락·청산",
    icon: "trending-down" as const,
    color: "#1B63E8",
    bg: "#EDF3FF",
    darkBg: "#1A2A4A",
    duration: "2~6주",
    description: "세력이 다 팔고 나면 주가는 떨어집니다. 이때 개인은 물려있고, 세력은 다음 종목으로 이동하거나 다시 저점 매집을 준비합니다.",
    signals: ["기관·외국인 동반 순매도", "거래량 없는 하락 지속", "악재 뉴스 연속 등장", "주가 지지선 연속 이탈"],
    tip: "이 구간에서 손절 타이밍을 놓치면 오래 물릴 수 있어요. 1단계 매집 신호가 다시 보일 때까지 기다리세요.",
  },
];

function CycleGuide({ isDark, c }: { isDark: boolean; c: any }) {
  const [open, setOpen] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
    Animated.timing(rotateAnim, {
      toValue: open ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const togglePhase = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPhase((prev) => (prev === i ? null : i));
  };

  const arrowRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={[styles.guideCard, { backgroundColor: c.card }]}>
      <TouchableOpacity style={styles.guideHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.guideHeaderLeft}>
          <View style={[styles.guideIconWrap, { backgroundColor: "#0064FF18" }]}>
            <Ionicons name="analytics" size={16} color="#0064FF" />
          </View>
          <View>
            <Text style={[styles.guideTitle, { color: c.text }]}>세력 움직임 사이클 가이드</Text>
            <Text style={[styles.guideSub, { color: c.textTertiary }]}>
              매집 → 상승 → 분산 → 하락 4단계 패턴
            </Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
          <Ionicons name="chevron-down" size={18} color={c.textTertiary} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <View style={styles.guideBody}>
          <View style={[styles.guideDivider, { backgroundColor: c.separator }]} />

          {/* Timeline strip */}
          <View style={styles.timelineStrip}>
            {CYCLE_PHASES.map((ph, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: ph.color }]} />
                {i < CYCLE_PHASES.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: c.separator }]} />
                )}
              </View>
            ))}
          </View>
          <View style={styles.timelineLabelRow}>
            {CYCLE_PHASES.map((ph, i) => (
              <Text key={i} style={[styles.timelineLabel, { color: ph.color }]}>{ph.name}</Text>
            ))}
          </View>

          <View style={{ height: 12 }} />

          {/* Phase cards */}
          {CYCLE_PHASES.map((ph, i) => {
            const isExpanded = expandedPhase === i;
            const bgColor = isDark ? ph.darkBg : ph.bg;
            return (
              <View key={i} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.phaseRow, { backgroundColor: bgColor }]}
                  onPress={() => togglePhase(i)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.phaseIconWrap, { backgroundColor: ph.color + "28" }]}>
                    <Ionicons name={ph.icon} size={16} color={ph.color} />
                  </View>
                  <View style={styles.phaseInfo}>
                    <View style={styles.phaseNameRow}>
                      <Text style={[styles.phaseTag, { color: ph.color }]}>{ph.phase}</Text>
                      <Text style={[styles.phaseName, { color: isDark ? "#fff" : "#0E0E10" }]}>
                        {ph.name}
                      </Text>
                    </View>
                    <Text style={[styles.phaseDuration, { color: ph.color + "CC" }]}>
                      평균 기간: {ph.duration}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={ph.color + "80"}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.phaseDetail, { backgroundColor: bgColor, borderTopColor: ph.color + "30" }]}>
                    <Text style={[styles.phaseDesc, { color: isDark ? "#E0E0E0" : "#2C2C2E" }]}>
                      {ph.description}
                    </Text>

                    <Text style={[styles.phaseSignalsTitle, { color: ph.color }]}>감지 신호</Text>
                    {ph.signals.map((s, si) => (
                      <View key={si} style={styles.phaseSignalRow}>
                        <View style={[styles.phaseBullet, { backgroundColor: ph.color }]} />
                        <Text style={[styles.phaseSignalText, { color: isDark ? "#C8C8C8" : "#3C3C3E" }]}>
                          {s}
                        </Text>
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

          {/* Bottom note */}
          <View style={[styles.guideNote, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
            <Ionicons name="time-outline" size={12} color={c.textTertiary} />
            <Text style={[styles.guideNoteText, { color: c.textTertiary }]}>
              세력 사이클은 종목마다 다릅니다. 위 4단계는 일반적인 패턴이며, 단기 테마주는 사이클이 훨씬 짧고 급격합니다. 아래 신호 카드와 함께 참고하세요.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function SignalCard({ sig, isDark, c }: { sig: SmartMoneySignal; isDark: boolean; c: any }) {
  const meta = SIGNAL_META[sig.type];
  const strength = STRENGTH_META[sig.strength];
  const isEntry = sig.type === "세력진입" || sig.type === "매집중";
  const accentColor = isEntry ? "#F04452" : "#1B63E8";
  const bgColor = isDark
    ? isEntry ? "rgba(240,68,82,0.08)" : "rgba(27,99,232,0.08)"
    : isEntry ? "#FEF8F8" : "#F0F5FF";

  return (
    <TouchableOpacity
      style={[styles.sigCard, { backgroundColor: c.card }]}
      onPress={() => router.push({ pathname: "/stock/[id]", params: { id: sig.stockId } })}
      activeOpacity={0.7}
    >
      <View style={styles.sigTop}>
        <View style={styles.sigTopLeft}>
          <View style={[styles.sigTypePill, { backgroundColor: bgColor }]}>
            <Ionicons name={meta.icon as any} size={12} color={accentColor} />
            <Text style={[styles.sigTypeText, { color: accentColor }]}>{sig.type}</Text>
            <View style={[styles.strengthDot, { backgroundColor: strength.color }]} />
            <Text style={[styles.strengthText, { color: strength.color }]}>
              {sig.strength}
            </Text>
          </View>
          {sig.isNew && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sigTime, { color: c.textTertiary }]}>
          {timeAgo(sig.detectedAt)}
        </Text>
      </View>

      <View style={styles.sigNameRow}>
        <Text style={[styles.sigStockName, { color: c.text }]}>{sig.stockName}</Text>
        <Text style={[styles.sigTicker, { color: c.textSecondary }]}>{sig.ticker}</Text>
      </View>

      <Text style={[styles.sigSummary, { color: c.textSecondary }]} numberOfLines={2}>
        {sig.summary}
      </Text>

      <View style={[styles.metricsRow, { borderTopColor: c.separator }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: isEntry ? "#F04452" : "#1B63E8" }]}>
            {sig.volumeRatio.toFixed(1)}×
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>거래량</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: sig.institutionalNet >= 0 ? "#F04452" : "#1B63E8" }]}>
            {sig.institutionalNet >= 0 ? "+" : ""}{(sig.institutionalNet / 100).toFixed(0)}억
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>기관</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: sig.foreignerNet >= 0 ? "#F04452" : "#1B63E8" }]}>
            {sig.foreignerNet >= 0 ? "+" : ""}{(sig.foreignerNet / 100).toFixed(0)}억
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>외국인</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: c.separator }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricVal, { color: c.textSecondary }]}>
            {sig.priceVsSupport.toFixed(0)}%
          </Text>
          <Text style={[styles.metricLbl, { color: c.textTertiary }]}>지지선↑</Text>
        </View>
      </View>

      <View style={styles.sigTags}>
        {sig.signals.slice(0, 3).map((s) => (
          <View key={s} style={[styles.sigTag, { backgroundColor: isDark ? "#2C2C2E" : "#F2F4F6" }]}>
            <Text style={[styles.sigTagText, { color: c.textSecondary }]}>{s}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

export default function SignalsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { signals, newCount, markAllSeen } = useSignals();

  useEffect(() => {
    const timer = setTimeout(() => markAllSeen(), 1500);
    return () => clearTimeout(timer);
  }, []);

  const newSignals = signals.filter((s) => s.isNew);
  const oldSignals = signals.filter((s) => !s.isNew);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.text }]}>세력 감지</Text>
          <Text style={[styles.headerSub, { color: c.textSecondary }]}>
            기관·외국인 이상 매매 포착 시스템
          </Text>
        </View>
        {newCount > 0 && (
          <View style={[styles.newCountBadge, { backgroundColor: "#F04452" }]}>
            <Text style={styles.newCountText}>신규 {newCount}건</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Cycle Guide Toggle */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <CycleGuide isDark={isDark} c={c} />
        </View>

        {newSignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: "#F04452" }]} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>새로운 신호</Text>
            </View>
            {newSignals.map((sig) => (
              <SignalCard key={sig.id} sig={sig} isDark={isDark} c={c} />
            ))}
          </View>
        )}

        {oldSignals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>이전 신호</Text>
            </View>
            {oldSignals.map((sig) => (
              <SignalCard key={sig.id} sig={sig} isDark={isDark} c={c} />
            ))}
          </View>
        )}

        {signals.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="eye-off-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>감지된 신호 없음</Text>
            <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
              이상 매매 패턴 감지 시 여기에 표시됩니다
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  newCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  newCountText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // Guide card
  guideCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  guideHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  guideIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  guideTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  guideSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  guideBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  guideDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },

  // Timeline
  timelineStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  timelineItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    flex: 1,
    height: 2,
  },
  timelineLabelRow: {
    flexDirection: "row",
    paddingHorizontal: 2,
    marginTop: 5,
  },
  timelineLabel: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    textAlign: "left",
  },

  // Phase rows
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  phaseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  phaseInfo: {
    flex: 1,
  },
  phaseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  phaseTag: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  phaseName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  phaseDuration: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // Phase detail
  phaseDetail: {
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
    marginTop: -6,
  },
  phaseDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  phaseSignalsTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  phaseSignalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  phaseBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
  },
  phaseSignalText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
  phaseTipBox: {
    flexDirection: "row",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "flex-start",
    marginTop: 4,
  },
  phaseTipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
    flex: 1,
  },

  // Guide bottom note
  guideNote: {
    flexDirection: "row",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    alignItems: "flex-start",
    marginTop: 4,
  },
  guideNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },

  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sigCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sigTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sigTopLeft: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  sigTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sigTypeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  strengthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 2,
  },
  strengthText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  newPill: {
    backgroundColor: "#F04452",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newPillText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  sigTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  sigNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sigStockName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  sigTicker: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sigSummary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  metricVal: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  metricLbl: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  sigTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sigTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sigTagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
