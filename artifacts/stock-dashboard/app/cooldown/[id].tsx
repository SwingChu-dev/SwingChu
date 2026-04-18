import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  useColorScheme, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import { CATEGORY_LABEL, SECTOR_LABEL } from "@/types/portfolio";
import { ABSOLUTE_LIMITS } from "@/constants/rules";
import { validateEntry } from "@/services/entryValidator";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "쿨다운 종료";
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}시간 ${m}분 남음`;
}

export default function CooldownScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const {
    pendingEntries, cancelPendingEntry, executePendingEntry, addPosition,
    portfolio, avgPositionSize,
  } = usePortfolio();

  const entry = pendingEntries.find(p => p.id === params.id);
  const [now, setNow] = useState(Date.now());
  const [cancelReason, setCancelReason] = useState("");
  const [savedAmount, setSavedAmount] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Text style={[styles.empty, { color: c.text }]}>존재하지 않는 쿨다운입니다.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: c.tint }}>뒤로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remainMs = entry.cooldownUntil - now;
  const ready    = remainMs <= 0 || entry.status !== "PENDING";
  const req      = entry.request;

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("취소 사유", "왜 진입을 포기했는지 한 줄이라도 적어주세요.");
      return;
    }
    const saved = savedAmount ? Number(savedAmount.replace(/,/g, "")) : null;
    await cancelPendingEntry(entry.id, cancelReason.trim(), saved);
    Alert.alert("기록 완료", "뇌동 방지 성공 사례로 저장되었습니다.");
    router.replace("/(tabs)/portfolio");
  };

  const handleExecute = async () => {
    // 쿨다운 종료 후에도 현재 포트폴리오 기준으로 재검증한다.
    const recheck = validateEntry(req, portfolio, { avgPositionSize });
    if (!recheck.passed) {
      Alert.alert(
        "재검증 실패",
        "쿨다운 중 포트폴리오 상태가 변해 진입할 수 없습니다:\n\n"
          + recheck.blockers.map((b, i) => `${i + 1}. ${b}`).join("\n"),
      );
      return;
    }
    const stop = req.stopLoss ?? req.targetAmount * (1 + ABSOLUTE_LIMITS.STOP_LOSS_DEFAULT / 100);
    await addPosition({
      ticker:           req.ticker,
      name:             req.name,
      market:           "KOSPI",
      category:         req.category,
      sectors:          req.sectors,
      avgPrice:         req.targetAmount,
      quantity:         1,
      currency:         "KRW",
      entryDate:        Date.now(),
      entryReason:      req.entryReason,
      stopLoss:         stop,
      takeProfitLevels: req.takeProfitLevels,
      executedTakeProfits: [],
      isImpulseBuy:     false,
      isInLiquidationMode: false,
      notes:            [],
    });
    await executePendingEntry(entry.id);
    Alert.alert("매수 등록", "보유 종목에 추가되었습니다. 단가/수량은 보유 관리에서 정확히 입력하세요.");
    router.replace("/(tabs)/portfolio");
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>쿨다운 대기</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.timerCard, { backgroundColor: c.card }]}>
          <Text style={[styles.timerLabel, { color: c.textSecondary }]}>
            {entry.status === "CANCELLED" ? "취소됨"
              : entry.status === "EXECUTED" ? "실행됨"
              : ready ? "진행 가능" : "대기 중"}
          </Text>
          <Text style={[styles.timerValue, { color: ready ? "#22C55E" : "#F59E0B" }]}>
            {formatRemaining(remainMs)}
          </Text>
          <Text style={[styles.timerHint, { color: c.textTertiary }]}>
            {new Date(entry.cooldownUntil).toLocaleString("ko-KR")}
          </Text>
        </View>

        <View style={[styles.detailCard, { backgroundColor: c.card }]}>
          <Text style={[styles.detailTitle, { color: c.text }]}>
            {req.name} ({req.ticker.toUpperCase()})
          </Text>
          <DetailRow label="카테고리"  value={CATEGORY_LABEL[req.category]} c={c} />
          <DetailRow label="섹터"      value={req.sectors.map(s => SECTOR_LABEL[s]).join(", ") || "—"} c={c} />
          <DetailRow label="목표 금액"  value={`${req.targetAmount.toLocaleString()}원`} c={c} />
          <DetailRow label="손절가"    value={req.stopLoss ? `${req.stopLoss.toLocaleString()}` : "—"} c={c} />
          <DetailRow label="익절 레벨"  value={req.takeProfitLevels.map(n => `${n}%`).join(" / ")} c={c} />
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.detailLabel, { color: c.textSecondary }]}>매수 근거</Text>
            <Text style={[styles.detailReason, { color: c.text }]}>{req.entryReason}</Text>
          </View>
        </View>

        {entry.status === "PENDING" && (
          <>
            <View style={[styles.cancelCard, { backgroundColor: c.card }]}>
              <Text style={[styles.cancelTitle, { color: c.text }]}>
                진입 포기하고 뇌동 방지 사례로 기록
              </Text>
              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="포기 이유 (예: 차분히 보니 근거가 약함)"
                placeholderTextColor={c.textTertiary}
                style={[styles.input, { color: c.text, borderColor: c.separator }]}
              />
              <TextInput
                value={savedAmount}
                onChangeText={setSavedAmount}
                placeholder="만약 샀다면 손실 추정치 (선택, 원)"
                placeholderTextColor={c.textTertiary}
                keyboardType="numeric"
                style={[styles.input, { color: c.text, borderColor: c.separator, marginTop: 8 }]}
              />
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: "#22C55E" }]}
                onPress={handleCancel}
              >
                <Ionicons name="shield-checkmark" size={16} color="#22C55E" />
                <Text style={[styles.cancelBtnText, { color: "#22C55E" }]}>
                  취소하고 기록
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.execBtn, {
                backgroundColor: ready ? c.tint : isDark ? "#2A2A2C" : "#E5E5EA",
              }]}
              onPress={handleExecute}
              disabled={!ready}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done"
                size={18}
                color={ready ? "#fff" : c.textTertiary}
              />
              <Text style={[styles.execBtnText, {
                color: ready ? "#fff" : c.textTertiary,
              }]}>
                {ready ? "쿨다운 종료 · 보유 등록" : "쿨다운 종료까지 대기"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, c }: { label: string; value: string; c: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle:   { fontSize: 17, fontFamily: "Inter_700Bold" },

  scroll:        { padding: 16, gap: 12 },

  timerCard:     { borderRadius: 14, padding: 24, alignItems: "center", gap: 6 },
  timerLabel:    { fontSize: 12, fontFamily: "Inter_500Medium" },
  timerValue:    { fontSize: 32, fontFamily: "Inter_700Bold" },
  timerHint:     { fontSize: 11 },

  detailCard:    { borderRadius: 14, padding: 16, gap: 6 },
  detailTitle:   { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  detailRow:     { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  detailLabel:   { fontSize: 12, fontFamily: "Inter_500Medium" },
  detailValue:   { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  detailReason:  { fontSize: 13, lineHeight: 19, marginTop: 4 },

  cancelCard:    { borderRadius: 14, padding: 16, gap: 8 },
  cancelTitle:   { fontSize: 14, fontFamily: "Inter_700Bold" },
  input:         {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  cancelBtn:     {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5,
  },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  execBtn:       {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  execBtnText:   { fontSize: 15, fontFamily: "Inter_700Bold" },

  empty:         { textAlign: "center", marginTop: 40, fontSize: 14 },
  backBtn:       { padding: 16, alignItems: "center" },
});
