import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import * as Updates from "expo-updates";
import Colors from "@/constants/colors";
import { buildBackup, serializeBackup, parseBackup, restoreBackup } from "@/utils/backup";

export default function BackupScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  const onExport = async () => {
    setBusy(true);
    try {
      const bundle = await buildBackup("1.0.0");
      const json = serializeBackup(bundle);
      await Share.share({
        message: json,
        title: `swingchu-backup-${bundle.exportedAt.slice(0, 10)}.json`,
      });
    } catch (e: any) {
      Alert.alert("백업 실패", e?.message ?? "알 수 없는 오류");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (!pasteValue.trim()) {
      Alert.alert("백업 코드", "복원할 백업 JSON을 붙여 넣으세요.");
      return;
    }
    Alert.alert(
      "백업 복원",
      "기존 데이터(관심종목·포지션·청산기록 등)를 백업으로 덮어씁니다. 계속하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "덮어쓰기",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const bundle = parseBackup(pasteValue);
              await restoreBackup(bundle);
              Alert.alert(
                "복원 완료",
                "앱을 다시 시작해 변경 사항을 반영합니다.",
                [{ text: "재시작", onPress: () => Updates.reloadAsync().catch(() => {}) }],
              );
            } catch (e: any) {
              Alert.alert("복원 실패", e?.message ?? "JSON 파싱 오류");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>데이터 백업</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.card, { backgroundColor: c.card }]}>
          <View style={[s.iconWrap, { backgroundColor: "#0064FF18" }]}>
            <Ionicons name="cloud-upload-outline" size={22} color="#0064FF" />
          </View>
          <Text style={[s.cardTitle, { color: c.text }]}>백업 만들기</Text>
          <Text style={[s.cardDesc, { color: c.textSecondary }]}>
            관심종목·포지션·청산기록·알림·테마 설정을 JSON으로 내보냅니다.
            iCloud Drive·메모·메일 등 원하는 곳에 저장하세요.
          </Text>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: c.tint, opacity: busy ? 0.6 : 1 }]}
            disabled={busy}
            onPress={onExport}
            activeOpacity={0.8}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>백업 내보내기</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: c.card }]}>
          <View style={[s.iconWrap, { backgroundColor: "#F0445218" }]}>
            <Ionicons name="cloud-download-outline" size={22} color="#F04452" />
          </View>
          <Text style={[s.cardTitle, { color: c.text }]}>백업 복원</Text>
          <Text style={[s.cardDesc, { color: c.textSecondary }]}>
            백업 JSON 전체를 아래 창에 붙여 넣으세요. 복원 시 기존 데이터는
            덮어쓰여집니다.
          </Text>

          {!importMode ? (
            <TouchableOpacity
              style={[s.secondaryBtn, { borderColor: c.cardBorder }]}
              onPress={() => setImportMode(true)}
              activeOpacity={0.7}
            >
              <Text style={[s.secondaryBtnText, { color: c.text }]}>JSON 붙여넣기</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={[
                  s.input,
                  {
                    color: c.text,
                    borderColor: c.cardBorder,
                    backgroundColor: c.backgroundSecondary,
                  },
                ]}
                multiline
                placeholder='{ "version": 1, "exportedAt": "...", "data": { ... } }'
                placeholderTextColor={c.textTertiary}
                value={pasteValue}
                onChangeText={setPasteValue}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: "#F04452", opacity: busy ? 0.6 : 1 }]}
                disabled={busy}
                onPress={onImport}
                activeOpacity={0.8}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryBtnText}>덮어쓰고 복원</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[s.note, { color: c.textTertiary }]}>
          • 백업 파일에는 비밀번호·API 키가 포함되지 않습니다.{"\n"}
          • 시세·AI 신호 캐시는 복원 대상이 아닙니다 (앱 재시작 시 자동 갱신).{"\n"}
          • 다른 기기에 옮길 때는 동일한 앱 버전에서 복원하세요.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll:      { padding: 16, gap: 14 },
  card:        { borderRadius: 16, padding: 18, gap: 10 },
  iconWrap:    {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle:   { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardDesc:    { fontSize: 13, lineHeight: 19 },
  primaryBtn:  {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  input:       {
    minHeight: 120,
    maxHeight: 220,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
  },
  note:        { fontSize: 12, lineHeight: 18, marginTop: 4, paddingHorizontal: 4 },
});
