// 토스증권 톤. iPhone 16 디스플레이는 P3 wide-color를 지원하지만, RN 0.81/Expo 54에는
// 커스텀 hex를 P3 색공간으로 태깅하는 first-class API가 없음 (sRGB로 해석됨). 시스템
// 색상은 PlatformColor / DynamicColorIOS로 P3를 받을 수 있지만 브랜드 hex는 안 됨.
// 향후 react-native-extended-color 같은 네이티브 모듈 도입 시 P3 전환 검토.
const TOSS_BLUE = "#0064FF";
const TOSS_RED = "#F04452";
const TOSS_GREEN = "#05C072";
const TOSS_ORANGE = "#FF6B00";
// AI 기능 전용 액센트 — 보라 톤. 채팅·AI 신호·인사이트 카드처럼 "AI가 만든 것"임을
// 시각적으로 구별하기 위함.
const AI_VIOLET       = "#A855F7";
const AI_VIOLET_GLOW  = "rgba(168,85,247,0.18)";  // 카드 배경·border 톤

export default {
  light: {
    text: "#191F28",
    textSecondary: "#8B95A1",
    textTertiary: "#B0B8C1",
    background: "#F2F4F6",
    backgroundSecondary: "#F8F9FA",
    backgroundTertiary: "#EEF0F2",
    card: "#FFFFFF",
    cardBorder: "rgba(0,0,0,0.06)",
    tint: TOSS_BLUE,
    tintBlue: TOSS_BLUE,
    tabIconDefault: "#B0B8C1",
    tabIconSelected: TOSS_BLUE,
    positive: TOSS_RED,
    negative: "#1B63E8",
    positiveGreen: TOSS_GREEN,
    warning: TOSS_ORANGE,
    separator: "#F2F4F6",
    headerBg: "#FFFFFF",
    aiAccent: AI_VIOLET,
    aiGlow:   AI_VIOLET_GLOW,
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    textTertiary: "#48484A",
    background: "#0E0E10",
    backgroundSecondary: "#1C1C1E",
    backgroundTertiary: "#2C2C2E",
    card: "#1C1C1E",
    cardBorder: "rgba(255,255,255,0.06)",
    tint: TOSS_BLUE,
    tintBlue: TOSS_BLUE,
    tabIconDefault: "#48484A",
    tabIconSelected: TOSS_BLUE,
    positive: TOSS_RED,
    negative: "#4D9EFF",
    positiveGreen: TOSS_GREEN,
    warning: TOSS_ORANGE,
    separator: "#2C2C2E",
    headerBg: "#1C1C1E",
    aiAccent: AI_VIOLET,
    aiGlow:   AI_VIOLET_GLOW,
  },
};
