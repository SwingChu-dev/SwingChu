import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  useColorScheme, Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { showAlert } from "@/utils/crossAlert";
import {
  CATEGORY_LABEL, CATEGORY_COLOR,
  ExitType, EXIT_TYPE_LABEL, EXIT_TYPE_COLOR,
  DeviationReason, DEVIATION_LABEL,
} from "@/types/portfolio";

const EXIT_TYPES: ExitType[] = [
  "TAKE_PROFIT_PARTIAL", "TAKE_PROFIT_FULL", "STOP_LOSS", "BREAK_EVEN", "DISCRETIONARY",
];
const DEVIATIONS: DeviationReason[] = ["FOMO", "FEAR", "NEWS_REACTION", "OTHER"];

function fmtPrice(n: number, currency: "KRW" | "USD"): string {
  if (currency === "USD") return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${Math.round(n).toLocaleString()}원`;
}

export default function SellScreen() {
  const isDark  = useColorScheme() === "dark";
  const c       = isDark ? Colors.dark : Colors.light;
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { positionId } = useLocalSearchParams<{ positionId: string }>();
  const { positions, sellPosition, settings } = usePortfolio();
  const { quotes } = useStockPrice();

  const position = useMemo(() => positions.find(p => p.id === positionId), [positions, positionId]);

  const [exitType, setExitType]           = useState<ExitType>("TAKE_PROFIT_PARTIAL");
  const [priceStr, setPriceStr]           = useState("");
  const [qtyStr, setQtyStr]               = useState("");
  const [followedRules, setFollowedRules] = useState(true);
  const [devReason, setDevReason]         = useState<DeviationReason | null>(null);
  const [devNote, setDevNote]             = useState("");
  const [nextChange, setNextChange]       = useState("");

  if (!position) {
    return (
      <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.text }]}>매도</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.empty}>
          <Text style={{ color: c.textSecondary }}>포지션을 찾을 수 없습니다.</Text>
        </View>
      </View>
    );
  }

  // 라이브 시세 자동 채움
  const key = `${position.ticker.toUpperCase()}:${position.market}`;
  const livePriceKRW = quotes[key]?.priceKRW;
  const liveInPosCcy = livePriceKRW
    ? (position.currency === "USD" ? livePriceKRW / settings.fxRateUSDKRW : livePriceKRW)
    : null;

  const fillLive = () => {
    if (liveInPosCcy) setPriceStr(String(Math.round(liveInPosCcy * 100) / 100));
  };
  const fillAll  = () => setQtyStr(String(position.quantity));
  const fillHalf = () => setQtyStr(String(Math.floor(position.quantity / 2)));

  // 미리보기
  const exitPrice = Number(priceStr.replace(/,/g, ""));
  const qty       = Number(qtyStr.replace(/,/g, ""));
  const valid     = Number.isFinite(exitPrice) && exitPrice > 0
                 && Number.isFinite(qty) && qty > 0 && qty <= position.quantity;
  const realized  = valid ? (exitPrice - position.avgPrice) * qty : 0;
  const pnlPct    = valid ? (exitPrice / position.avgPrice - 1) * 100 : 0;
  const proceeds  = valid ? exitPrice * qty : 0;
  const isFull    = valid && qty === position.quantity;
  const pnlColor  = realized > 0 ? "#FF3B30" : realized < 0 ? "#3478F6" : c.textSecondary;

  const handleSubmit = async () => {
    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      showAlert("입력 누락", "청산 단가를 입력하세요."); return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      showAlert("입력 누락", "청산 수량을 입력하세요."); return;
    }
    if (qty > position.quantity) {
      showAlert("수량 초과", `보유 ${position.quantity}주를 초과할 수 없습니다.`); return;
    }
    if (!followedRules && !devReason) {
      showAlert("사유 선택", "원칙을 벗어난 경우 사유를 골라주세요."); return;
    }

    const summary =
      `${position.name} ${qty}주 @ ${fmtPrice(exitPrice, position.currency)}\n` +
      `${EXIT_TYPE_LABEL[exitType]} · ${realized >= 0 ? "+" : ""}${Math.round(realized).toLocaleString()} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)`;

    showAlert(
      "매도 기록",
      summary,
      [
        { text: "취소", style: "cancel" },
        {
          text: isFull ? "전량 청산 기록" : "부분 매도 기록",
          onPress: async () => {
            try {
              await sellPosition({
                positionId:      position.id,
                exitPrice, quantity: qty, exitType,
                followedRules,
                deviationReason: followedRules ? null : devReason,
                deviationNote:   devNote.trim(),
                nextChange:      nextChange.trim(),
              });
              router.back();
            } catch (e: any) {
              showAlert("오류", e?.message ?? "기록 실패");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>매도 기록</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 포지션 요약 */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.tickerRow}>
            <Text style={[styles.ticker, { color: c.text }]}>{position.ticker}</Text>
            <View style={[styles.catBadge, { backgroundColor: CATEGORY_COLOR[position.category] }]}>
              <Text style={styles.catBadgeText}>{CATEGORY_LABEL[position.category]}</Text>
            </View>
            <View style={[styles.mktBadge, { borderColor: c.separator }]}>
              <Text style={[styles.mktBadgeText, { color: c.textSecondary }]}>{position.market}</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: c.textSecondary }]}>{position.name}</Text>
          <View style={styles.snapRow}>
            <Snap label="평단" value={fmtPrice(position.avgPrice, position.currency)} c={c} />
            <Snap label="보유" value={`${position.quantity}주`} c={c} />
            <Snap
              label="현재가"
              value={liveInPosCcy ? fmtPrice(liveInPosCcy, position.currency) : "—"}
              c={c}
            />
          </View>
        </View>

        {/* 청산 타입 */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>① 청산 타입</Text>
        <View style={styles.chips}>
          {EXIT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setExitType(t)}
              style={[
                styles.chip,
                exitType === t
                  ? { backgroundColor: EXIT_TYPE_COLOR[t], borderColor: EXIT_TYPE_COLOR[t] }
                  : { borderColor: c.separator },
              ]}
            >
              <Text style={[
                styles.chipText,
                { color: exitType === t ? "#fff" : c.textSecondary },
              ]}>
                {EXIT_TYPE_LABEL[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 단가 + 수량 */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>② 청산 단가 · 수량</Text>
        <View style={[styles.card, { backgroundColor: c.card, gap: 10 }]}>
          <View>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: c.textSecondary }]}>
                청산 단가 ({position.currency})
              </Text>
              {liveInPosCcy && (
                <TouchableOpacity onPress={fillLive}>
                  <Text style={[styles.fillBtn, { color: c.tint }]}>현재가 채우기</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              value={priceStr}
              onChangeText={setPriceStr}
              keyboardType="numeric"
              placeholder={liveInPosCcy ? String(liveInPosCcy.toFixed(2)) : "0"}
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text, borderColor: c.separator }]}
            />
          </View>
          <View>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: c.textSecondary }]}>
                청산 수량 (보유 {position.quantity}주)
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={fillHalf}>
                  <Text style={[styles.fillBtn, { color: c.tint }]}>절반</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={fillAll}>
                  <Text style={[styles.fillBtn, { color: c.tint }]}>전량</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              value={qtyStr}
              onChangeText={setQtyStr}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text, borderColor: c.separator }]}
            />
          </View>

          {/* 미리보기 */}
          {valid && (
            <View style={[styles.preview, { borderTopColor: c.separator }]}>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: c.textTertiary }]}>실현 손익</Text>
                <Text style={[styles.previewValue, { color: pnlColor }]}>
                  {realized >= 0 ? "+" : ""}{fmtPrice(realized, position.currency)}
                  {"  "}({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: c.textTertiary }]}>현금 환입</Text>
                <Text style={[styles.previewValue, { color: c.text }]}>
                  +{fmtPrice(proceeds, position.currency)}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: c.textTertiary }]}>청산 후 잔량</Text>
                <Text style={[styles.previewValue, { color: c.text }]}>
                  {position.quantity - qty}주 {isFull && "(전량 청산 → 보유 삭제)"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 사후 메모 */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>③ 사후 메모</Text>
        <View style={[styles.card, { backgroundColor: c.card, gap: 12 }]}>
          <View style={styles.toggleBlock}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: c.text }]}>원칙대로 매매했나요?</Text>
              <Text style={[styles.hint, { color: c.textTertiary }]}>
                계획대로 손절·익절했으면 예
              </Text>
            </View>
            <Switch value={followedRules} onValueChange={setFollowedRules} />
          </View>

          {!followedRules && (
            <>
              <Text style={[styles.label, { color: c.textSecondary }]}>벗어난 사유</Text>
              <View style={styles.chips}>
                {DEVIATIONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setDevReason(r)}
                    style={[
                      styles.chip,
                      devReason === r
                        ? { backgroundColor: "#F04452", borderColor: "#F04452" }
                        : { borderColor: c.separator },
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: devReason === r ? "#fff" : c.textSecondary },
                    ]}>
                      {DEVIATION_LABEL[r]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={devNote}
                onChangeText={setDevNote}
                placeholder="자세한 상황 (선택)"
                placeholderTextColor={c.textTertiary}
                multiline
                style={[styles.textarea, { color: c.text, borderColor: c.separator }]}
              />
            </>
          )}

          <Text style={[styles.label, { color: c.textSecondary }]}>다음에 바꿀 것 (한 줄)</Text>
          <TextInput
            value={nextChange}
            onChangeText={setNextChange}
            placeholder="예: 손절선 -8% 고정, 뉴스 직후 30분 대기"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />
        </View>
      </ScrollView>

      {/* 푸터 버튼 */}
      <View style={[styles.footer, {
        backgroundColor: c.background, borderTopColor: c.separator,
        paddingBottom: insets.bottom + 12,
      }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: valid ? "#3478F6" : c.separator }]}
          disabled={!valid}
        >
          <Ionicons name="receipt-outline" size={18} color="#fff" />
          <Text style={styles.submitText}>
            {isFull ? "전량 청산 기록" : "부분 매도 기록"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Snap({ label, value, c }: { label: string; value: string; c: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.snapLabel, { color: c.textTertiary }]}>{label}</Text>
      <Text style={[styles.snapValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  empty:       { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll:      { padding: 16, gap: 14 },

  card:        { borderRadius: 14, padding: 14, gap: 8 },

  tickerRow:   { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  ticker:      { fontSize: 18, fontFamily: "Inter_700Bold" },
  name:        { fontSize: 12, marginTop: 2 },
  catBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeText:{ color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  mktBadge:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  mktBadgeText:{ fontSize: 10, fontFamily: "Inter_600SemiBold" },

  snapRow:     { flexDirection: "row", marginTop: 8, gap: 8 },
  snapLabel:   { fontSize: 11 },
  snapValue:   { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },

  sectionTitle:{ fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4, marginLeft: 4 },

  chips:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  chipText:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  labelRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  label:       { fontSize: 12, fontFamily: "Inter_500Medium" },
  fillBtn:     { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  hint:        { fontSize: 11, marginTop: 2 },
  input:       {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  textarea:    {
    borderWidth: 1, borderRadius: 8, padding: 10,
    minHeight: 60, fontSize: 13, textAlignVertical: "top",
  },

  preview:     { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 },
  previewRow:  { flexDirection: "row", justifyContent: "space-between" },
  previewLabel:{ fontSize: 12 },
  previewValue:{ fontSize: 13, fontFamily: "Inter_700Bold" },

  toggleBlock: { flexDirection: "row", alignItems: "center", gap: 12 },

  footer:      {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn:   {
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 12,
  },
  submitText:  { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
});
