import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAlerts, PriceAlert } from "@/context/AlertContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  ticker: string;
  market: string;
  name: string;
  currentPrice: number;
}

type AlertType = "above" | "below" | "rsi_overbought" | "rsi_oversold";

const TYPE_LABELS: Record<AlertType, string> = {
  above:          "목표가 도달 (상향)",
  below:          "하한가 도달 (하향)",
  rsi_overbought: "RSI 과매수 (70 이상)",
  rsi_oversold:   "RSI 과매도 (30 이하)",
};

const TYPE_ICONS: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  above:          "arrow-up-circle-outline",
  below:          "arrow-down-circle-outline",
  rsi_overbought: "trending-up-outline",
  rsi_oversold:   "trending-down-outline",
};

const BUY_GRID  = [5, 10, 15, 20];
const EXIT_GRID = [3, 5, 8, 15];

export default function AlertSettingsModal({
  visible, onClose, ticker, market, name, currentPrice,
}: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { alerts, addAlert, removeAlert } = useAlerts();

  const [selectedType, setSelectedType] = useState<AlertType>("below");
  const [targetPrice, setTargetPrice]   = useState(String(Math.round(currentPrice * 0.95)));
  const [addedId, setAddedId]           = useState<string | null>(null);

  const myAlerts = alerts.filter((a) => a.ticker === ticker && a.market === market);
  const isPriceType = selectedType === "above" || selectedType === "below";

  const flash = (id: string) => {
    setAddedId(id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const handleAddQuick = (type: "above" | "below", pct: number) => {
    const factor = type === "above" ? 1 + pct / 100 : 1 - pct / 100;
    const price = Math.round(currentPrice * factor);
    const id = Date.now().toString();
    addAlert({ ticker, market, name, type, targetPrice: price });
    flash(id);
  };

  const handleAdd = () => {
    if (isPriceType) {
      const p = parseInt(targetPrice.replace(/,/g, ""), 10);
      if (isNaN(p) || p <= 0) {
        Alert.alert("입력 오류", "올바른 가격을 입력해 주세요.");
        return;
      }
      addAlert({ ticker, market, name, type: selectedType, targetPrice: p });
    } else {
      const rsiVal = selectedType === "rsi_overbought" ? 70 : 30;
      addAlert({ ticker, market, name, type: selectedType, targetRsi: rsiVal });
    }
    Alert.alert("알림 설정", "알림이 등록되었습니다.");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: isDark ? "#1C1C2E" : "#FFFFFF" }]}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Ionicons name="notifications-outline" size={22} color="#0064FF" />
            <Text style={[styles.sheetTitle, { color: c.text }]}>{name} 알림 설정</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={c.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.currentPriceNote, { color: c.textSecondary }]}>
            현재가: {currentPrice >= 1000 ? `₩${currentPrice.toLocaleString()}` : `$${currentPrice.toFixed(2)}`}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

            {/* ── 전략 퀵셋: 매수 타점 ── */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary, marginTop: 12 }]}>
              📉 매수 타점 (5% 그물망)
            </Text>
            <View style={styles.quickRow}>
              {BUY_GRID.map((pct) => {
                const price = Math.round(currentPrice * (1 - pct / 100));
                const alreadySet = myAlerts.some(
                  (a) => a.type === "below" && a.targetPrice === price
                );
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[
                      styles.quickBtn,
                      { borderColor: alreadySet ? "#22C55E" : "#1B63E8",
                        backgroundColor: alreadySet ? "#22C55E18" : "#1B63E818" },
                    ]}
                    onPress={() => !alreadySet && handleAddQuick("below", pct)}
                    disabled={alreadySet}
                  >
                    <Text style={[styles.quickPct, { color: alreadySet ? "#22C55E" : "#1B63E8" }]}>
                      -{pct}%
                    </Text>
                    <Text style={[styles.quickPrice, { color: alreadySet ? "#22C55E" : c.textSecondary }]}>
                      {price >= 1000 ? `₩${price.toLocaleString()}` : `$${price.toFixed(1)}`}
                    </Text>
                    {alreadySet && (
                      <Ionicons name="checkmark-circle" size={12} color="#22C55E" style={{ marginTop: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── 전략 퀵셋: 익절 타점 ── */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary, marginTop: 14 }]}>
              📈 익절 타점 (3·5·8·15%)
            </Text>
            <View style={styles.quickRow}>
              {EXIT_GRID.map((pct) => {
                const price = Math.round(currentPrice * (1 + pct / 100));
                const alreadySet = myAlerts.some(
                  (a) => a.type === "above" && a.targetPrice === price
                );
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[
                      styles.quickBtn,
                      { borderColor: alreadySet ? "#22C55E" : "#F04452",
                        backgroundColor: alreadySet ? "#22C55E18" : "#F0445218" },
                    ]}
                    onPress={() => !alreadySet && handleAddQuick("above", pct)}
                    disabled={alreadySet}
                  >
                    <Text style={[styles.quickPct, { color: alreadySet ? "#22C55E" : "#F04452" }]}>
                      +{pct}%
                    </Text>
                    <Text style={[styles.quickPrice, { color: alreadySet ? "#22C55E" : c.textSecondary }]}>
                      {price >= 1000 ? `₩${price.toLocaleString()}` : `$${price.toFixed(1)}`}
                    </Text>
                    {alreadySet && (
                      <Ionicons name="checkmark-circle" size={12} color="#22C55E" style={{ marginTop: 2 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── 구분선 ── */}
            <View style={[styles.divider, { backgroundColor: c.separator, marginVertical: 16 }]} />

            {/* ── 커스텀 알림 ── */}
            <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>커스텀 알림</Text>
            <View style={styles.typeGrid}>
              {(["above", "below", "rsi_overbought", "rsi_oversold"] as AlertType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    { borderColor: c.separator, backgroundColor: c.card },
                    selectedType === t && { borderColor: "#0064FF", backgroundColor: "#0064FF18" },
                  ]}
                  onPress={() => {
                    setSelectedType(t);
                    if (t === "above") setTargetPrice(String(Math.round(currentPrice * 1.05)));
                    if (t === "below") setTargetPrice(String(Math.round(currentPrice * 0.95)));
                  }}
                >
                  <Ionicons
                    name={TYPE_ICONS[t]}
                    size={18}
                    color={selectedType === t ? "#0064FF" : c.textSecondary}
                  />
                  <Text style={[styles.typeTxt, { color: selectedType === t ? "#0064FF" : c.textSecondary }]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isPriceType && (
              <>
                <Text style={[styles.sectionLabel, { color: c.textSecondary, marginTop: 12 }]}>목표 가격</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.separator }]}
                  value={targetPrice}
                  onChangeText={setTargetPrice}
                  keyboardType="decimal-pad"
                  placeholder="목표 가격 입력"
                  placeholderTextColor={c.textSecondary}
                />
              </>
            )}

            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.addBtnTxt}>알림 등록</Text>
            </TouchableOpacity>

            {/* ── 등록된 알림 목록 ── */}
            {myAlerts.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: c.textSecondary, marginTop: 16 }]}>
                  등록된 알림 ({myAlerts.length})
                </Text>
                {myAlerts.map((a) => (
                  <View
                    key={a.id}
                    style={[
                      styles.alertItem,
                      { backgroundColor: a.triggered ? "#22C55E18" : c.card },
                    ]}
                  >
                    <Ionicons
                      name={
                        a.type === "above" ? "arrow-up-circle" :
                        a.type === "below" ? "arrow-down-circle" :
                        "analytics-outline"
                      }
                      size={16}
                      color={
                        a.triggered ? "#22C55E" :
                        a.type === "above" ? "#F04452" :
                        a.type === "below" ? "#1B63E8" : c.textSecondary
                      }
                    />
                    <View style={styles.alertItemBody}>
                      <Text style={[styles.alertItemType, { color: c.text }]}>
                        {a.type === "above" ? "목표가 도달" :
                         a.type === "below" ? "매수 타점" :
                         a.type === "rsi_overbought" ? "RSI 과매수" :
                         a.type === "rsi_oversold" ? "RSI 과매도" : "수익 목표"}
                        {a.triggered ? "  ✓ 발동됨" : ""}
                      </Text>
                      {a.targetPrice && (
                        <Text style={[styles.alertItemPrice, { color: c.textSecondary }]}>
                          {a.targetPrice >= 1000 ? `₩${a.targetPrice.toLocaleString()}` : `$${a.targetPrice.toFixed(2)}`}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => removeAlert(a.id)}>
                      <Ionicons name="trash-outline" size={18} color="#F04452" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:          { flex: 1, justifyContent: "flex-end" },
  backdrop:         { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet:            { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "88%" },
  handle:           { width: 40, height: 4, backgroundColor: "#94A3B8", borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  sheetHeader:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sheetTitle:       { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  currentPriceNote: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  sectionLabel:     { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  quickRow:         { flexDirection: "row", gap: 8 },
  quickBtn: {
    flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 4, gap: 2,
  },
  quickPct:   { fontSize: 14, fontFamily: "Inter_700Bold" },
  quickPrice: { fontSize: 10, fontFamily: "Inter_400Regular" },
  divider:    { height: StyleSheet.hairlineWidth },
  typeGrid:   { gap: 6 },
  typeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
  },
  typeTxt:        { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16, marginTop: 4, marginBottom: 4,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#0064FF", borderRadius: 12, paddingVertical: 13, marginTop: 8,
  },
  addBtnTxt:      { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  alertItem:      { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, padding: 12, marginBottom: 6 },
  alertItemBody:  { flex: 1 },
  alertItemType:  { fontSize: 13, fontFamily: "Inter_500Medium" },
  alertItemPrice: { fontSize: 12, marginTop: 2 },
});
