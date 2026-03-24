import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useWatchlist } from "@/context/WatchlistContext";
import { useStockPrice } from "@/context/StockPriceContext";
import { useTargetPrices } from "@/hooks/useTargetPrices";
import { API_BASE } from "@/utils/apiBase";

// ── 섹터 흐름 타입 ──────────────────────────────────────────────────────────
interface SectorFlow {
  sectors:   Record<string, { trend: number; pct: number }>;
  anomaly:   string | null;
  updatedAt: string;
}

const SECTOR_LABELS: Record<string, string> = {
  XLE:  "에너지",
  SOXX: "반도체",
  URA:  "원자력",
  CPER: "구리",
};

// ── 신호 설정 ────────────────────────────────────────────────────────────────
const SIGNAL_CONFIG = {
  buy:   { label: "매수 신호",  bg: "#F043521A", border: "#F04452", text: "#F04452", icon: "🔴" },
  sell:  { label: "매도 신호",  bg: "#2DB55D1A", border: "#2DB55D", text: "#2DB55D", icon: "🟢" },
  hold:  { label: "보유/관망",  bg: "#94A3B81A", border: "#94A3B8", text: "#94A3B8", icon: "⚪" },
  unset: { label: "목표가 미설정", bg: "transparent", border: "transparent", text: "#94A3B8", icon: "—" },
};

// ── 목표가 설정 모달 ─────────────────────────────────────────────────────────
function TargetModal({
  visible, ticker, name, currentPrice, initialBuy, initialSell,
  onSave, onClear, onClose, isDark,
}: {
  visible: boolean; ticker: string; name: string; currentPrice: number;
  initialBuy: number | null; initialSell: number | null;
  onSave: (buy: number | null, sell: number | null) => void;
  onClear: () => void; onClose: () => void; isDark: boolean;
}) {
  const c = isDark ? Colors.dark : Colors.light;
  const [buyStr,  setBuyStr]  = useState(initialBuy  != null ? String(initialBuy)  : "");
  const [sellStr, setSellStr] = useState(initialSell != null ? String(initialSell) : "");

  useEffect(() => {
    setBuyStr(initialBuy   != null ? String(initialBuy)  : "");
    setSellStr(initialSell != null ? String(initialSell) : "");
  }, [initialBuy, initialSell, visible]);

  const isKRW = currentPrice > 1000;
  const fmtHint = isKRW ? "예: 85000" : "예: 2.10";
  const decimals = isKRW ? 0 : 2;

  const handleSave = () => {
    const buy  = buyStr  !== "" ? parseFloat(buyStr)  : null;
    const sell = sellStr !== "" ? parseFloat(sellStr) : null;
    if (buy != null && isNaN(buy))   { Alert.alert("입력 오류", "매수 목표가를 확인하세요"); return; }
    if (sell != null && isNaN(sell)) { Alert.alert("입력 오류", "매도 목표가를 확인하세요"); return; }
    if (buy != null && sell != null && buy >= sell) {
      Alert.alert("입력 오류", "매수 목표가는 매도 목표가보다 낮아야 합니다");
      return;
    }
    onSave(buy, sell);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalBox, { backgroundColor: c.card }]}>
          {/* 헤더 */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: c.text }]}>{ticker}</Text>
              <Text style={[styles.modalSub, { color: c.textSecondary }]}>{name}</Text>
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={c.textSecondary} /></TouchableOpacity>
          </View>

          {/* 현재가 */}
          <View style={[styles.curPriceRow, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
            <Text style={[styles.curPriceLabel, { color: c.textSecondary }]}>현재가</Text>
            <Text style={[styles.curPriceVal, { color: c.text }]}>
              {isKRW
                ? currentPrice.toLocaleString("ko-KR") + "원"
                : "$" + currentPrice.toFixed(decimals)}
            </Text>
          </View>

          {/* 입력 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: "#F04452" }]}>🔴 매수 목표가 (지지선)</Text>
            <TextInput
              style={[styles.input, { borderColor: c.separator, color: c.text, backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}
              keyboardType="decimal-pad"
              placeholder={fmtHint}
              placeholderTextColor={c.textTertiary}
              value={buyStr}
              onChangeText={setBuyStr}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: "#2DB55D" }]}>🟢 매도 목표가 (저항선)</Text>
            <TextInput
              style={[styles.input, { borderColor: c.separator, color: c.text, backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}
              keyboardType="decimal-pad"
              placeholder={fmtHint}
              placeholderTextColor={c.textTertiary}
              value={sellStr}
              onChangeText={setSellStr}
            />
          </View>

          {/* 힌트 */}
          <Text style={[styles.modalHint, { color: c.textTertiary }]}>
            현재가가 매수가 이하 도달 시 🔴 매수 신호, 매도가 이상 도달 시 🟢 매도 신호가 표시됩니다.
          </Text>

          {/* 버튼 */}
          <View style={styles.modalBtns}>
            {(initialBuy != null || initialSell != null) && (
              <TouchableOpacity style={[styles.clearBtn, { borderColor: c.separator }]} onPress={onClear}>
                <Text style={[styles.clearBtnTxt, { color: c.textSecondary }]}>초기화</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: c.tint, flex: 1 }]} onPress={handleSave}>
              <Text style={styles.saveBtnTxt}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────────────────
export default function TradeSignalsScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { watchlistStocks }               = useWatchlist();
  const { getQuote }                      = useStockPrice();
  const { setTarget, clearTarget, getTarget, getSignal, loaded } = useTargetPrices();

  const [flow,        setFlow]        = useState<SectorFlow | null>(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [modal,       setModal]       = useState<{ ticker: string; name: string; price: number } | null>(null);

  const fetchFlow = useCallback(async () => {
    setFlowLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/sector/flow`);
      const json = await res.json();
      setFlow(json);
    } catch {}
    finally { setFlowLoading(false); }
  }, []);

  useEffect(() => { fetchFlow(); }, [fetchFlow]);

  // 신호 요약 카운트
  const signalCounts = watchlistStocks.reduce(
    (acc, s) => {
      const q    = getQuote(s.ticker, s.market);
      const price = q?.price ?? 0;
      if (price <= 0) return acc;
      const sig = getSignal(s.ticker, price);
      acc[sig] = (acc[sig] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>기계적 매매신호</Text>
        <TouchableOpacity onPress={fetchFlow} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={c.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 섹터 자금 흐름 ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.textSecondary }]}>섹터 자금 흐름 (5일)</Text>

          {flowLoading ? (
            <ActivityIndicator size="small" color={c.tint} style={{ marginVertical: 12 }} />
          ) : flow ? (
            <>
              {/* ETF 바 */}
              <View style={styles.flowGrid}>
                {Object.entries(SECTOR_LABELS).map(([ticker, label]) => {
                  const d      = flow.sectors?.[ticker];
                  const pct    = d?.pct    ?? 0;
                  const trend  = d?.trend  ?? 0;
                  const color  = trend > 0 ? "#F04452" : trend < 0 ? "#1B63E8" : "#94A3B8";
                  return (
                    <View key={ticker} style={styles.flowItem}>
                      <Text style={[styles.flowLabel, { color: c.textSecondary }]}>{label}</Text>
                      <Text style={[styles.flowTicker, { color: c.textTertiary }]}>{ticker}</Text>
                      <View style={styles.flowBarWrap}>
                        <View style={[styles.flowBar, { width: `${Math.min(Math.abs(pct) * 10, 100)}%` as any, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.flowPct, { color }]}>
                        {pct > 0 ? "+" : ""}{pct.toFixed(2)}%
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* 이상 감지 메시지 */}
              {flow.anomaly && (
                <View style={[styles.anomalyBox, { backgroundColor: flow.anomaly.startsWith("✅") ? "#2DB55D15" : "#F0445215" }]}>
                  <Text style={[styles.anomalyTxt, { color: flow.anomaly.startsWith("✅") ? "#2DB55D" : "#F04452" }]}>
                    {flow.anomaly}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity onPress={fetchFlow} style={styles.retryRow}>
              <Text style={[styles.retryTxt, { color: c.tint }]}>데이터 로드 재시도</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 신호 요약 ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.textSecondary }]}>신호 요약</Text>
          <View style={styles.summaryRow}>
            {(["buy","sell","hold","unset"] as const).map(sig => {
              const cfg = SIGNAL_CONFIG[sig];
              const cnt = signalCounts[sig] ?? 0;
              return (
                <View key={sig} style={[styles.summaryCell, { borderColor: cfg.border || c.separator }]}>
                  <Text style={styles.summaryIcon}>{cfg.icon}</Text>
                  <Text style={[styles.summaryCount, { color: cfg.text }]}>{cnt}</Text>
                  <Text style={[styles.summaryLabel, { color: c.textTertiary }]}>{cfg.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── 종목별 신호 목록 ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardTitle, { color: c.textSecondary }]}>종목별 신호</Text>
            <Text style={[styles.tapHint, { color: c.textTertiary }]}>탭하여 목표가 설정</Text>
          </View>

          {!loaded ? (
            <ActivityIndicator size="small" color={c.tint} style={{ marginVertical: 12 }} />
          ) : (
            watchlistStocks.map((stock, idx) => {
              const q         = getQuote(stock.ticker, stock.market);
              const price     = q?.price ?? 0;
              const priceFmt  = stock.region === "국내장"
                ? price.toLocaleString("ko-KR") + "원"
                : "$" + price.toFixed(price > 100 ? 2 : 3);
              const target    = getTarget(stock.ticker);
              const signal    = price > 0 ? getSignal(stock.ticker, price) : "unset";
              const cfg       = SIGNAL_CONFIG[signal];

              // 진행률 바 (목표가가 설정된 경우)
              let progress: number | null = null;
              if (target?.buyPrice != null && target.sellPrice != null && price > 0) {
                progress = (price - target.buyPrice) / (target.sellPrice - target.buyPrice);
                progress = Math.max(0, Math.min(1, progress));
              }

              return (
                <TouchableOpacity
                  key={stock.id}
                  style={[
                    styles.stockRow,
                    idx < watchlistStocks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
                    signal !== "unset" && { borderLeftWidth: 3, borderLeftColor: cfg.border },
                  ]}
                  onPress={() => setModal({ ticker: stock.ticker, name: stock.name, price })}
                  activeOpacity={0.7}
                >
                  {/* 왼쪽: 이름/티커 */}
                  <View style={styles.stockLeft}>
                    <Text style={[styles.stockName, { color: c.text }]} numberOfLines={1}>{stock.name}</Text>
                    <Text style={[styles.stockTicker, { color: c.textTertiary }]}>{stock.ticker}</Text>

                    {/* 목표가 범위 표시 */}
                    {target && (
                      <View style={styles.targetRow}>
                        {target.buyPrice  != null && (
                          <Text style={[styles.targetLbl, { color: "#F04452" }]}>
                            매수 {stock.region === "국내장" ? target.buyPrice.toLocaleString() + "원" : "$" + target.buyPrice}
                          </Text>
                        )}
                        {target.buyPrice != null && target.sellPrice != null && (
                          <Text style={[styles.targetSep, { color: c.textTertiary }]}> · </Text>
                        )}
                        {target.sellPrice != null && (
                          <Text style={[styles.targetLbl, { color: "#2DB55D" }]}>
                            매도 {stock.region === "국내장" ? target.sellPrice.toLocaleString() + "원" : "$" + target.sellPrice}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* 진행률 바 */}
                    {progress != null && (
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
                      </View>
                    )}
                  </View>

                  {/* 오른쪽: 가격 + 신호 */}
                  <View style={styles.stockRight}>
                    <Text style={[styles.stockPrice, { color: c.text }]}>{price > 0 ? priceFmt : "—"}</Text>
                    {signal !== "unset" && (
                      <View style={[styles.signalBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                        <Text style={[styles.signalBadgeTxt, { color: cfg.text }]}>{cfg.label}</Text>
                      </View>
                    )}
                    {signal === "unset" && (
                      <Text style={[styles.setHint, { color: c.textTertiary }]}>설정 →</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ── 사용 안내 ── */}
        <View style={[styles.card, { backgroundColor: c.card, marginBottom: 0 }]}>
          <Text style={[styles.cardTitle, { color: c.textSecondary }]}>사용 방법</Text>
          <View style={styles.guideList}>
            {[
              "종목을 탭하여 매수(지지선) · 매도(저항선) 목표가를 설정하세요.",
              "현재가가 매수 목표가 이하면 🔴 매수 신호, 매도 목표가 이상이면 🟢 매도 신호가 표시됩니다.",
              "진행률 바는 매수/매도 목표가 범위 내에서 현재 위치를 나타냅니다.",
              "섹터 자금 흐름에서 에너지 강세 + 반도체 약세가 감지되면 기술주 비중 조정을 검토하세요.",
            ].map((txt, i) => (
              <View key={i} style={styles.guideRow}>
                <Text style={[styles.guideNum, { color: c.tint }]}>{i + 1}</Text>
                <Text style={[styles.guideTxt, { color: c.textSecondary }]}>{txt}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── 목표가 설정 모달 ── */}
      {modal && (
        <TargetModal
          visible
          isDark={isDark}
          ticker={modal.ticker}
          name={modal.name}
          currentPrice={modal.price}
          initialBuy={getTarget(modal.ticker)?.buyPrice ?? null}
          initialSell={getTarget(modal.ticker)?.sellPrice ?? null}
          onSave={(buy, sell) => {
            setTarget(modal.ticker, buy, sell);
            setModal(null);
          }}
          onClear={() => {
            clearTarget(modal.ticker);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn:    { width: 40, height: 40, justifyContent: "center" },
  refreshBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" },
  headerTitle:{ fontSize: 18, fontFamily: "Inter_700Bold" },

  card:       { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16 },
  cardTitle:  { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  tapHint:    { fontSize: 11, fontFamily: "Inter_400Regular" },

  // 섹터 흐름
  flowGrid:   { gap: 10, marginBottom: 10 },
  flowItem:   { flexDirection: "row", alignItems: "center", gap: 8 },
  flowLabel:  { width: 44, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  flowTicker: { width: 36, fontSize: 10, fontFamily: "Inter_400Regular" },
  flowBarWrap:{ flex: 1, height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, overflow: "hidden" },
  flowBar:    { height: "100%", borderRadius: 3 },
  flowPct:    { width: 52, textAlign: "right", fontSize: 12, fontFamily: "Inter_700Bold" },
  anomalyBox: { borderRadius: 10, padding: 12, marginTop: 4 },
  anomalyTxt: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
  retryRow:   { alignItems: "center", paddingVertical: 12 },
  retryTxt:   { fontSize: 14, fontFamily: "Inter_500Medium" },

  // 요약
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCell:{
    flex: 1, alignItems: "center", padding: 10,
    borderRadius: 12, borderWidth: 1, gap: 2,
  },
  summaryIcon:  { fontSize: 16 },
  summaryCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 9,  fontFamily: "Inter_400Regular", textAlign: "center" },

  // 종목 목록
  stockRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 10, paddingLeft: 4,
  },
  stockLeft:   { flex: 1, gap: 2 },
  stockName:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stockTicker: { fontSize: 11, fontFamily: "Inter_400Regular" },
  targetRow:   { flexDirection: "row", alignItems: "center", marginTop: 2 },
  targetLbl:   { fontSize: 10, fontFamily: "Inter_500Medium" },
  targetSep:   { fontSize: 10 },
  progressTrack:{ height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", marginTop: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: "#0064FF" },

  stockRight:  { alignItems: "flex-end", gap: 4 },
  stockPrice:  { fontSize: 14, fontFamily: "Inter_700Bold" },
  signalBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  signalBadgeTxt:{ fontSize: 10, fontFamily: "Inter_600SemiBold" },
  setHint:     { fontSize: 11, fontFamily: "Inter_400Regular" },

  // 가이드
  guideList:   { gap: 10 },
  guideRow:    { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  guideNum:    { fontSize: 12, fontFamily: "Inter_700Bold", width: 16, marginTop: 1 },
  guideTxt:    { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  // 모달
  modalOverlay:{
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", padding: 20,
  },
  modalBox:    { width: "100%", borderRadius: 20, padding: 20, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalTitle:  { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSub:    { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  curPriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: 12 },
  curPriceLabel:{ fontSize: 12, fontFamily: "Inter_400Regular" },
  curPriceVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  inputGroup:  { gap: 6 },
  inputLabel:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  input:       {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontFamily: "Inter_400Regular",
  },
  modalHint:   { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  modalBtns:   { flexDirection: "row", gap: 10, marginTop: 4 },
  clearBtn:    { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, justifyContent: "center" },
  clearBtnTxt: { fontSize: 14, fontFamily: "Inter_500Medium" },
  saveBtn:     { borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  saveBtnTxt:  { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
