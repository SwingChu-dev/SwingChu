import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { useSignals } from "@/context/SignalContext";
import { useKis } from "@/context/KisContext";

interface MenuItemProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  description: string;
  badge?: number | string;
  onPress: () => void;
}

function MenuItem({ icon, iconColor, title, description, badge, onPress }: MenuItemProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: c.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconColor + "18" }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <View style={styles.menuTitleRow}>
          <Text style={[styles.menuTitle, { color: c.text }]}>{title}</Text>
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>
                {typeof badge === "number" && badge > 9 ? "9+" : badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.menuDesc, { color: c.textSecondary }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
    </TouchableOpacity>
  );
}

interface SectionHeaderProps {
  title: string;
}
function SectionHeader({ title }: SectionHeaderProps) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <Text style={[styles.sectionHeader, { color: c.textSecondary }]}>{title}</Text>
  );
}

export default function MoreScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { newCount } = useSignals();
  const { isConnected, totalCount } = useKis();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* 헤더 */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: c.background,
            borderBottomColor: c.separator,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: c.text }]}>더보기</Text>
        <Text style={[styles.headerSub, { color: c.textSecondary }]}>
          스윙의 정석 분석 도구
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 계좌 연동 */}
        <SectionHeader title="계좌 연동" />
        <View style={styles.section}>
          <MenuItem
            icon="business-outline"
            iconColor="#FF6B35"
            title="KIS 관심종목 연동"
            description={
              isConnected
                ? `한국투자증권 연결됨 · ${totalCount}개 종목`
                : "한국투자증권 Open API로 관심종목 동기화"
            }
            badge={isConnected ? totalCount : undefined}
            onPress={() => router.push("/kis-connect" as any)}
          />
        </View>

        {/* 분석 도구 */}
        <SectionHeader title="분석 도구" />
        <View style={styles.section}>
          <MenuItem
            icon="eye-outline"
            iconColor="#8B5CF6"
            title="세력감지"
            description="스마트머니·기관 수급 이상 신호 포착"
            badge={newCount > 0 ? newCount : undefined}
            onPress={() => router.navigate("/(tabs)/signals")}
          />
          <View style={[styles.divider, { backgroundColor: c.separator }]} />
          <MenuItem
            icon="bar-chart-outline"
            iconColor="#0064FF"
            title="분석"
            description="RSI·볼린저밴드·기술적 지표 종합 분석"
            onPress={() => router.navigate("/(tabs)/analysis")}
          />
          <View style={[styles.divider, { backgroundColor: c.separator }]} />
          <MenuItem
            icon="shield-outline"
            iconColor="#22C55E"
            title="전략"
            description="30/30/40 스윙 전략·리스크 관리 가이드"
            onPress={() => router.navigate("/(tabs)/strategy")}
          />
        </View>

        {/* 앱 정보 */}
        <SectionHeader title="앱 정보" />
        <View style={styles.section}>
          <View style={[styles.infoCard, { backgroundColor: c.card }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textSecondary }]}>버전</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>1.0.0</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: c.separator }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textSecondary }]}>데이터 출처</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>Yahoo Finance</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: c.separator }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textSecondary }]}>시세 업데이트</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>30초 캐시</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: c.separator }]} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: c.textSecondary }]}>뉴스 업데이트</Text>
              <Text style={[styles.infoValue, { color: c.text }]}>15분 캐시</Text>
            </View>
          </View>
        </View>

        {/* 투자 유의사항 */}
        <View style={[styles.disclaimer, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}>
          <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
          <Text style={[styles.disclaimerTxt, { color: c.textSecondary }]}>
            본 앱이 제공하는 모든 정보는{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold", color: c.text }}>참고용</Text>
            이며, 실제 투자 결정 및 그에 따른 손익은 전적으로 본인에게 있습니다.{"\n"}
            주식 투자에는 원금 손실 위험이 있습니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },

  header:        {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle:   { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerSub:     { fontSize: 13, marginTop: 2 },

  scroll:        { paddingHorizontal: 16, paddingTop: 20, gap: 8 },

  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },

  section:       { borderRadius: 14, overflow: "hidden" },
  divider:       { height: StyleSheet.hairlineWidth, marginLeft: 68 },

  menuItem:      {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuIcon:      {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent:   { flex: 1, gap: 2 },
  menuTitleRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  menuTitle:     { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc:      { fontSize: 12, lineHeight: 17 },

  badge:         {
    backgroundColor: "#F04452",
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt:      { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },

  infoCard:      { borderRadius: 14, overflow: "hidden" },
  infoRow:       {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoLabel:     { fontSize: 14 },
  infoValue:     { fontSize: 14, fontFamily: "Inter_500Medium" },
  infoDivider:   { height: StyleSheet.hairlineWidth, marginLeft: 16 },

  disclaimer:    {
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    alignItems: "flex-start",
  },
  disclaimerTxt: { fontSize: 12, flex: 1, lineHeight: 19 },
});
