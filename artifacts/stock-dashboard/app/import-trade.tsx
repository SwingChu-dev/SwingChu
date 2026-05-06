import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import Colors from "@/constants/colors";
import { STOCKS } from "@/constants/stockData";
import { getStockMetadata } from "@/constants/stockMetadata";
import { parseTradeImage, type ParsedTrade } from "@/services/portfolioImport";
import { usePortfolio } from "@/context/PortfolioContext";
import { useMarketIntel } from "@/hooks/useMarketIntel";
import { regimeFromPhase } from "@/utils/regimePlaybook";
import { showAlert } from "@/utils/crossAlert";
import { ABSOLUTE_LIMITS } from "@/constants/rules";
import { useAiQuota } from "@/hooks/useAiQuota";

const DEFAULT_TP = [3, 5, 8, 15];

export default function ImportTradeScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { executeBuy } = usePortfolio();
  const { data: marketIntel } = useMarketIntel("us");
  const currentRegime = marketIntel ? regimeFromPhase(marketIntel.cycle.phase) : undefined;
  const quota = useAiQuota("trade-import");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [trade, setTrade] = useState<ParsedTrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = useCallback(async (source: "camera" | "library") => {
    setError(null);
    try {
      const perm = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("이미지 접근 권한이 필요합니다.");
        return;
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true, mediaTypes: ["images"] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true, mediaTypes: ["images"] });
      if (result.canceled || !result.assets?.[0]?.base64) return;

      const asset = result.assets[0];
      setImageUri(asset.uri);
      setTrade(null);

      const allowed = await quota.consume();
      if (!allowed) {
        setError(`오늘 ${quota.label} ${quota.limit}건 한도에 도달했습니다. 자정에 자동 리셋됩니다.`);
        return;
      }

      setParsing(true);
      const parsed = await parseTradeImage(asset.base64!, asset.mimeType ?? "image/jpeg");
      if (!parsed) {
        setError("체결 화면을 인식하지 못했습니다. 종목/수량/가격이 또렷한 다른 사진을 시도하세요.");
      } else {
        setTrade(parsed);
      }
    } catch (e: any) {
      setError(e?.message ?? "이미지 처리 실패");
    } finally {
      setParsing(false);
    }
  }, []);

  const onConfirm = useCallback(async () => {
    if (!trade) return;
    if (trade.side === "SELL") {
      showAlert("아직 미지원", "매도 자동 등록은 다음 업데이트에서 지원됩니다. 매도는 포지션 화면에서 직접 청산해 주세요.");
      return;
    }
    if (!trade.ticker || !trade.market || !trade.currency) {
      showAlert("매칭 실패", "카탈로그에서 종목을 찾지 못했습니다. 직접 매수 등록 화면으로 이동합니다.", [
        { text: "취소", style: "cancel" },
        {
          text: "매수 화면으로",
          onPress: () => router.replace("/buy" as any),
        },
      ]);
      return;
    }

    setSaving(true);
    try {
      const stock = STOCKS.find((s) => s.ticker === trade.ticker && s.market === trade.market);
      const meta = stock ? getStockMetadata(stock.id) : null;

      await executeBuy({
        ticker:              trade.ticker.toLowerCase(),
        name:                stock?.name ?? trade.nameKrShown,
        market:              trade.market,
        category:            meta?.category ?? "B_EVENT",
        sectors:             meta?.sectors ?? [],
        avgPrice:            trade.price,
        quantity:            trade.quantity,
        currency:            trade.currency,
        entryDate:           trade.executedAt ? new Date(trade.executedAt).getTime() : Date.now(),
        entryReason:         "토스 체결 자동 등록",
        stopLoss:            trade.price * (1 + ABSOLUTE_LIMITS.STOP_LOSS_DEFAULT / 100),
        takeProfitLevels:    DEFAULT_TP,
        executedTakeProfits: [],
        isImpulseBuy:        false,
        isInLiquidationMode: false,
        notes:               [],
        entryRegime:         currentRegime,
      });

      router.replace("/(tabs)/portfolio" as any);
    } catch (e: any) {
      showAlert("등록 실패", e?.message ?? "다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }, [trade, executeBuy, currentRegime, router]);

  const sideColor = trade?.side === "BUY" ? "#F04452" : "#1B63E8";
  const sideLabel = trade?.side === "BUY" ? "매수" : "매도";

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>체결 스크린샷 등록</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: c.card }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>토스증권 체결 화면</Text>
          <Text style={[s.cardDesc, { color: c.textSecondary }]}>
            매수 직후 체결 완료 화면을 캡처하면 종목·수량·가격이 자동 추출됩니다.
            매도는 추후 지원. · 오늘 {quota.remaining}/{quota.limit}건 남음
          </Text>
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, { borderColor: c.cardBorder, backgroundColor: c.backgroundSecondary }]}
              onPress={() => pickImage("library")}
              disabled={parsing}
            >
              <Ionicons name="images-outline" size={18} color={c.text} />
              <Text style={[s.btnText, { color: c.text }]}>사진 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { borderColor: c.cardBorder, backgroundColor: c.backgroundSecondary }]}
              onPress={() => pickImage("camera")}
              disabled={parsing}
            >
              <Ionicons name="camera-outline" size={18} color={c.text} />
              <Text style={[s.btnText, { color: c.text }]}>카메라</Text>
            </TouchableOpacity>
          </View>
        </View>

        {imageUri && (
          <View style={[s.card, { backgroundColor: c.card, alignItems: "center", padding: 8 }]}>
            <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />
          </View>
        )}

        {parsing && (
          <View style={[s.card, { backgroundColor: c.card, flexDirection: "row", gap: 10 }]}>
            <ActivityIndicator size="small" color={c.tint} />
            <Text style={[s.cardDesc, { color: c.textSecondary, flex: 1 }]}>
              체결 정보 추출 중...
            </Text>
          </View>
        )}

        {error && (
          <View style={[s.card, { backgroundColor: "#F0445218", borderColor: "#F0445255", borderWidth: 1 }]}>
            <Text style={[s.cardDesc, { color: "#F04452" }]}>{error}</Text>
          </View>
        )}

        {trade && !parsing && (
          <View style={[s.card, { backgroundColor: c.card }]}>
            <View style={s.headerRow}>
              <View style={[s.sidePill, { backgroundColor: sideColor + "22" }]}>
                <Text style={[s.sidePillText, { color: sideColor }]}>{sideLabel}</Text>
              </View>
              {trade.matched ? (
                <View style={[s.matchPill, { backgroundColor: "#22C55E22" }]}>
                  <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                  <Text style={[s.matchPillText, { color: "#22C55E" }]}>매칭됨</Text>
                </View>
              ) : (
                <View style={[s.matchPill, { backgroundColor: "#F59E0B22" }]}>
                  <Ionicons name="alert-circle" size={12} color="#F59E0B" />
                  <Text style={[s.matchPillText, { color: "#F59E0B" }]}>매칭 안 됨</Text>
                </View>
              )}
            </View>

            <Text style={[s.tradeName, { color: c.text }]}>
              {trade.nameKrShown}
              {trade.ticker ? `  (${trade.ticker} · ${trade.market})` : ""}
            </Text>

            <View style={[s.gridRow, { borderColor: c.separator }]}>
              <Cell c={c} label="수량" value={`${trade.quantity}주`} />
              <Cell c={c} label="단가" value={trade.currency === "USD" ? `$${trade.price.toFixed(2)}` : `₩${Math.round(trade.price).toLocaleString()}`} />
              <Cell c={c} label="총액" value={trade.totalKRW ? `₩${Math.round(trade.totalKRW).toLocaleString()}` : "—"} />
            </View>

            <TouchableOpacity
              style={[s.confirmBtn, { backgroundColor: sideColor, opacity: saving ? 0.6 : 1 }]}
              onPress={onConfirm}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.confirmText}>이대로 {sideLabel} 등록</Text>
              )}
            </TouchableOpacity>

            <Text style={[s.note, { color: c.textTertiary }]}>
              · 카테고리·섹터는 카탈로그 기본값으로 채워집니다 (등록 후 포트폴리오에서 수정 가능).{"\n"}
              · 손절 -{Math.abs(ABSOLUTE_LIMITS.STOP_LOSS_DEFAULT)}% / 익절 {DEFAULT_TP.join("/")}% 자동 설정.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Cell({ c, label, value }: { c: any; label: string; value: string }) {
  return (
    <View style={s.cell}>
      <Text style={[s.cellLabel, { color: c.textTertiary }]}>{label}</Text>
      <Text style={[s.cellValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 14 },

  card: { borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, lineHeight: 19 },

  btnRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  preview: { width: "100%", height: 220, borderRadius: 12 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sidePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  sidePillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  matchPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  matchPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  tradeName: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },

  gridRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  cell: { flex: 1, alignItems: "center", gap: 4 },
  cellLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cellValue: { fontSize: 15, fontFamily: "Inter_700Bold" },

  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  confirmText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  note: { fontSize: 11, lineHeight: 17, marginTop: 4 },
});
