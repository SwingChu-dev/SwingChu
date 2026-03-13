import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function StrategyScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const strategies = [
    {
      icon: "git-branch" as const,
      color: "#3B82F6",
      title: "30·30·40 분할매수 전략",
      content: [
        "1차 매수 (30%): 현재가 대비 5% 하락 시",
        "2차 매수 (30%): 1차 대비 5~10% 추가 하락 시",
        "3차 매수 (40%): 최대 비중, 바닥 확인 후 진입",
        "소형주는 진입 기준 더 넓게 (8~25%)",
      ],
    },
    {
      icon: "trophy" as const,
      color: "#00C896",
      title: "분할 익절 전략 (3-8-15)",
      content: [
        "1차 익절 (3%): 빠른 수익 실현, 리스크 감소",
        "2차 익절 (8%): 핵심 수익 구간, 주력 익절",
        "3차 익절 (15%): 목표 수익, 나머지 전량 정리",
        "대형 우량주는 더 길게 보유 가능",
      ],
    },
    {
      icon: "calendar" as const,
      color: "#8B5CF6",
      title: "요일별 매매 원칙",
      content: [
        "월요일: 갭 변동 주의 → 시초가 첫 30분 관망",
        "화요일: 방향성 결정 요일 → 진입 검토",
        "수요일~목요일: 핵심 익절 타이밍 확인",
        "금요일: 오후 매도 압력 증가 → 포지션 정리",
      ],
    },
    {
      icon: "flash" as const,
      color: "#F59E0B",
      title: "마녀의 날 (옵션/선물 만기) 대처",
      content: [
        "한국: 매월 두 번째 목요일 (코스피 200 옵션)",
        "미국: 매월 셋째 금요일 (트리플 위칭)",
        "만기 전날: 포지션 50% 이상 정리 권장",
        "만기 당일: 오전 급락 → 단기 반등 기회",
        "변동성 지수(VIX) 27 이상 시 적극 대응",
      ],
    },
    {
      icon: "globe" as const,
      color: "#FF6B35",
      title: "지정학적 리스크 대처법",
      content: [
        "전쟁/분쟁 확대: 방산주 비중 확대 (한화에로스페이스)",
        "미중 반도체 갈등: 반도체주 리스크 모니터링",
        "한국 정치 불안: 외국인 수급 즉시 확인",
        "급락 시 우량주 중심 분할매수, 소형주 회피",
      ],
    },
    {
      icon: "pulse" as const,
      color: "#00C896",
      title: "기술적 반등 포착 전략",
      content: [
        "RSI 30 이하: 과매도 → 단기 반등 준비",
        "RSI 70 이상: 과매수 → 익절 준비",
        "거래량 급증 + 양봉: 추세 전환 신호",
        "200일 이평선 지지 확인 후 진입",
        "박스권 저점 + 지지선 겹치는 지점 최우선 진입",
      ],
    },
    {
      icon: "shield-checkmark" as const,
      color: "#3B82F6",
      title: "리스크 관리 원칙",
      content: [
        "단일 종목 최대 비중: 20% 이하",
        "소형/테마주: 전체 포트의 5% 이하",
        "손절 원칙: 진입가 대비 -10% 무조건 손절",
        "VIX 30 이상: 전체 포지션 50% 이하로 축소",
        "이익 난 포지션 먼저 청산하는 실수 금지",
      ],
    },
    {
      icon: "stats-chart" as const,
      color: "#8B5CF6",
      title: "박스권 매매 전략",
      content: [
        "저점권: 적극 분할매수, 손절선 지지선 -5%",
        "중간권: 방향성 확인 후 진입",
        "고점권: 신규 매수 자제, 기존 물량 익절",
        "박스권 이탈 (상향): 추격 매수 고려",
        "박스권 이탈 (하향): 즉시 손절, 하락 추세 진입",
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: c.text }]}>투자 전략</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          스윙 트레이딩 핵심 원칙
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.alertCard, { backgroundColor: c.negative + "15", borderColor: c.negative + "40" }]}>
          <Ionicons name="information-circle" size={18} color={c.negative} />
          <Text style={[styles.alertText, { color: c.negative }]}>
            현재 VIX 27.53 (높음) — 변동성 구간. 포지션 크기 조절 필요.
          </Text>
        </View>

        {strategies.map((s, i) => (
          <View
            key={i}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: s.color + "22" }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.cardTitle, { color: c.text }]}>{s.title}</Text>
            </View>
            {s.content.map((line, j) => (
              <View key={j} style={styles.contentRow}>
                <View style={[styles.bullet, { backgroundColor: s.color }]} />
                <Text style={[styles.contentText, { color: c.textSecondary }]}>{line}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 17,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
    flexShrink: 0,
  },
  contentText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  bottomPad: {
    height: 100,
  },
});
