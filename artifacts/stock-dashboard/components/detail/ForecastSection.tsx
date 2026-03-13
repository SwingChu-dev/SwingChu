import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StockInfo } from "@/constants/stockData";

interface ForecastSectionProps {
  stock: StockInfo;
}

type PeriodKey = "1일" | "7일" | "30일" | "180일" | "360일" | "1800일";

const PERIODS: { key: PeriodKey; idx: number; label: string }[] = [
  { key: "1일",   idx: 0, label: "1일" },
  { key: "7일",   idx: 1, label: "7일" },
  { key: "30일",  idx: 2, label: "30일" },
  { key: "180일", idx: 4, label: "180일" },
  { key: "360일", idx: 5, label: "360일" },
  { key: "1800일",idx: 6, label: "1800일" },
];

const PERIOD_INFO: Record<PeriodKey, { title: string; icon: string; desc: string; indicators: string[] }> = {
  "1일": {
    title: "내일 단기 예측",
    icon: "flash",
    desc: "오늘 장 마감 이후 단기 기술적 신호를 기반으로 내일 주가 방향을 예측합니다. 변동성이 크고 노이즈가 많아 참고용으로만 활용하세요.",
    indicators: ["RSI 과매수/과매도 여부", "MACD 신호선 교차", "볼린저밴드 이탈 여부", "당일 거래량 이상 여부"],
  },
  "7일": {
    title: "1주일 단기 흐름",
    icon: "trending-up",
    desc: "주간 추세를 파악합니다. 이동평균선 방향성과 수급 흐름으로 이번 주 방향성을 예측합니다.",
    indicators: ["5일·20일 이동평균선 방향", "기관·외국인 주간 수급", "섹터 테마 강도", "주간 거래량 패턴"],
  },
  "30일": {
    title: "1개월 중단기 예측",
    icon: "calendar",
    desc: "월간 단위로 기술적 분석과 재료를 함께 반영합니다. 실적 발표 시즌, 매크로 지표, 섹터 모멘텀이 핵심입니다.",
    indicators: ["60일 이동평균선 추세", "분기 실적 컨센서스 vs 실제", "매크로 금리·환율 흐름", "섹터 순환 사이클 위치"],
  },
  "180일": {
    title: "6개월 중기 펀더멘털",
    icon: "bar-chart",
    desc: "재무 지표와 기술적 분석을 결합합니다. 반기 실적, 밸류에이션 정상화, 산업 사이클 흐름을 반영합니다.",
    indicators: ["PER·PBR 밸류에이션 위치", "반기 매출·영업이익 성장률", "산업 사이클 국면 분석", "주요 리스크 요인 가중치"],
  },
  "360일": {
    title: "1년 연간 성장 예측",
    icon: "stats-chart",
    desc: "연간 이익 성장과 밸류에이션 정상화를 기반으로 1년 목표가를 계산합니다. 장기 펀더멘털 중심 분석입니다.",
    indicators: ["연간 EPS 성장률 × PER 배수", "ROE 추세 및 자본 효율성", "배당 재투자 효과", "섹터 리레이팅 가능성"],
  },
  "1800일": {
    title: "5년 장기 복리 성장",
    icon: "rocket",
    desc: "5년(약 1,800 거래일) 장기 시나리오입니다. 기업의 비즈니스 모델 지속가능성, 시장 지위 유지 여부, 복리 성장률을 기반으로 추정합니다. 불확실성이 크므로 방향성 참고용으로만 활용하세요.",
    indicators: ["연평균 성장률(CAGR) 복리 계산", "경제적 해자(Moat) 유지 가능성", "TAM(총 유효 시장) 확장성", "글로벌 경쟁 환경 변화 리스크"],
  },
};

function formatPriceShort(p: number): string {
  if (p >= 100000000) return `${(p / 100000000).toFixed(1)}억`;
  if (p >= 10000000)  return `${(p / 10000000).toFixed(0)}천만`;
  if (p >= 1000000)   return `${(p / 1000000).toFixed(1)}M`;
  if (p >= 10000)     return `${(p / 10000).toFixed(0)}만`;
  return p.toLocaleString();
}

export default function ForecastSection({ stock }: ForecastSectionProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [selected, setSelected] = useState<PeriodKey>("30일");

  const selectedPeriod = PERIODS.find((p) => p.key === selected)!;
  const forecast       = stock.forecasts[selectedPeriod.idx];
  const info           = PERIOD_INFO[selected];
  const isPositive     = forecast ? forecast.changePercent >= 0 : true;
  const accentColor    = isPositive ? c.positive : c.negative;

  const validPeriods = PERIODS.filter((p) => stock.forecasts[p.idx] !== undefined);

  const maxAbs = Math.max(...validPeriods.map((p) => Math.abs(stock.forecasts[p.idx]?.changePercent ?? 0)));

  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="time" size={18} color={c.tint} />
        <Text style={[styles.sectionTitle, { color: c.text }]}>예상 주가 전망</Text>
      </View>

      {/* Period selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodScroll}
      >
        {validPeriods.map((p) => {
          const active = selected === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodPill,
                active
                  ? { backgroundColor: c.tint, borderColor: c.tint }
                  : { backgroundColor: "transparent", borderColor: c.separator },
              ]}
              onPress={() => setSelected(p.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodPillText,
                  { color: active ? "#fff" : c.textSecondary },
                  active && { fontFamily: "Inter_700Bold" },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Main forecast card */}
      {forecast && (
        <View style={[styles.mainCard, { backgroundColor: accentColor + "0F", borderColor: accentColor + "30" }]}>
          <View style={styles.mainCardTop}>
            <View style={styles.mainCardLeft}>
              <View style={[styles.periodIcon, { backgroundColor: accentColor + "20" }]}>
                <Ionicons name={info.icon as any} size={18} color={accentColor} />
              </View>
              <View>
                <Text style={[styles.mainCardLabel, { color: c.textSecondary }]}>
                  {selected} 후 예상가
                </Text>
                <Text style={[styles.mainCardTitle, { color: c.text }]}>{info.title}</Text>
              </View>
            </View>
            <View style={styles.mainCardRight}>
              <Text style={[styles.mainChangePercent, { color: accentColor }]}>
                {isPositive ? "+" : ""}{forecast.changePercent.toFixed(1)}%
              </Text>
              <Text style={[styles.mainPrice, { color: c.text }]}>
                ₩{formatPriceShort(forecast.price)}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressBg, { backgroundColor: c.separator }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.abs(forecast.changePercent / maxAbs) * 100)}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* All periods mini bar chart */}
      <View style={styles.allPeriodsRow}>
        {validPeriods.map((p) => {
          const f = stock.forecasts[p.idx];
          if (!f) return null;
          const isPos   = f.changePercent >= 0;
          const color   = isPos ? c.positive : c.negative;
          const barH    = Math.max(8, Math.abs((f.changePercent / maxAbs) * 48));
          const isActive = selected === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={styles.miniBarItem}
              onPress={() => setSelected(p.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.miniBarPct, { color: isActive ? color : color + "99" }]}>
                {isPos ? "+" : ""}{f.changePercent.toFixed(0)}%
              </Text>
              <View style={styles.miniBarWrapper}>
                <View
                  style={[
                    styles.miniBar,
                    {
                      height: barH,
                      backgroundColor: isActive ? color : color + "55",
                      borderRadius: 3,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.miniBarLabel, { color: isActive ? c.text : c.textTertiary, fontFamily: isActive ? "Inter_700Bold" : "Inter_400Regular" }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Explanation box */}
      {info && (
        <View style={[styles.explainBox, { backgroundColor: c.backgroundTertiary }]}>
          <Text style={[styles.explainDesc, { color: c.textSecondary }]}>{info.desc}</Text>
          <View style={[styles.indicatorWrap, { borderTopColor: c.separator }]}>
            <Text style={[styles.indicatorTitle, { color: c.textTertiary }]}>사용된 지표</Text>
            {info.indicators.map((ind, i) => (
              <View key={i} style={styles.indicatorRow}>
                <View style={[styles.indicatorDot, { backgroundColor: c.tint }]} />
                <Text style={[styles.indicatorText, { color: c.textSecondary }]}>{ind}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { borderTopColor: c.separator }]}>
        <Ionicons name="information-circle-outline" size={13} color={c.textTertiary} />
        <Text style={[styles.disclaimerText, { color: c.textTertiary }]}>
          예상 주가는 기술적·펀더멘털 분석 기반 참고 정보입니다. 투자 판단의 책임은 투자자 본인에게 있습니다.
        </Text>
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
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  periodScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodPillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  mainCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  mainCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mainCardLeft: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    flex: 1,
  },
  periodIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mainCardLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  mainCardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  mainCardRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  mainChangePercent: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  mainPrice: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  allPeriodsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "flex-end",
  },
  miniBarItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  miniBarPct: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  miniBarWrapper: {
    height: 52,
    justifyContent: "flex-end",
  },
  miniBar: {
    width: 18,
  },
  miniBarLabel: {
    fontSize: 9,
  },
  explainBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  explainDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    padding: 12,
    paddingBottom: 8,
  },
  indicatorWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  indicatorTitle: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  indicatorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  disclaimer: {
    flexDirection: "row",
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    alignItems: "flex-start",
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
});
