import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Image, useColorScheme, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import Colors from "@/constants/colors";
import { usePortfolio } from "@/context/PortfolioContext";
import { parsePortfolioImage, type ParsedPosition } from "@/services/portfolioImport";
import { Position } from "@/types/portfolio";
import { getStockMetadata } from "@/constants/stockMetadata";
import { showAlert } from "@/utils/crossAlert";

interface DraftRow extends ParsedPosition {
  include: boolean;
  /** 화면 통화 기준 평단 (편집 가능) */
  avgPriceText: string;
  qtyText:      string;
}

const DEFAULT_TP = [3, 5, 8, 15];

function deriveAvgPrice(p: ParsedPosition, fxRate: number): number {
  if (p.quantity <= 0) return 0;
  if (p.currency === "USD") {
    return (p.marketValueKRW / fxRate) / p.quantity;
  }
  return p.marketValueKRW / p.quantity;
}

function fmtNum(n: number, digits = 2): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function ImportScreenshot() {
  const isDark    = useColorScheme() === "dark";
  const c         = isDark ? Colors.dark : Colors.light;
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const { addPosition, settings } = usePortfolio();
  const fxRate    = settings.fxRateUSDKRW || 1400;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [rows,     setRows]     = useState<DraftRow[]>([]);
  const [saving,   setSaving]   = useState(false);

  const pickImage = useCallback(async (source: "camera" | "library") => {
    setError(null);
    try {
      let perm;
      if (source === "camera") {
        perm = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      if (!perm.granted) {
        setError("이미지 접근 권한이 필요합니다.");
        return;
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({
            quality: 0.6, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.6, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images,
          });
      if (result.canceled || !result.assets?.[0]?.base64) return;

      const asset = result.assets[0];
      setImageUri(asset.uri);
      setRows([]);
      setLoading(true);
      const mime = asset.mimeType ?? "image/jpeg";
      const parsed = await parsePortfolioImage(asset.base64!, mime);
      if (parsed.length === 0) {
        setError("종목을 인식하지 못했습니다. 화면이 명확하게 보이는 다른 사진을 시도하세요.");
        setLoading(false);
        return;
      }
      setRows(parsed.map(p => ({
        ...p,
        include: p.matched,
        avgPriceText: fmtNum(deriveAvgPrice(p, fxRate), p.currency === "USD" ? 2 : 0),
        qtyText:      String(p.quantity),
      })));
    } catch (e: any) {
      setError(e?.message ?? "이미지 처리 실패");
    } finally {
      setLoading(false);
    }
  }, [fxRate]);

  const toggleInclude = (i: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, include: !r.include } : r));
  };
  const updateField = (i: number, key: "avgPriceText" | "qtyText", v: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: v } : r));
  };

  const includedCount = rows.filter(r => r.include).length;

  const handleRegister = async () => {
    const valid = rows.filter(r => r.include && r.matched && r.ticker && r.market && r.currency);
    if (valid.length === 0) {
      showAlert("등록 불가", "체크된 종목 중 매칭된 항목이 없습니다.");
      return;
    }
    setSaving(true);
    try {
      let added = 0;
      for (const r of valid) {
        const avgPrice = parseFloat(r.avgPriceText.replace(/,/g, ""));
        const quantity = parseFloat(r.qtyText.replace(/,/g, ""));
        if (!Number.isFinite(avgPrice) || avgPrice <= 0) continue;
        if (!Number.isFinite(quantity) || quantity <= 0) continue;
        const stockId = `${r.ticker!.toLowerCase()}-${r.market!.toLowerCase()}`;
        const meta = getStockMetadata(stockId);
        const newPos: Omit<Position, "id"> = {
          ticker:              r.ticker!,
          name:                r.nameKrShown,
          market:              r.market!,
          category:            meta.category,
          sectors:             meta.sectors,
          avgPrice,
          quantity,
          currency:            r.currency!,
          entryDate:           Date.now(),
          entryReason:         "스크린샷 자동 등록",
          stopLoss:            0,
          takeProfitLevels:    DEFAULT_TP,
          executedTakeProfits: [],
          isImpulseBuy:        false,
          isInLiquidationMode: false,
          notes:               [],
        };
        await addPosition(newPos);
        added++;
      }
      Alert.alert(
        "등록 완료",
        `${added}건의 보유 종목이 추가되었습니다. 보유 관리에서 평단·손절을 확인하세요.`,
        [{ text: "확인", onPress: () => router.back() }],
      );
    } catch (e: any) {
      showAlert("등록 실패", e?.message ?? "");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>사진으로 가져오기</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}>
        {!imageUri && (
          <View style={[styles.intro, { backgroundColor: c.card }]}>
            <Ionicons name="camera-outline" size={36} color={c.tint} />
            <Text style={[styles.introTitle, { color: c.text }]}>
              증권사 앱 화면을 찍으세요
            </Text>
            <Text style={[styles.introHint, { color: c.textSecondary }]}>
              토스증권·한국투자·미래에셋 등의 보유종목 화면이면 됩니다.
              종목명·수량·평가금액을 자동으로 읽어 보유 등록을 채워드립니다.
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: c.tint }]} onPress={() => pickImage("camera")}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.bigBtnText}>카메라</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: c.tint }]} onPress={() => pickImage("library")}>
                <Ionicons name="images" size={18} color="#fff" />
                <Text style={styles.bigBtnText}>앨범</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {imageUri && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity onPress={() => { setImageUri(null); setRows([]); setError(null); }}>
              <Text style={[styles.changeText, { color: c.tint }]}>다른 사진 선택</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={c.tint} />
            <Text style={[styles.loadingText, { color: c.textSecondary }]}>
              Claude가 종목을 읽고 있어요…
            </Text>
          </View>
        )}

        {error && (
          <Text style={[styles.errorText, { color: "#F04452" }]}>{error}</Text>
        )}

        {rows.length > 0 && !loading && (
          <>
            <Text style={[styles.section, { color: c.textSecondary }]}>
              인식된 종목 {rows.length}건 · 체크된 {includedCount}건 등록
            </Text>
            <Text style={[styles.hint, { color: c.textTertiary }]}>
              평단은 평가금액 ÷ 수량으로 자동 계산됩니다 (USD 종목은 환율 {fxRate.toLocaleString()}원 적용).
              필요 시 수정 후 등록하세요.
            </Text>

            {rows.map((r, i) => (
              <View key={i} style={[styles.row, {
                backgroundColor: c.card,
                opacity: r.include ? 1 : 0.5,
                borderColor: r.matched ? "transparent" : "#F59E0B66",
                borderWidth: r.matched ? 0 : 1,
              }]}>
                <TouchableOpacity onPress={() => toggleInclude(i)} style={styles.checkBox}>
                  <Ionicons
                    name={r.include ? "checkbox" : "square-outline"}
                    size={22}
                    color={r.include ? c.tint : c.textTertiary}
                  />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.rowTicker, { color: c.text }]}>
                      {r.ticker ?? "?"}
                    </Text>
                    <Text style={[styles.rowMarket, { color: c.textSecondary }]}>
                      {r.market ?? "—"} · {r.currency ?? "—"}
                    </Text>
                    {!r.matched && (
                      <Text style={[styles.unmatched, { color: "#F59E0B" }]}>매칭 실패</Text>
                    )}
                  </View>
                  <Text style={[styles.rowName, { color: c.textSecondary }]}>
                    {r.nameKrShown}
                  </Text>
                  <Text style={[styles.rowMeta, { color: c.textTertiary }]}>
                    평가 {Math.round(r.marketValueKRW).toLocaleString()}원
                    {r.pnlPercent != null && ` · ${r.pnlPercent >= 0 ? "+" : ""}${r.pnlPercent.toFixed(2)}%`}
                  </Text>

                  {r.matched && (
                    <View style={styles.editRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.editLabel, { color: c.textTertiary }]}>
                          평단 ({r.currency})
                        </Text>
                        <TextInput
                          value={r.avgPriceText}
                          onChangeText={v => updateField(i, "avgPriceText", v)}
                          keyboardType="numeric"
                          style={[styles.input, { color: c.text, borderColor: c.separator }]}
                        />
                      </View>
                      <View style={{ width: 90 }}>
                        <Text style={[styles.editLabel, { color: c.textTertiary }]}>수량</Text>
                        <TextInput
                          value={r.qtyText}
                          onChangeText={v => updateField(i, "qtyText", v)}
                          keyboardType="numeric"
                          style={[styles.input, { color: c.text, borderColor: c.separator }]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {rows.length > 0 && (
        <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.separator, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            disabled={includedCount === 0 || saving}
            onPress={handleRegister}
            style={[styles.registerBtn, {
              backgroundColor: includedCount === 0 ? c.separator : c.tint,
              opacity: saving ? 0.6 : 1,
            }]}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.registerText}>{includedCount}건 보유로 등록</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll:       { padding: 16, gap: 12 },
  intro:        { padding: 24, borderRadius: 14, alignItems: "center", gap: 10 },
  introTitle:   { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  introHint:    { fontSize: 13, lineHeight: 19, textAlign: "center" },
  btnRow:       { flexDirection: "row", gap: 10, marginTop: 8 },
  bigBtn:       { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 10 },
  bigBtnText:   { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  previewWrap:  { alignItems: "center", gap: 8 },
  preview:      { width: "100%", height: 200, borderRadius: 10, backgroundColor: "#000" },
  changeText:   { fontSize: 13, fontFamily: "Inter_700Bold" },
  loadingBox:   { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", paddingVertical: 12 },
  loadingText:  { fontSize: 13 },
  errorText:    { fontSize: 13, textAlign: "center", paddingVertical: 8 },
  section:      { fontSize: 13, fontFamily: "Inter_700Bold", marginTop: 6 },
  hint:         { fontSize: 11, lineHeight: 16, marginBottom: 6 },
  row:          { flexDirection: "row", padding: 12, borderRadius: 12, gap: 10 },
  checkBox:     { paddingTop: 2 },
  rowHeader:    { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTicker:    { fontSize: 15, fontFamily: "Inter_700Bold" },
  rowMarket:    { fontSize: 11 },
  unmatched:    { fontSize: 10, fontFamily: "Inter_700Bold" },
  rowName:      { fontSize: 12, marginTop: 2 },
  rowMeta:      { fontSize: 11, marginTop: 4 },
  editRow:      { flexDirection: "row", gap: 8, marginTop: 8 },
  editLabel:    { fontSize: 10, marginBottom: 2 },
  input:        { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  footer:       { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  registerBtn:  { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  registerText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
