import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useThemePref, ThemePref } from "@/context/ThemeContext";

const OPTIONS: Array<{ value: ThemePref; label: string; sub: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
  { value: "system", label: "시스템 설정 따라가기", sub: "iOS/안드로이드 설정대로 자동",  icon: "phone-portrait-outline" },
  { value: "light",  label: "라이트 모드",          sub: "항상 밝은 테마",               icon: "sunny-outline" },
  { value: "dark",   label: "다크 모드",            sub: "항상 어두운 테마",             icon: "moon-outline" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { pref, setPref } = useThemePref();

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }}/>

      <View style={[s.header, { borderBottomColor: c.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text}/>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>환경설정</Text>
        <View style={s.backBtn}/>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text style={[s.sectionLabel, { color: c.textSecondary }]}>테마</Text>

        <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          {OPTIONS.map((opt, i) => {
            const active = pref === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  s.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.cardBorder },
                ]}
                onPress={() => setPref(opt.value)}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: c.background }]}>
                  <Ionicons name={opt.icon} size={20} color={active ? "#0064FF" : c.textSecondary}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: c.text }]}>{opt.label}</Text>
                  <Text style={[s.rowSub,   { color: c.textSecondary }]}>{opt.sub}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color="#0064FF"/>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.foot, { color: c.textTertiary }]}>
          시스템 설정을 따라가면 OS의 다크/라이트 모드 변경에 자동으로 반응합니다. 직접 선택하면 OS 설정과 무관하게 고정됩니다.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn:     { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  sectionLabel:{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
                 paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },

  card:        { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  row:         { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  iconWrap:    { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  rowTitle:    { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  rowSub:      { fontSize: 12, lineHeight: 16 },

  foot:        { fontSize: 11, lineHeight: 16, paddingHorizontal: 24, paddingTop: 16, fontStyle: "italic" },
});
