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
        {/* 글로벌 리스크 */}
        <SectionHeader title="글로벌 리스크" />
        <View style={styles.section}>
          <MenuItem
            icon="eye-outline"
            iconColor="#D4A855"
            title="폭풍의 눈 — 시장 인텔리전스"
            description="심리 사이클 · F&G 지수 · 자동 리스크 트리거"
            onPress={() => router.push("/market-cycle" as any)}
          />
        </View>

        {/* 환경설정 */}
        <SectionHeader title="환경설정" />
        <View style={styles.section}>
          <MenuItem
            icon="contrast-outline"
            iconColor="#0064FF"
            title="테마"
            description="시스템 / 라이트 / 다크 선택"
            onPress={() => router.push("/settings" as any)}
          />
        </View>

        {/* 데이터 */}
        <SectionHeader title="데이터" />
        <View style={styles.section}>
          <MenuItem
            icon="cloud-outline"
            iconColor="#05C072"
            title="백업·복원"
            description="포지션·관심종목·청산기록 JSON으로 내보내기/복원"
            onPress={() => router.push("/backup" as any)}
          />
          <View style={[styles.divider, { backgroundColor: c.separator }]} />
          <MenuItem
            icon="receipt-outline"
            iconColor="#FF6B00"
            title="양도소득세 계산"
            description="해외주식 22% + 250만원 공제 자동 계산"
            onPress={() => router.push("/tax" as any)}
          />
        </View>

        {/* 법적 정보 */}
        <SectionHeader title="법적 정보" />
        <View style={styles.section}>
          <MenuItem
            icon="shield-outline"
            iconColor="#94A3B8"
            title="투자 면책 / 개인정보 / 이용약관"
            description="본 앱은 투자자문업이 아니며 모든 매매 결정은 본인 책임"
            onPress={() => router.push("/legal" as any)}
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
