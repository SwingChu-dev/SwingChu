import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

export const ONBOARDED_KEY = "@swingchu/onboarded";

const { width } = Dimensions.get("window");

interface Slide {
  emoji?: string;
  showLogo?: boolean;
  title:    string;
  subtitle: string;
  bullets:  string[];
}

const SLIDES: Slide[] = [
  {
    showLogo: true,
    title:    "스윙의 정석",
    subtitle: "감정이 아니라 데이터로 매매하는 개인 트레이더용 도구",
    bullets:  [
      "토스증권보다 깊은 시장 인텔리전스",
      "AI 기반 종목 분석·세력 흐름 신호",
      "본인의 매매 패턴을 자기 데이터로 깨닫기",
    ],
  },
  {
    emoji:    "🌪️",
    title:    "지금 어떤 시장인가",
    subtitle: "현재 국면(불장/횡보/하락)에 맞춘 행동 수칙을 매번 보여줍니다",
    bullets:  [
      "Stovall 11단계 사이클 + 공포·탐욕 지수",
      "국면별 진입·익절·사이즈·금지 규칙",
      "본인 청산 패턴을 국면별로 분해해 약점 발견",
    ],
  },
  {
    emoji:    "🤖",
    title:    "AI가 매매를 도와줍니다",
    subtitle: "Claude Sonnet/Haiku로 종목별 분석과 주간 코칭을 받습니다",
    bullets:  [
      "종목 상세에서 자유 질의 AI 채팅",
      "주간 리포트 — 본인 패턴 분석·다음 주 가이드",
      "체결 스크린샷 1장으로 자동 매수 등록",
    ],
  },
  {
    emoji:    "🛡️",
    title:    "참고용입니다",
    subtitle: "본 앱은 투자 자문이 아닙니다. 모든 매매 결정과 손익은 본인 책임입니다.",
    bullets:  [
      "원금 손실 위험을 인지하고 사용",
      "본인 투자 성향·기간·한도 고려",
      "데이터는 단말 로컬에만 저장 (서버 X)",
    ],
  },
];

export default function OnboardingScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, "1").catch(() => {});
    router.replace("/(tabs)" as any);
  };

  const next = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
    } else {
      finish();
    }
  };

  return (
    <View style={[s.root, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Skip */}
      <View style={[s.topRow, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={finish} hitSlop={10}>
          <Text style={s.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[s.slide, { width }]}>
            {slide.showLogo ? (
              <Image source={require("@/assets/images/caricature.png")} style={s.logo} resizeMode="contain" />
            ) : (
              <Text style={s.emoji}>{slide.emoji}</Text>
            )}
            <Text style={s.title}>{slide.title}</Text>
            <Text style={s.subtitle}>{slide.subtitle}</Text>

            <View style={s.bulletWrap}>
              {slide.bullets.map((b, j) => (
                <View key={j} style={s.bulletRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={s.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.bottomRow}>
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                { backgroundColor: i === page ? "#0064FF" : "rgba(255,255,255,0.25)" },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity style={s.cta} onPress={next} activeOpacity={0.85}>
          <Text style={s.ctaText}>{page === SLIDES.length - 1 ? "시작하기" : "다음"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#0A1628" },
  topRow:      {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  skipText:    { color: "#94A3B8", fontSize: 14, fontFamily: "Inter_500Medium" },
  slide: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  logo:        { width: 120, height: 120, borderRadius: 60 },
  emoji:       { fontSize: 72 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  bulletWrap:  {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#141B2D",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1E2D4A",
  },
  bulletRow:   { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletText:  { flex: 1, fontSize: 13, lineHeight: 19, color: "#E2E8F0" },

  bottomRow:   {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  dots:        { flexDirection: "row", gap: 6, flex: 1 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  cta:         {
    backgroundColor: "#0064FF",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 100,
  },
  ctaText:     { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_700Bold" },
});
