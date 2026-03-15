import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { usePortfolio, PortfolioPosition } from "@/context/PortfolioContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { useWatchlist } from "@/context/WatchlistContext";

type ModalMode = "add" | "edit";

const MARKET_OPTIONS = ["NASDAQ", "KOSPI", "KOSDAQ"] as const;

export default function PortfolioScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { positions, addPosition, updatePosition, removePosition } = usePortfolio();
  const { priceKRW } = useStockPrice();
  const { allKnownStocks } = useWatchlist();

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    ticker: "",
    market: "NASDAQ" as typeof MARKET_OPTIONS[number],
    name: "",
    shares: "",
    avgPrice: "",
  });

  const getLive = useCallback(
    (pos: PortfolioPosition) => priceKRW(pos.ticker, pos.market, pos.avgPrice),
    [priceKRW]
  );

  const positions_with_pl = useMemo(
    () =>
      positions.map((pos) => {
        const live = getLive(pos);
        const costBasis = pos.avgPrice * pos.shares;
        const currentValue = live * pos.shares;
        const gainLoss = currentValue - costBasis;
        const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
        return { ...pos, live, currentValue, gainLoss, gainLossPct };
      }),
    [positions, getLive]
  );

  const summary = useMemo(() => {
    const totalCost = positions_with_pl.reduce((s, p) => s + p.avgPrice * p.shares, 0);
    const totalValue = positions_with_pl.reduce((s, p) => s + p.currentValue, 0);
    const totalGL = totalValue - totalCost;
    const totalPct = totalCost > 0 ? (totalGL / totalCost) * 100 : 0;
    return { totalCost, totalValue, totalGL, totalPct };
  }, [positions_with_pl]);

  const openAdd = () => {
    setModalMode("add");
    setEditId(null);
    setForm({ ticker: "", market: "NASDAQ", name: "", shares: "", avgPrice: "" });
    setShowModal(true);
  };

  const openEdit = (pos: PortfolioPosition) => {
    setModalMode("edit");
    setEditId(pos.id);
    setForm({
      ticker: pos.ticker,
      market: pos.market as any,
      name: pos.name,
      shares: String(pos.shares),
      avgPrice: String(pos.avgPrice),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    const shares = parseFloat(form.shares);
    const avgPrice = parseFloat(form.avgPrice);
    if (!form.ticker.trim() || isNaN(shares) || isNaN(avgPrice) || shares <= 0 || avgPrice <= 0) {
      Alert.alert("입력 오류", "모든 항목을 올바르게 입력해 주세요.");
      return;
    }

    const ticker = form.ticker.trim().toUpperCase();
    const known = allKnownStocks.find(
      (s) => s.ticker === ticker && s.market === form.market
    );
    const name = form.name.trim() || known?.name || ticker;

    if (modalMode === "add") {
      addPosition({
        stockId: known?.id ?? ticker.toLowerCase(),
        ticker,
        market: form.market,
        name,
        shares,
        avgPrice,
      });
    } else if (editId) {
      updatePosition(editId, shares, avgPrice);
    }
    setShowModal(false);
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert("포지션 삭제", `${name} 포지션을 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => removePosition(id) },
    ]);
  };

  const isPos = summary.totalGL >= 0;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>내 포트폴리오</Text>
        <Text style={[styles.headerSub, { color: c.textSecondary }]}>
          보유 종목 수익률 한눈에 보기
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* 요약 카드 */}
        <View style={[styles.summaryCard, { backgroundColor: isDark ? "#141B2D" : "#F8FAFC" }]}>
          <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>총 평가금액</Text>
          <Text style={[styles.summaryValue, { color: c.text }]}>
            ₩{Math.round(summary.totalValue).toLocaleString()}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryPL, { color: isPos ? "#F04452" : "#1B63E8" }]}>
              {isPos ? "+" : ""}₩{Math.round(summary.totalGL).toLocaleString()}
            </Text>
            <View style={[styles.pctBadge, { backgroundColor: isPos ? "rgba(240,68,82,0.12)" : "rgba(27,99,232,0.12)" }]}>
              <Text style={[styles.pctText, { color: isPos ? "#F04452" : "#1B63E8" }]}>
                {isPos ? "+" : ""}{summary.totalPct.toFixed(2)}%
              </Text>
            </View>
          </View>
          <View style={[styles.costRow, { borderTopColor: c.separator }]}>
            <Text style={[styles.costLabel, { color: c.textSecondary }]}>총 매수금액</Text>
            <Text style={[styles.costValue, { color: c.text }]}>
              ₩{Math.round(summary.totalCost).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* 포지션 목록 */}
        {positions_with_pl.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={48} color={c.textSecondary} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>포지션이 없습니다</Text>
            <Text style={[styles.emptySub, { color: c.textSecondary }]}>
              + 버튼을 눌러 보유 종목을 추가하세요
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
              보유 종목 {positions_with_pl.length}개
            </Text>
            {positions_with_pl.map((pos) => {
              const up = pos.gainLoss >= 0;
              return (
                <TouchableOpacity
                  key={pos.id}
                  style={[styles.posCard, { backgroundColor: c.card }]}
                  onPress={() => openEdit(pos)}
                  onLongPress={() => confirmDelete(pos.id, pos.name)}
                >
                  <View style={styles.posTop}>
                    <View style={styles.posLeft}>
                      <Text style={[styles.posName, { color: c.text }]}>{pos.name}</Text>
                      <Text style={[styles.posTicker, { color: c.textSecondary }]}>
                        {pos.ticker} · {pos.market} · {pos.shares}주
                      </Text>
                    </View>
                    <View style={styles.posRight}>
                      <Text style={[styles.posValue, { color: c.text }]}>
                        ₩{Math.round(pos.currentValue).toLocaleString()}
                      </Text>
                      <Text style={[styles.posReturn, { color: up ? "#F04452" : "#1B63E8" }]}>
                        {up ? "+" : ""}{pos.gainLossPct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.posDivider, { backgroundColor: c.separator }]} />
                  <View style={styles.posBottom}>
                    <View style={styles.posStat}>
                      <Text style={[styles.posStatLabel, { color: c.textSecondary }]}>평균매수가</Text>
                      <Text style={[styles.posStatVal, { color: c.text }]}>
                        ₩{pos.avgPrice.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.posStat}>
                      <Text style={[styles.posStatLabel, { color: c.textSecondary }]}>현재가</Text>
                      <Text style={[styles.posStatVal, { color: up ? "#F04452" : "#1B63E8" }]}>
                        ₩{pos.live.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.posStat}>
                      <Text style={[styles.posStatLabel, { color: c.textSecondary }]}>손익</Text>
                      <Text style={[styles.posStatVal, { color: up ? "#F04452" : "#1B63E8" }]}>
                        {up ? "+" : ""}₩{Math.round(pos.gainLoss).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={openAdd}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: isDark ? "#1C1C2E" : "#FFFFFF" }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: c.text }]}>
              {modalMode === "add" ? "포지션 추가" : "포지션 수정"}
            </Text>

            {modalMode === "add" && (
              <>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>종목 코드</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.separator }]}
                  placeholder="예: NVDA, 005930"
                  placeholderTextColor={c.textSecondary}
                  value={form.ticker}
                  onChangeText={(v) => setForm((f) => ({ ...f, ticker: v.toUpperCase() }))}
                  autoCapitalize="characters"
                />

                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>종목명 (선택)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.separator }]}
                  placeholder="예: 엔비디아"
                  placeholderTextColor={c.textSecondary}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                />

                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>시장</Text>
                <View style={styles.marketRow}>
                  {MARKET_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.marketBtn,
                        { borderColor: c.separator, backgroundColor: c.card },
                        form.market === m && { backgroundColor: "#0064FF", borderColor: "#0064FF" },
                      ]}
                      onPress={() => setForm((f) => ({ ...f, market: m }))}
                    >
                      <Text style={[styles.marketBtnTxt, form.market === m && { color: "#fff" }]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>수량 (주)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.separator }]}
              placeholder="예: 10"
              placeholderTextColor={c.textSecondary}
              value={form.shares}
              onChangeText={(v) => setForm((f) => ({ ...f, shares: v }))}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>평균 매수가 (₩)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.separator }]}
              placeholder="예: 180000"
              placeholderTextColor={c.textSecondary}
              value={form.avgPrice}
              onChangeText={(v) => setForm((f) => ({ ...f, avgPrice: v }))}
              keyboardType="decimal-pad"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnTxt}>
                {modalMode === "add" ? "추가하기" : "수정하기"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub:   { fontSize: 13, marginTop: 2 },

  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  summaryLabel:  { fontSize: 13 },
  summaryValue:  { fontSize: 28, fontFamily: "Inter_700Bold" },
  summaryRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryPL:     { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  pctBadge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pctText:       { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  costRow:       { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4 },
  costLabel:     { fontSize: 13 },
  costValue:     { fontSize: 13, fontFamily: "Inter_500Medium" },

  section:       { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  sectionTitle:  { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },

  posCard:       { borderRadius: 14, padding: 16, gap: 10 },
  posTop:        { flexDirection: "row", justifyContent: "space-between" },
  posLeft:       { flex: 1 },
  posRight:      { alignItems: "flex-end" },
  posName:       { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  posTicker:     { fontSize: 12, marginTop: 2 },
  posValue:      { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  posReturn:     { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  posDivider:    { height: StyleSheet.hairlineWidth },
  posBottom:     { flexDirection: "row", justifyContent: "space-between" },
  posStat:       { alignItems: "center", flex: 1 },
  posStatLabel:  { fontSize: 11 },
  posStatVal:    { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },

  empty:         { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle:    { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub:      { fontSize: 14, textAlign: "center" },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0064FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0064FF",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  modalOverlay:  { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  modalHandle:   { width: 40, height: 4, backgroundColor: "#94A3B8", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  modalTitle:    { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },

  inputLabel: { fontSize: 13, marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  marketRow: { flexDirection: "row", gap: 8 },
  marketBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  marketBtnTxt: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#64748B" },

  saveBtn: {
    backgroundColor: "#0064FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
