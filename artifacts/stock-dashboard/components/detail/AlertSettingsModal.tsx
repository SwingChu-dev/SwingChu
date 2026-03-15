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
  above: "목표가 도달 (상향)",
  below: "하한가 도달 (하향)",
  rsi_overbought: "RSI 과매수 (70 이상)",
  rsi_oversold: "RSI 과매도 (30 이하)",
};

const TYPE_ICONS: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  above: "arrow-up-circle-outline",
  below: "arrow-down-circle-outline",
  rsi_overbought: "trending-up-outline",
  rsi_oversold: "trending-down-outline",
};

export default function AlertSettingsModal({ visible, onClose, ticker, market, name, currentPrice }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { alerts, addAlert, removeAlert } = useAlerts();

  const [selectedType, setSelectedType] = useState<AlertType>("above");
  const [targetPrice, setTargetPrice] = useState(String(Math.round(currentPrice * 1.05)));

  const myAlerts = alerts.filter((a) => a.ticker === ticker && a.market === market);

  const handleAdd = () => {
    if (selectedType === "above" || selectedType === "below") {
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

  const isPriceType = selectedType === "above" || selectedType === "below";

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
            현재가: ₩{currentPrice.toLocaleString()}
          </Text>

          {/* 알림 타입 선택 */}
          <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>알림 유형</Text>
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
                <Text
                  style={[
                    styles.typeTxt,
                    { color: selectedType === t ? "#0064FF" : c.textSecondary },
                  ]}
                >
                  {TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 목표가 입력 */}
          {isPriceType && (
            <>
              <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>목표 가격 (₩)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: c.card, color: c.text, borderColor: c.separator },
                ]}
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

          {/* 기존 알림 목록 */}
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
                    name={TYPE_ICONS[a.type as AlertType]}
                    size={16}
                    color={a.triggered ? "#22C55E" : c.textSecondary}
                  />
                  <View style={styles.alertItemBody}>
                    <Text style={[styles.alertItemType, { color: c.text }]}>
                      {TYPE_LABELS[a.type as AlertType]}
                    </Text>
                    {a.targetPrice && (
                      <Text style={[styles.alertItemPrice, { color: c.textSecondary }]}>
                        ₩{a.targetPrice.toLocaleString()}
                        {a.triggered ? "  ✓ 발동됨" : ""}
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:           { flex: 1, justifyContent: "flex-end" },
  backdrop:          { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet:             { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8, maxHeight: "85%" },
  handle:            { width: 40, height: 4, backgroundColor: "#94A3B8", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetHeader:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sheetTitle:        { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  currentPriceNote:  { fontSize: 12 },
  sectionLabel:      { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  typeGrid:          { gap: 6 },
  typeBtn:           { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  typeTxt:           { fontSize: 13, fontFamily: "Inter_500Medium" },
  input:             { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginTop: 4 },
  addBtn:            { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#0064FF", borderRadius: 12, paddingVertical: 13, marginTop: 8 },
  addBtnTxt:         { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  alertItem:         { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, padding: 12 },
  alertItemBody:     { flex: 1 },
  alertItemType:     { fontSize: 13, fontFamily: "Inter_500Medium" },
  alertItemPrice:    { fontSize: 12, marginTop: 2 },
});
