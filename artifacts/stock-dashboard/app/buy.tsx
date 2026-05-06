import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  useColorScheme, Switch,
} from "react-native";
import { showAlert } from "@/utils/crossAlert";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { STOCKS } from "@/constants/stockData";
import { getStockMetadata } from "@/constants/stockMetadata";
import {
  Category, Sector, CATEGORY_LABEL, CATEGORY_COLOR, SECTOR_LABEL, Position,
} from "@/types/portfolio";
import { CATEGORY_LIMITS, ABSOLUTE_LIMITS } from "@/constants/rules";
import { usePortfolio } from "@/context/PortfolioContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { useMarketIntel } from "@/hooks/useMarketIntel";
import { regimeFromPhase } from "@/utils/regimePlaybook";
import { validateEntry } from "@/services/entryValidator";
import ImpulseChecklist from "@/components/ImpulseChecklist";

type Mkt  = Position["market"];
type Curr = Position["currency"];
const ALL_MARKETS: Mkt[] = ["KOSPI", "KOSDAQ", "NASDAQ"];

const ALL_SECTORS: Sector[] = [
  "SEMICONDUCTOR", "ENERGY", "DEFENSE", "SHIPBUILDING", "NUCLEAR",
  "BIGTECH_AI", "QUANTUM", "MICROCAP", "POWER_INFRA", "BATTERY",
  "AUTO", "INSURANCE",
];
const ALL_CATEGORIES: Category[] = ["A_CORE", "B_EVENT", "C_CONTRARIAN", "D_SPECULATIVE"];
const DEFAULT_TP = [3, 5, 8, 15];

export default function BuyScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ stockId?: string }>();
  const { portfolio, settings, avgPositionSize, addPendingEntry, executeBuy } = usePortfolio();
  const { data: marketIntel } = useMarketIntel("us");
  const currentRegime = marketIntel ? regimeFromPhase(marketIntel.cycle.phase) : undefined;
  const { getQuote, usdKrw } = useStockPrice();

  const initialStock = params.stockId
    ? STOCKS.find(s => s.id === params.stockId)
    : undefined;
  const initialMeta  = initialStock ? getStockMetadata(initialStock.id) : undefined;
  const initialMarket: Mkt =
    (initialStock?.market === "KOSPI" || initialStock?.market === "KOSDAQ" || initialStock?.market === "NASDAQ")
      ? initialStock.market
      : "NASDAQ";
  const initialCurrency: Curr =
    initialStock?.currency === "USD" ? "USD" : initialStock?.currency === "KRW" ? "KRW" :
    (initialMarket === "NASDAQ" ? "USD" : "KRW");

  const [stockId,  setStockId]  = useState<string | undefined>(initialStock?.id);
  const [ticker,   setTicker]   = useState(initialStock?.ticker ?? "");
  const [name,     setName]     = useState(initialStock?.name ?? "");
  const [market,   setMarket]   = useState<Mkt>(initialMarket);
  const [currency, setCurrency] = useState<Curr>(initialCurrency);
  const [category, setCategory] = useState<Category>(initialMeta?.category ?? "B_EVENT");
  const [sectors,  setSectors]  = useState<Sector[]>(initialMeta?.sectors ?? []);
  const [price,    setPrice]    = useState("");
  const [quantity, setQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [tpLevels, setTpLevels] = useState(DEFAULT_TP.join(", "));
  const [reason,   setReason]   = useState("");
  const [impulse,  setImpulse]  = useState<boolean[]>(new Array(7).fill(false));
  const [markImpulseAtBuy, setMarkImpulseAtBuy] = useState(false);

  const fxRate = usdKrw && usdKrw > 100 ? usdKrw : settings.fxRateUSDKRW;
  const liveQuote = ticker ? getQuote(ticker.toUpperCase(), market) : null;

  const priceNum = Number(price.replace(/,/g, ""));
  const qtyNum   = Number(quantity.replace(/,/g, ""));
  const totalCost      = (Number.isFinite(priceNum) && Number.isFinite(qtyNum) && priceNum > 0 && qtyNum > 0)
    ? priceNum * qtyNum : 0;
  const totalCostKRW   = currency === "USD" ? totalCost * fxRate : totalCost;
  const cashAvailable  = currency === "USD" ? settings.cashBalanceUSD : settings.cashBalanceKRW;
  const cashAfter      = cashAvailable - totalCost;

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
    setSectors(prev => prev.includes(sec)
      ? prev.filter(s => s !== sec)
      : [...prev, sec]);
  };

  const handleValidate = async () => {
    const stopLossNum = stopLoss ? Number(stopLoss.replace(/,/g, "")) : null;
    const tpArr = tpLevels.split(/[,\s]+/).map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);

    if (!ticker.trim() || !name.trim()) {
      showAlert("입력 누락", "종목 티커와 이름을 입력하세요.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      showAlert("입력 누락", "매수 단가를 입력하세요.");
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      showAlert("입력 누락", "매수 수량을 입력하세요.");
      return;
    }
    const amountNum = totalCostKRW;

    const result = validateEntry(
      {
        ticker:                  ticker.trim().toLowerCase(),
        name:                    name.trim(),
        category, sectors,
        targetAmount:            amountNum,
        entryReason:             reason,
        stopLoss:                stopLossNum,
        takeProfitLevels:        tpArr,
        userAckImpulseChecklist: impulse,
      },
      portfolio,
      { avgPositionSize },
    );

    if (!result.passed) {
      showAlert(
        "진입 차단",
        result.blockers.map((b, i) => `${i + 1}. ${b}`).join("\n"),
        [
          { text: "수정", style: "cancel" },
          {
            text: "쿨다운으로 보내기", onPress: async () => {
              const entry = await addPendingEntry({
                request: {
                  ticker:    ticker.trim().toLowerCase(),
                  name:      name.trim(),
                  category, sectors,
                  targetAmount:     amountNum,
                  entryReason:      reason,
                  stopLoss:         stopLossNum,
                  takeProfitLevels: tpArr,
                  userAckImpulseChecklist: impulse,
                },
                cooldownUntil: Date.now() + result.requiredCooldownHours * 3_600_000,
              });
              router.replace(`/cooldown/${entry.id}`);
            },
          },
        ],
      );
      return;
    }

    const warningMsg = result.warnings.length > 0
      ? `\n\n경고:\n${result.warnings.map(w => `· ${w}`).join("\n")}`
      : "";

    showAlert(
      "검증 통과",
      `${result.requiredCooldownHours}시간 쿨다운 후 매수 가능합니다.${warningMsg}`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "쿨다운 시작",
          onPress: async () => {
            const entry = await addPendingEntry({
              request: {
                ticker:    ticker.trim().toLowerCase(),
                name:      name.trim(),
                category, sectors,
                targetAmount:     amountNum,
                entryReason:      reason,
                stopLoss:         stopLossNum,
                takeProfitLevels: tpArr,
                userAckImpulseChecklist: impulse,
              },
              cooldownUntil: Date.now() + result.requiredCooldownHours * 3_600_000,
            });
            router.replace(`/cooldown/${entry.id}`);
          },
        },
        {
          text: "즉시 보유 등록",
          onPress: async () => {
            await executeBuy({
              ticker:           ticker.trim().toLowerCase(),
              name:             name.trim(),
              market,
              category, sectors,
              avgPrice:         priceNum,
              quantity:         qtyNum,
              currency,
              entryDate:        Date.now(),
              entryReason:      reason,
              stopLoss:         stopLossNum ?? priceNum * (1 + ABSOLUTE_LIMITS.STOP_LOSS_DEFAULT / 100),
              takeProfitLevels: tpArr,
              executedTakeProfits: [],
              isImpulseBuy:     markImpulseAtBuy,
              isInLiquidationMode: false,
              notes:            [],
              entryRegime:      currentRegime,
            });
            router.replace("/(tabs)/portfolio");
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: c.separator }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>매수 플로우</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 종목 검색/입력 */}
        <Section title="종목" c={c}>
          <TextInput
            value={ticker}
            onChangeText={(v) => { setTicker(v); setStockId(undefined); }}
            placeholder="티커 또는 이름 검색"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
            autoCapitalize="characters"
          />
          {stockOptions.length > 0 && (
            <View style={[styles.options, { borderColor: c.separator }]}>
              {stockOptions.map(s => (
                <TouchableOpacity
                  key={s.id} style={styles.option} onPress={() => pickStock(s.id)}
                >
                  <Text style={[styles.optionTicker, { color: c.text }]}>
                    {s.ticker.toUpperCase()}
                  </Text>
                  <Text style={[styles.optionName, { color: c.textSecondary }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="종목명"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator, marginTop: 8 }]}
          />
        </Section>

        {/* 카테고리 */}
        <Section title="카테고리" c={c}>
          <View style={styles.chipRow}>
            {ALL_CATEGORIES.map(cat => {
              const active = category === cat;
              const lim = CATEGORY_LIMITS.find(x => x.category === cat);
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.chip, {
                    backgroundColor: active ? CATEGORY_COLOR[cat] : "transparent",
                    borderColor:     active ? CATEGORY_COLOR[cat] : c.separator,
                  }]}
                >
                  <Text style={[styles.chipText, { color: active ? "#fff" : c.text }]}>
                    {CATEGORY_LABEL[cat]}
                  </Text>
                  <Text style={[styles.chipMeta, { color: active ? "#fff" : c.textTertiary }]}>
                    상한 {lim?.maxSinglePosition}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* 섹터 */}
        <Section title="섹터 (다중 선택)" c={c}>
          <View style={styles.chipRow}>
            {ALL_SECTORS.map(sec => {
              const active = sectors.includes(sec);
              return (
                <TouchableOpacity
                  key={sec}
                  onPress={() => toggleSector(sec)}
                  style={[styles.chipSm, {
                    backgroundColor: active ? c.tint : "transparent",
                    borderColor:     active ? c.tint : c.separator,
                  }]}
                >
                  <Text style={[styles.chipSmText, { color: active ? "#fff" : c.text }]}>
                    {SECTOR_LABEL[sec]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* 시장 */}
        <Section title="시장" c={c}>
          <View style={styles.chipRow}>
            {ALL_MARKETS.map(m => {
              const active = market === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setMarket(m);
                    setCurrency(m === "NASDAQ" ? "USD" : "KRW");
                  }}
                  style={[styles.chip, {
                    backgroundColor: active ? c.tint : "transparent",
                    borderColor:     active ? c.tint : c.separator,
                  }]}
                >
                  <Text style={[styles.chipText, { color: active ? "#fff" : c.text }]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* 단가 + 수량 */}
        <Section title={`매수 단가 + 수량 (${currency === "USD" ? "$" : "₩"})`} c={c}>
          {liveQuote && liveQuote.ok && (
            <TouchableOpacity
              onPress={() => setPrice(String(liveQuote.price))}
              style={[styles.livePriceBtn, { borderColor: c.separator }]}
            >
              <Ionicons name="pulse" size={14} color={c.tint} />
              <Text style={[styles.livePriceText, { color: c.text }]}>
                현물가 {currency === "USD" ? `$${liveQuote.price.toFixed(2)}` : `${Math.round(liveQuote.price).toLocaleString()}원`}
                {" "}({liveQuote.changePercent >= 0 ? "+" : ""}{liveQuote.changePercent.toFixed(2)}%)
              </Text>
              <Text style={[styles.livePriceTap, { color: c.tint }]}>탭하여 입력</Text>
            </TouchableOpacity>
          )}
          <View style={styles.row2}>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder={currency === "USD" ? "단가 ($)" : "단가 (원)"}
              placeholderTextColor={c.textTertiary}
              keyboardType="numeric"
              style={[styles.input, styles.flex1, { color: c.text, borderColor: c.separator }]}
            />
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="수량"
              placeholderTextColor={c.textTertiary}
              keyboardType="numeric"
              style={[styles.input, styles.flexHalf, { color: c.text, borderColor: c.separator }]}
            />
          </View>
          {totalCost > 0 && (
            <View style={[styles.summary, { borderColor: c.separator }]}>
              <Text style={[styles.summaryLine, { color: c.text }]}>
                총 매수금액: {currency === "USD"
                  ? `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} (≈ ${Math.round(totalCostKRW).toLocaleString()}원)`
                  : `${totalCost.toLocaleString()}원`}
              </Text>
              <Text style={[styles.summaryLine, {
                color: cashAfter < 0 ? "#FF3B30" : c.textSecondary,
              }]}>
                {currency === "USD" ? "달러" : "원화"} 잔고:
                {" "}{cashAvailable.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {" → "}
                {cashAfter.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {cashAfter < 0 && " ⚠️ 부족"}
              </Text>
            </View>
          )}
          <Text style={[styles.hint, { color: c.textTertiary }]}>
            평균 사이즈 {avgPositionSize > 0 ? `${avgPositionSize.toLocaleString()}원` : "데이터 없음"} ·
            {" "}1.5배 초과 시 48시간 쿨다운
          </Text>
        </Section>

        {/* 손절/익절 */}
        <Section title="손절가 + 익절 사다리 (필수)" c={c}>
          <TextInput
            value={stopLoss}
            onChangeText={setStopLoss}
            placeholder="손절가 (원/USD)"
            placeholderTextColor={c.textTertiary}
            keyboardType="numeric"
            style={[styles.input, { color: c.text, borderColor: c.separator }]}
          />
          <TextInput
            value={tpLevels}
            onChangeText={setTpLevels}
            placeholder="익절 % 콤마 구분 (기본 3, 5, 8, 15)"
            placeholderTextColor={c.textTertiary}
            style={[styles.input, { color: c.text, borderColor: c.separator, marginTop: 8 }]}
          />
        </Section>

        {/* 매수 근거 */}
        <Section title={`매수 근거 (${ABSOLUTE_LIMITS.MIN_ENTRY_REASON_LENGTH}자 이상)`} c={c}>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="시나리오, 촉매, 리스크를 3문장 이상으로"
            placeholderTextColor={c.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={[
              styles.input, styles.textArea,
              { color: c.text, borderColor: c.separator },
            ]}
          />
          <Text style={[styles.hint, {
            color: reason.length >= ABSOLUTE_LIMITS.MIN_ENTRY_REASON_LENGTH ? "#22C55E" : c.textTertiary,
          }]}>
            {reason.length} / {ABSOLUTE_LIMITS.MIN_ENTRY_REASON_LENGTH}자
          </Text>
        </Section>

        {/* 뇌동 체크리스트 */}
        <ImpulseChecklist value={impulse} onChange={setImpulse} />

        {/* 라벨 옵션 */}
        <View style={[styles.toggleRow, { backgroundColor: c.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: c.text }]}>뇌동 매수로 표시</Text>
            <Text style={[styles.toggleHint, { color: c.textTertiary }]}>
              사후 정리 모드 종목으로 분류됩니다
            </Text>
          </View>
          <Switch value={markImpulseAtBuy} onValueChange={setMarkImpulseAtBuy} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.separator, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.submit, { backgroundColor: c.tint }]}
          onPress={handleValidate}
          activeOpacity={0.85}
        >
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
          <Text style={styles.submitText}>검증 실행</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, c, children }: { title: string; c: any; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: c.card }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {children}
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

  section:      { borderRadius: 14, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },

  input:        {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14,
  },
  textArea:     { minHeight: 100 },
  hint:         { fontSize: 11, marginTop: 4 },

  options:      { borderWidth: 1, borderRadius: 8, marginTop: 8, overflow: "hidden" },
  option:       { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", gap: 8 },
  optionTicker: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 60 },
  optionName:   { fontSize: 12, flex: 1 },

  chipRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip:         {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, gap: 2, alignItems: "center",
  },
  chipText:     { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chipMeta:     { fontSize: 10 },
  chipSm:       {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    borderWidth: 1,
  },
  chipSmText:   { fontSize: 12, fontFamily: "Inter_500Medium" },

  row2:         { flexDirection: "row", gap: 8 },
  flex1:        { flex: 2 },
  flexHalf:     { flex: 1 },
  livePriceBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderRadius: 8, marginBottom: 4,
  },
  livePriceText:{ fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  livePriceTap: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  summary:      {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, gap: 4, marginTop: 4,
  },
  summaryLine:  { fontSize: 12, fontFamily: "Inter_500Medium" },

  toggleRow:    {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderRadius: 12, gap: 12,
  },
  toggleLabel:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleHint:   { fontSize: 11, marginTop: 2 },

  footer:       {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submit:       {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 12,
  },
  submitText:   { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
