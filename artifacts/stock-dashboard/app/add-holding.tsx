import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { STOCKS } from "@/constants/stockData";
import { getStockMetadata } from "@/constants/stockMetadata";
import {
  Category, Sector, CATEGORY_LABEL, CATEGORY_COLOR, SECTOR_LABEL, Position,
} from "@/types/portfolio";
import { usePortfolio } from "@/context/PortfolioContext";
import { useMarketIntel } from "@/hooks/useMarketIntel";
import { regimeFromPhase } from "@/utils/regimePlaybook";
import { showAlert } from "@/utils/crossAlert";

type Mkt  = Position["market"];
type Curr = Position["currency"];
const ALL_MARKETS:    Mkt[]      = ["KOSPI", "KOSDAQ", "NASDAQ"];
const ALL_CATEGORIES: Category[] = ["A_CORE", "B_EVENT", "C_CONTRARIAN", "D_SPECULATIVE"];
const ALL_SECTORS:    Sector[]   = [
  "SEMICONDUCTOR", "ENERGY", "DEFENSE", "SHIPBUILDING", "NUCLEAR",
  "BIGTECH_AI", "QUANTUM", "MICROCAP", "POWER_INFRA", "BATTERY",
  "AUTO", "INSURANCE",
];
const DEFAULT_TP = [3, 5, 8, 15];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(s: string): number | null {
  const m = s.trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const t = new Date(Number(y), Number(mo) - 1, Number(d)).getTime();
  return Number.isFinite(t) ? t : null;
}

export default function AddHoldingScreen() {
  const isDark  = useColorScheme() === "dark";
  const c       = isDark ? Colors.dark : Colors.light;
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { addPosition } = usePortfolio();
  const { data: marketIntel } = useMarketIntel("us");
  const currentRegime = marketIntel ? regimeFromPhase(marketIntel.cycle.phase) : undefined;

  const [stockId,  setStockId]  = useState<string | undefined>();
  const [ticker,   setTicker]   = useState("");
  const [name,     setName]     = useState("");
  const [market,   setMarket]   = useState<Mkt>("NASDAQ");
  const [currency, setCurrency] = useState<Curr>("USD");
  const [category, setCategory] = useState<Category>("B_EVENT");
  const [sectors,  setSectors]  = useState<Sector[]>([]);
  const [price,    setPrice]    = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryDate,setEntryDate]= useState(todayStr());
  const [reason,   setReason]   = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [tpLevels, setTpLevels] = useState(DEFAULT_TP.join(", "));

  const stockOptions = useMemo(
    () => STOCKS.filter(s => {
      const q = ticker.trim().toLowerCase();
      if (!q || stockId === s.id) return false;
      return s.ticker.toLowerCase().includes(q)
          || s.name.toLowerCase().includes(q)
          || s.id.toLowerCase().includes(q);
    }).slice(0, 8),
    [ticker, stockId],
  );

  const pickStock = (id: string) => {
    const s = STOCKS.find(x => x.id === id);
    if (!s) return;
    const m = getStockMetadata(id);
    setStockId(id);
    setTicker(s.ticker);
    setName(s.name);
    setCategory(m.category);
    setSectors(m.sectors);
    if (s.market === "KOSPI" || s.market === "KOSDAQ" || s.market === "NASDAQ") setMarket(s.market);
    if (s.currency === "USD" || s.currency === "KRW") setCurrency(s.currency);
  };

  const toggleSector = (sec: Sector) => {
    setSectors(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const priceNum = Number(price.replace(/,/g, ""));
  const qtyNum   = Number(quantity.replace(/,/g, ""));
  const totalCost = (Number.isFinite(priceNum) && Number.isFinite(qtyNum) && priceNum > 0 && qtyNum > 0)
    ? priceNum * qtyNum : 0;

  const handleSubmit = async () => {
    if (!ticker.trim() || !name.trim()) {
      showAlert("입력 누락", "종목 티커와 이름을 입력하세요."); return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      showAlert("입력 누락", "평균 매수단가를 입력하세요."); return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      showAlert("입력 누락", "보유 수량을 입력하세요."); return;
    }
    const ts = parseDate(entryDate);
    if (ts == null) {
      showAlert("날짜 형식", "진입일은 YYYY-MM-DD 형식으로 입력하세요. 예) 2026-01-15"); return;
    }

    const stopLossNum = stopLoss ? Number(stopLoss.replace(/,/g, "")) : 0;
    const tpArr = tpLevels.split(/[,\s]+/).map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);

    showAlert(
      "보유 등록",
      `${name} ${qtyNum}주 @ ${currency === "USD" ? "$" : ""}${priceNum.toLocaleString()}${currency === "KRW" ? "원" : ""}\n` +
      `진입일 ${entryDate} · 현금은 차감되지 않습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "등록",
          onPress: async () => {
            try {
              await addPosition({
                ticker:              ticker.toUpperCase().trim(),
                name:                name.trim(),
                market,
                category,
                sectors,
                avgPrice:            priceNum,
                quantity:            qtyNum,
                currency,
                entryDate:           ts,
                entryReason:         reason.trim() || "(과거 보유 - 사후 등록)",
                stopLoss:            stopLossNum,
                takeProfitLevels:    tpArr,
                executedTakeProfits: [],
                isImpulseBuy:        false,
                isInLiquidationMode: false,
                notes:               [],
                entryRegime:         currentRegime,
              });
              router.back();
            } catch (e: any) {
              showAlert("오류", e?.message ?? "등록 실패");
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
        <Text style={[styles.headerTitle, { color: c.text }]}>보유 등록</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.banner, { backgroundColor: isDark ? "#1A2332" : "#EFF6FF" }]}>
          <Ionicons name="information-circle-outline" size={18} color="#3478F6" />
          <Text style={[styles.bannerText, { color: c.textSecondary }]}>
            이미 보유 중인 주식을 등록합니다. 검증·쿨다운 없이 바로 추가되며,
            현금 잔고는 차감되지 않습니다.
          </Text>
        </View>

        {/* 종목 */}
        <Text style={[styles.section, { color: c.text }]}>종목</Text>
        <View style={[styles.card, { backgroundColor: c.card, gap: 8 }]}>
          <Text style={[styles.label, { color: c.textSecondary }]}>티커</Text>
          <TextInput
            value={ticker}
            onChangeText={(t) => { setTicker(t); setStockId(undefined); }}
            placeholder="예) NVDA, 005930"
            placeholderTextColor={c.textTertiary}
            autoCapitalize="characters"
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />
          {stockOptions.length > 0 && (
            <View style={[styles.suggest, { backgroundColor: isDark ? "#1A1A1C" : "#F2F2F7" }]}>
              {stockOptions.map(s => (
                <TouchableOpacity key={s.id} onPress={() => pickStock(s.id)} style={styles.suggestRow}>
                  <Text style={[styles.suggestTicker, { color: c.text }]}>{s.ticker}</Text>
                  <Text style={[styles.suggestName, { color: c.textSecondary }]} numberOfLines={1}>
                    {s.name} · {s.market}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: c.textSecondary, marginTop: 6 }]}>종목명</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="예) NVIDIA"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          <Text style={[styles.label, { color: c.textSecondary, marginTop: 6 }]}>시장 / 통화</Text>
          <View style={styles.chips}>
            {ALL_MARKETS.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMarket(m); setCurrency(m === "NASDAQ" ? "USD" : "KRW"); }}
                style={[
                  styles.chip,
                  market === m
                    ? { backgroundColor: c.tint, borderColor: c.tint }
                    : { borderColor: c.separator },
                ]}
              >
                <Text style={[styles.chipText, { color: market === m ? "#fff" : c.textSecondary }]}>
                  {m === "NASDAQ" ? "🇺🇸 NASDAQ" : m === "KOSPI" ? "🇰🇷 KOSPI" : "🇰🇷 KOSDAQ"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 카테고리 + 섹터 */}
        <Text style={[styles.section, { color: c.text }]}>카테고리 · 섹터</Text>
        <View style={[styles.card, { backgroundColor: c.card, gap: 10 }]}>
          <View style={styles.chips}>
            {ALL_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.chip,
                  category === cat
                    ? { backgroundColor: CATEGORY_COLOR[cat], borderColor: CATEGORY_COLOR[cat] }
                    : { borderColor: c.separator },
                ]}
              >
                <Text style={[styles.chipText, { color: category === cat ? "#fff" : c.textSecondary }]}>
                  {CATEGORY_LABEL[cat]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chips}>
            {ALL_SECTORS.map(sec => (
              <TouchableOpacity
                key={sec}
                onPress={() => toggleSector(sec)}
                style={[
                  styles.chipSm,
                  sectors.includes(sec)
                    ? { backgroundColor: c.tint, borderColor: c.tint }
                    : { borderColor: c.separator },
                ]}
              >
                <Text style={[styles.chipSmText, { color: sectors.includes(sec) ? "#fff" : c.textSecondary }]}>
                  {SECTOR_LABEL[sec]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 평단 + 수량 + 진입일 */}
        <Text style={[styles.section, { color: c.text }]}>평단 · 수량 · 진입일</Text>
        <View style={[styles.card, { backgroundColor: c.card, gap: 10 }]}>
          <Text style={[styles.label, { color: c.textSecondary }]}>
            평균 매수단가 ({currency})
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>보유 수량</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>진입일 (YYYY-MM-DD)</Text>
          <TextInput
            value={entryDate}
            onChangeText={setEntryDate}
            placeholder="2026-01-15"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          {totalCost > 0 && (
            <View style={[styles.preview, { borderTopColor: c.separator }]}>
              <Text style={[styles.previewLabel, { color: c.textTertiary }]}>총 매입원가</Text>
              <Text style={[styles.previewValue, { color: c.text }]}>
                {currency === "USD"
                  ? `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : `${Math.round(totalCost).toLocaleString()}원`}
              </Text>
            </View>
          )}
        </View>

        {/* 손절·익절 (선택) */}
        <Text style={[styles.section, { color: c.text }]}>손절 · 익절 (선택)</Text>
        <View style={[styles.card, { backgroundColor: c.card, gap: 10 }]}>
          <Text style={[styles.label, { color: c.textSecondary }]}>
            손절가 ({currency}) — 비우면 알림 없음
          </Text>
          <TextInput
            value={stopLoss}
            onChangeText={setStopLoss}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>익절 사다리 (% , 콤마 구분)</Text>
          <TextInput
            value={tpLevels}
            onChangeText={setTpLevels}
            placeholder="3, 5, 8, 15"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />

          <Text style={[styles.label, { color: c.textSecondary }]}>매수 근거 (선택)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="기억나는 매수 사유"
            placeholderTextColor={c.textTertiary}
            multiline
            style={[styles.textarea, { color: c.text, borderColor: c.separator }]}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, {
        backgroundColor: c.background, borderTopColor: c.separator,
        paddingBottom: insets.bottom + 12,
      }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: c.tint }]}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.submitText}>보유 등록</Text>
        </TouchableOpacity>
      </View>
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
  scroll:      { padding: 16, gap: 12 },

  banner:      {
    flexDirection: "row", gap: 8, padding: 12,
    borderRadius: 10, alignItems: "flex-start",
  },
  bannerText:  { fontSize: 12, lineHeight: 18, flex: 1 },

  section:     { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4, marginLeft: 4 },
  card:        { borderRadius: 14, padding: 14 },
  label:       { fontSize: 12, fontFamily: "Inter_500Medium" },
  input:       {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  textarea:    {
    borderWidth: 1, borderRadius: 8, padding: 10,
    minHeight: 60, fontSize: 13, textAlignVertical: "top",
  },

  chips:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  chipText:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chipSm:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  chipSmText:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  suggest:     { borderRadius: 8, paddingVertical: 4 },
  suggestRow:  { flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingVertical: 7, alignItems: "center" },
  suggestTicker:{ fontSize: 13, fontFamily: "Inter_700Bold", width: 70 },
  suggestName: { fontSize: 12, flex: 1 },

  preview:     {
    borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10,
    flexDirection: "row", justifyContent: "space-between",
  },
  previewLabel:{ fontSize: 12 },
  previewValue:{ fontSize: 14, fontFamily: "Inter_700Bold" },

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
