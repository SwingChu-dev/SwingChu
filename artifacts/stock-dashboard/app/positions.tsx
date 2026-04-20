import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, useColorScheme, Switch,
} from "react-native";
import { showAlert } from "@/utils/crossAlert";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { CATEGORY_LABEL, CATEGORY_COLOR, SECTOR_LABEL, Position } from "@/types/portfolio";
import { usePortfolioMarket } from "@/hooks/usePortfolioMarket";
import { PositionMarket } from "@/services/portfolioMarket";

function fmtKRW(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 100_000_000) return `${sign}${(a / 100_000_000).toFixed(2)}억`;
  if (a >= 10_000)      return `${sign}${(a / 10_000).toFixed(1)}만`;
  return `${sign}${Math.round(a).toLocaleString()}`;
}

function fmtPrice(n: number, currency: string): string {
  if (currency === "USD") return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${Math.round(n).toLocaleString()}원`;
}

export default function PositionsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    settings, removePosition, markImpulse, updatePosition,
    setCashBalance, setCashBalanceUSD, setFxRate,
  } = usePortfolio();
  const { usdKrw, lastUpdate } = useStockPrice();
  const market = usePortfolioMarket();

  const [cashKrwInput, setCashKrwInput] = useState(String(settings.cashBalanceKRW));
  const [cashUsdInput, setCashUsdInput] = useState(String(settings.cashBalanceUSD));
  const [fxInput,      setFxInput]      = useState(String(settings.fxRateUSDKRW));

  const liveFx = usdKrw && usdKrw > 100 ? usdKrw : null;

  const handleSaveSettings = async () => {
    const krw = Number(cashKrwInput.replace(/,/g, ""));
    const usd = Number(cashUsdInput.replace(/,/g, ""));
    const fx  = Number(fxInput.replace(/,/g, ""));
    if (!isNaN(krw)) await setCashBalance(krw);
    if (!isNaN(usd)) await setCashBalanceUSD(usd);
    if (!isNaN(fx) && fx > 0) await setFxRate(fx);
    showAlert("저장", "현금/환율이 업데이트되었습니다.");
  };

  const handleDelete = (p: Position) => {
    showAlert(
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
        {/* 현금 + 환율 */}
        <View style={[styles.section, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>현금 + 환율</Text>

          <Text style={[styles.label, { color: c.textSecondary }]}>원화 현금 (₩)</Text>
          <TextInput
            value={cashKrwInput}
            onChangeText={setCashKrwInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          <Text style={[styles.label, { color: c.textSecondary, marginTop: 8 }]}>달러 현금 ($)</Text>
          <TextInput
            value={cashUsdInput}
            onChangeText={setCashUsdInput}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          <View style={styles.fxRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.textSecondary }]}>USD/KRW 환율</Text>
              {liveFx ? (
                <Text style={[styles.liveFx, { color: c.tint }]}>
                  실시간 {liveFx.toLocaleString()}원
                  {lastUpdate && ` · ${new Date(lastUpdate).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
                </Text>
              ) : (
                <Text style={[styles.liveFx, { color: c.textTertiary }]}>실시간 환율 대기 중…</Text>
              )}
            </View>
            <TextInput
              value={fxInput}
              onChangeText={setFxInput}
              keyboardType="numeric"
              placeholder="1400"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text, borderColor: c.separator, width: 110 }]}
            />
          </View>
          <Text style={[styles.hint, { color: c.textTertiary }]}>
            야후 시세를 자동으로 가져옵니다. 수동값은 시세 실패 시 폴백으로만 사용됩니다.
          </Text>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: c.tint }]}
            onPress={handleSaveSettings}
          >
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>

        {/* 보유 종목 */}
        <Text style={[styles.listTitle, { color: c.textSecondary }]}>
          보유 종목 {market.positions.length}건
        </Text>

        {market.positions.length === 0 && (
          <View style={[styles.empty, { backgroundColor: c.card }]}>
            <Ionicons name="add-circle-outline" size={32} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              아직 등록된 보유 종목이 없습니다.{"\n"}
              우상단 + 버튼으로 매수 플로우를 시작하세요.
            </Text>
          </View>
        )}

        {market.positions.map((m) => (
          <PositionCard
            key={m.position.id}
            data={m}
            c={c}
            onDelete={() => handleDelete(m.position)}
            onToggleImpulse={(v) => markImpulse(m.position.id, v)}
            onSavePrice={(price, qty) => updatePosition(m.position.id, { avgPrice: price, quantity: qty })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface PCProps {
  data:     PositionMarket;
  c:        any;
  onDelete: () => void;
  onToggleImpulse: (v: boolean) => void;
  onSavePrice: (price: number, qty: number) => void;
}

function PositionCard({ data, c, onDelete, onToggleImpulse, onSavePrice }: PCProps) {
  const { position: p, currentPrice, marketValueKRW, unrealizedPnLKRW, pnlPercent, hasLivePrice } = data;
  const [editing, setEditing]     = useState(false);
  const [priceStr, setPriceStr]   = useState(String(p.avgPrice));
  const [qtyStr, setQtyStr]       = useState(String(p.quantity));

  const pnlColor = unrealizedPnLKRW > 0 ? "#FF3B30" : unrealizedPnLKRW < 0 ? "#3478F6" : c.textSecondary;

  const handleSave = () => {
    const price = Number(priceStr.replace(/,/g, ""));
    const qty   = Number(qtyStr.replace(/,/g, ""));
    if (!Number.isFinite(price) || !Number.isFinite(qty) || price <= 0 || qty <= 0) {
      showAlert("입력 오류", "단가와 수량은 0보다 큰 숫자여야 합니다.");
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
              {p.ticker.toUpperCase()}
            </Text>
            <View style={[styles.catBadge, { backgroundColor: CATEGORY_COLOR[p.category] }]}>
              <Text style={styles.catBadgeText}>{CATEGORY_LABEL[p.category]}</Text>
            </View>
            <View style={[styles.mktBadge, { borderColor: c.separator }]}>
              <Text style={[styles.mktBadgeText, { color: c.textSecondary }]}>{p.market}</Text>
            </View>
            {p.isImpulseBuy && (
              <View style={[styles.impulseBadge, { borderColor: "#F04452" }]}>
                <Text style={[styles.impulseText, { color: "#F04452" }]}>뇌동</Text>
              </View>
            )}
          </View>
          <Text style={[styles.posName, { color: c.textSecondary }]}>{p.name}</Text>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={c.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* 평가금액 + 손익 */}
      <View style={[styles.valueBox, { borderTopColor: c.separator }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.valueLabel, { color: c.textTertiary }]}>평가금액</Text>
          <Text style={[styles.valueAmount, { color: c.text }]}>
            {fmtKRW(marketValueKRW)}원
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.valueLabel, { color: c.textTertiary }]}>
            평가손익 {hasLivePrice ? "" : "(평단기준)"}
          </Text>
          <Text style={[styles.pnlAmount, { color: pnlColor }]}>
            {unrealizedPnLKRW >= 0 ? "+" : ""}{fmtKRW(unrealizedPnLKRW)}원
          </Text>
          <Text style={[styles.pnlPct, { color: pnlColor }]}>
            {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.priceLine, { color: c.textSecondary }]}>
          현재 {hasLivePrice ? fmtPrice(currentPrice, p.currency) : "—"}
          {"  /  "}평단 {fmtPrice(p.avgPrice, p.currency)} × {p.quantity}주
        </Text>
      </View>

      <View style={styles.posMetaRow}>
        <Text style={[styles.posMeta, { color: c.textSecondary }]}>
          {p.sectors.map(s => SECTOR_LABEL[s]).join(", ") || "섹터 없음"}
        </Text>
        <Text style={[styles.stopText, { color: c.textTertiary }]}>
          손절 {p.stopLoss ? fmtPrice(p.stopLoss, p.currency) : "—"}
        </Text>
      </View>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            value={priceStr}
            onChangeText={setPriceStr}
            keyboardType="numeric"
            placeholder="평단"
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
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={[styles.editLink, { color: c.tint }]}>평단·수량 수정</Text>
          </TouchableOpacity>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: c.textSecondary }]}>뇌동</Text>
            <Switch value={p.isImpulseBuy} onValueChange={onToggleImpulse} />
          </View>
        </View>
      )}
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
  fxRow:        { flexDirection: "row", gap: 10, alignItems: "flex-end", marginTop: 8 },
  liveFx:       { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  hint:         { fontSize: 11, marginTop: 6 },
  saveBtn:      { borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  saveBtnText:  { color: "#fff", fontFamily: "Inter_700Bold" },

  listTitle:    {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5, textTransform: "uppercase",
    marginTop: 8, marginLeft: 4,
  },

  empty:        { borderRadius: 14, padding: 28, alignItems: "center", gap: 10 },
  emptyText:    { textAlign: "center", fontSize: 13, lineHeight: 19 },

  posCard:      { borderRadius: 14, padding: 14, gap: 10 },
  posHeader:    { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  posTickerRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  posTicker:    { fontSize: 16, fontFamily: "Inter_700Bold" },
  posName:      { fontSize: 12, marginTop: 2 },
  catBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  mktBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  mktBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  impulseBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  impulseText:  { fontSize: 10, fontFamily: "Inter_700Bold" },

  valueBox:     {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  valueLabel:   { fontSize: 11 },
  valueAmount:  { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  pnlAmount:    { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  pnlPct:       { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },

  priceRow:     { },
  priceLine:    { fontSize: 11 },

  posMetaRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  posMeta:      { fontSize: 11, flex: 1 },
  stopText:     { fontSize: 11 },

  actionRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editLink:     { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  editRow:      { flexDirection: "row", gap: 6, alignItems: "center" },
  editInput:    {
    flex: 1, borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 7, fontSize: 12,
  },
  editBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  editBtnText:  { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },

  toggleRow:    {
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  toggleLabel:  { fontSize: 12 },
});
