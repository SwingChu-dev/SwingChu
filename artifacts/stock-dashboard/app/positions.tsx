import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, useColorScheme, Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import { CATEGORY_LABEL, CATEGORY_COLOR, SECTOR_LABEL, Position } from "@/types/portfolio";

function fmtKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`;
  if (n >= 10_000)      return `${(n / 10_000).toFixed(1)}만`;
  return n.toLocaleString();
}

export default function PositionsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    positions, settings, removePosition, markImpulse, updatePosition,
    setCashBalance, setFxRate,
  } = usePortfolio();

  const [cashInput, setCashInput] = useState(String(settings.cashBalanceKRW));
  const [fxInput,   setFxInput]   = useState(String(settings.fxRateUSDKRW));

  const handleSaveSettings = async () => {
    const cash = Number(cashInput.replace(/,/g, ""));
    const fx   = Number(fxInput.replace(/,/g, ""));
    if (!isNaN(cash)) await setCashBalance(cash);
    if (!isNaN(fx) && fx > 0) await setFxRate(fx);
    Alert.alert("저장", "현금/환율이 업데이트되었습니다.");
  };

  const handleDelete = (p: Position) => {
    Alert.alert(
      "삭제 확인",
      `${p.name}을(를) 보유 종목에서 제거할까요?`,
      [
        { text: "취소", style: "cancel" },
        { text: "삭제", style: "destructive", onPress: () => removePosition(p.id) },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>보유 관리</Text>
        <TouchableOpacity onPress={() => router.push("/buy")}>
          <Ionicons name="add" size={26} color={c.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {/* 현금/환율 */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>현금 + 환율</Text>
          <Text style={[styles.label, { color: c.textSecondary }]}>현금 잔고 (원)</Text>
          <TextInput
            value={cashInput}
            onChangeText={setCashInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />
          <Text style={[styles.label, { color: c.textSecondary, marginTop: 8 }]}>USD/KRW 환율</Text>
          <TextInput
            value={fxInput}
            onChangeText={setFxInput}
            keyboardType="numeric"
            placeholder="1400"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: c.tint }]}
            onPress={handleSaveSettings}
          >
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>

        {/* 보유 종목 */}
        <Text style={[styles.listTitle, { color: c.textSecondary }]}>
          보유 종목 {positions.length}건
        </Text>

        {positions.length === 0 && (
          <View style={[styles.empty, { backgroundColor: c.card }]}>
            <Ionicons name="add-circle-outline" size={32} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              아직 등록된 보유 종목이 없습니다.{"\n"}
              우상단 + 버튼으로 매수 플로우를 시작하세요.
            </Text>
          </View>
        )}

        {positions.map((p) => (
          <PositionCard
            key={p.id}
            position={p}
            c={c}
            onDelete={() => handleDelete(p)}
            onToggleImpulse={(v) => markImpulse(p.id, v)}
            onSavePrice={(price, qty) => updatePosition(p.id, { avgPrice: price, quantity: qty })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface PCProps {
  position: Position;
  c:        any;
  onDelete: () => void;
  onToggleImpulse: (v: boolean) => void;
  onSavePrice: (price: number, qty: number) => void;
}

function PositionCard({ position, c, onDelete, onToggleImpulse, onSavePrice }: PCProps) {
  const [editing, setEditing]     = useState(false);
  const [priceStr, setPriceStr]   = useState(String(position.avgPrice));
  const [qtyStr, setQtyStr]       = useState(String(position.quantity));

  const value = position.avgPrice * position.quantity;

  const handleSave = () => {
    const price = Number(priceStr.replace(/,/g, ""));
    const qty   = Number(qtyStr.replace(/,/g, ""));
    if (!Number.isFinite(price) || !Number.isFinite(qty) || price <= 0 || qty <= 0) {
      Alert.alert("입력 오류", "단가와 수량은 0보다 큰 숫자여야 합니다.");
      return;
    }
    onSavePrice(price, qty);
    setEditing(false);
  };

  return (
    <View style={[styles.posCard, { backgroundColor: c.card }]}>
      <View style={styles.posHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.posTickerRow}>
            <Text style={[styles.posTicker, { color: c.text }]}>
              {position.ticker.toUpperCase()}
            </Text>
            <View style={[styles.catBadge, { backgroundColor: CATEGORY_COLOR[position.category] }]}>
              <Text style={styles.catBadgeText}>{CATEGORY_LABEL[position.category]}</Text>
            </View>
            {position.isImpulseBuy && (
              <View style={[styles.impulseBadge, { borderColor: "#F04452" }]}>
                <Text style={[styles.impulseText, { color: "#F04452" }]}>뇌동</Text>
              </View>
            )}
          </View>
          <Text style={[styles.posName, { color: c.textSecondary }]}>{position.name}</Text>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={c.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.posMetaRow}>
        <Text style={[styles.posMeta, { color: c.textSecondary }]}>
          {position.sectors.map(s => SECTOR_LABEL[s]).join(", ") || "섹터 없음"}
        </Text>
        <Text style={[styles.posValue, { color: c.text }]}>
          {fmtKRW(value)}원
        </Text>
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            value={priceStr}
            onChangeText={setPriceStr}
            keyboardType="numeric"
            placeholder="단가"
            placeholderTextColor={c.textTertiary}
            style={[styles.editInput, { color: c.text, borderColor: c.separator }]}
          />
          <TextInput
            value={qtyStr}
            onChangeText={setQtyStr}
            keyboardType="numeric"
            placeholder="수량"
            placeholderTextColor={c.textTertiary}
            style={[styles.editInput, { color: c.text, borderColor: c.separator }]}
          />
          <TouchableOpacity onPress={handleSave} style={[styles.editBtn, { backgroundColor: c.tint }]}>
            <Text style={styles.editBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Text style={[styles.actionMeta, { color: c.textTertiary }]}>
            평단 {position.avgPrice.toLocaleString()} × {position.quantity} ·
            {" "}손절 {position.stopLoss ? position.stopLoss.toLocaleString() : "—"}
          </Text>
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={[styles.editLink, { color: c.tint }]}>수정</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: c.textSecondary }]}>뇌동 라벨</Text>
        <Switch value={position.isImpulseBuy} onValueChange={onToggleImpulse} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle:  { fontSize: 17, fontFamily: "Inter_700Bold" },

  scroll:       { padding: 16, gap: 12 },

  section:      { borderRadius: 14, padding: 16, gap: 6 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 4 },
  label:        { fontSize: 12, fontFamily: "Inter_500Medium" },
  input:        {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  saveBtn:      { borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 8 },
  saveBtnText:  { color: "#fff", fontFamily: "Inter_700Bold" },

  listTitle:    {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5, textTransform: "uppercase",
    marginTop: 8, marginLeft: 4,
  },

  empty:        { borderRadius: 14, padding: 28, alignItems: "center", gap: 10 },
  emptyText:    { textAlign: "center", fontSize: 13, lineHeight: 19 },

  posCard:      { borderRadius: 14, padding: 14, gap: 8 },
  posHeader:    { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  posTickerRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  posTicker:    { fontSize: 16, fontFamily: "Inter_700Bold" },
  posName:      { fontSize: 12, marginTop: 2 },
  catBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  impulseBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  impulseText:  { fontSize: 10, fontFamily: "Inter_700Bold" },

  posMetaRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  posMeta:      { fontSize: 12, flex: 1 },
  posValue:     { fontSize: 14, fontFamily: "Inter_700Bold" },

  actionRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionMeta:   { fontSize: 11, flex: 1 },
  editLink:     { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  editRow:      { flexDirection: "row", gap: 6, alignItems: "center" },
  editInput:    {
    flex: 1, borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 7, fontSize: 12,
  },
  editBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  editBtnText:  { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },

  toggleRow:    {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 6,
  },
  toggleLabel:  { fontSize: 12 },
});
