import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { API_BASE } from "@/utils/apiBase";

interface BalanceItem {
  ticker:       string;
  name:         string;
  qty:          number;
  avgPrice:     number;
  currentPrice: number;
  evalAmt:      number;
  purchaseAmt:  number;
  plAmt:        number;
  plRate:       number;
}

interface BalanceSummary {
  holdings:      BalanceItem[];
  totalEvalAmt:  number;
  totalPurchAmt: number;
  totalPlAmt:    number;
  totalPlRate:   number;
}

function fmtKRW(n: number): string {
  if (Math.abs(n) >= 1_0000_0000)
    return (n / 1_0000_0000).toFixed(1) + "억";
  if (Math.abs(n) >= 1_0000)
    return Math.round(n / 1_0000) + "만";
  return n.toLocaleString("ko-KR");
}

function PlBadge({ rate, isDark }: { rate: number; isDark: boolean }) {
  const isPos = rate >= 0;
  const color  = isPos ? "#F04452" : "#1B63E8";
  const bg     = isPos ? "#F0445215" : "#1B63E815";
  return (
    <View style={[styles.plBadge, { backgroundColor: bg }]}>
      <Text style={[styles.plBadgeTxt, { color }]}>
        {isPos ? "+" : ""}{rate.toFixed(2)}%
      </Text>
    </View>
  );
}

export default function PortfolioScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [data,      setData]      = useState<BalanceSummary | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/kis/balance`);
      const json = await res.json();
      if (!json.available) { setAvailable(false); return; }
      if (json.error)      { setError(json.error); return; }
      setData(json.data);
    } catch (e: any) {
      setError(e.message ?? "잔고 조회 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isProfit = (data?.totalPlRate ?? 0) >= 0;
  const plColor  = isProfit ? "#F04452" : "#1B63E8";

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text }]}>국장 포트폴리오</Text>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={c.tint} />
        </TouchableOpacity>
      </View>

      {/* ── 키 미설정 안내 ── */}
      {!available && (
        <View style={styles.centerBox}>
          <Ionicons name="key-outline" size={48} color={c.textSecondary} />
          <Text style={[styles.noticeTitle, { color: c.text }]}>계좌 연동 필요</Text>
          <Text style={[styles.noticeTxt, { color: c.textSecondary }]}>
            Replit Secrets에 아래 값을 추가하세요:
          </Text>
          {["APP_KEY — 한투 앱키", "APP_SECRET — 앱 시크릿키", "CANO — 계좌번호 앞 8자리"].map(t => (
            <View key={t} style={[styles.keyRow, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
              <Ionicons name="terminal-outline" size={14} color={c.tint} />
              <Text style={[styles.keyTxt, { color: c.text }]}>{t}</Text>
            </View>
          ))}
          <Text style={[styles.noticeNote, { color: c.textTertiary }]}>
            ACNT_PRDT_CD는 기본값 '01' 적용
          </Text>
        </View>
      )}

      {/* ── 로딩 ── */}
      {loading && available && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.tint} />
          <Text style={[styles.loadingTxt, { color: c.textSecondary }]}>잔고 조회 중...</Text>
        </View>
      )}

      {/* ── 에러 ── */}
      {error && !loading && (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#F04452" />
          <Text style={[styles.errTxt, { color: c.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: c.tint }]} onPress={() => load()}>
            <Text style={styles.retryBtnTxt}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 잔고 데이터 ── */}
      {data && !loading && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.tint} />}
        >
          {/* ── 총 요약 카드 ── */}
          <View style={[styles.summaryCard, { backgroundColor: c.card }]}>
            <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>총 평가금액</Text>
            <Text style={[styles.summaryAmt, { color: c.text }]}>
              {fmtKRW(data.totalEvalAmt)}원
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: c.textTertiary }]}>매입금액</Text>
                <Text style={[styles.summaryItemVal, { color: c.textSecondary }]}>
                  {fmtKRW(data.totalPurchAmt)}원
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: c.textTertiary }]}>평가손익</Text>
                <Text style={[styles.summaryItemVal, { color: plColor }]}>
                  {data.totalPlAmt >= 0 ? "+" : ""}{fmtKRW(data.totalPlAmt)}원
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryItemLabel, { color: c.textTertiary }]}>수익률</Text>
                <Text style={[styles.summaryRate, { color: plColor }]}>
                  {data.totalPlRate >= 0 ? "+" : ""}{data.totalPlRate.toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* 수익률 게이지 */}
            <View style={styles.gaugeTrack}>
              <View style={[
                styles.gaugeFill,
                {
                  width:           `${Math.min(Math.abs(data.totalPlRate) * 4, 100)}%` as any,
                  backgroundColor: plColor,
                  alignSelf:       isProfit ? "flex-start" : "flex-end",
                }
              ]} />
            </View>
            <View style={styles.gaugeLabels}>
              <Text style={[styles.gaugeLabelTxt, { color: c.textTertiary }]}>-25%</Text>
              <Text style={[styles.gaugeLabelTxt, { color: c.textTertiary }]}>0</Text>
              <Text style={[styles.gaugeLabelTxt, { color: c.textTertiary }]}>+25%</Text>
            </View>
          </View>

          {/* ── 보유 종목 목록 ── */}
          {data.holdings.length === 0 ? (
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.emptyTxt, { color: c.textSecondary }]}>
                보유 중인 국내 주식이 없습니다.
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.cardTitle, { color: c.textSecondary }]}>
                보유 종목 ({data.holdings.length}개)
              </Text>

              {data.holdings
                .sort((a, b) => Math.abs(b.evalAmt) - Math.abs(a.evalAmt))
                .map((item, idx) => {
                  const isPos = item.plRate >= 0;
                  const color = isPos ? "#F04452" : "#1B63E8";

                  // 비중 (전체 평가금액 대비)
                  const weight = data.totalEvalAmt > 0
                    ? Math.round((item.evalAmt / data.totalEvalAmt) * 1000) / 10
                    : 0;

                  return (
                    <View
                      key={item.ticker}
                      style={[
                        styles.holdingRow,
                        idx < data.holdings.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
                        { borderLeftWidth: 3, borderLeftColor: color },
                      ]}
                    >
                      {/* 왼쪽 */}
                      <View style={styles.holdingLeft}>
                        <View style={styles.holdingNameRow}>
                          <Text style={[styles.holdingName, { color: c.text }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <PlBadge rate={item.plRate} isDark={isDark} />
                        </View>
                        <Text style={[styles.holdingDetail, { color: c.textTertiary }]}>
                          {item.qty.toLocaleString()}주 · 평균 {Math.round(item.avgPrice).toLocaleString()}원
                        </Text>

                        {/* 비중 바 */}
                        <View style={styles.weightRow}>
                          <View style={styles.weightTrack}>
                            <View style={[styles.weightFill, { width: `${Math.min(weight * 2, 100)}%` as any, backgroundColor: color }]} />
                          </View>
                          <Text style={[styles.weightTxt, { color: c.textTertiary }]}>{weight.toFixed(1)}%</Text>
                        </View>
                      </View>

                      {/* 오른쪽 */}
                      <View style={styles.holdingRight}>
                        <Text style={[styles.holdingPrice, { color: c.text }]}>
                          {item.currentPrice.toLocaleString()}원
                        </Text>
                        <Text style={[styles.holdingEval, { color: c.textSecondary }]}>
                          {fmtKRW(item.evalAmt)}원
                        </Text>
                        <Text style={[styles.holdingPL, { color }]}>
                          {item.plAmt >= 0 ? "+" : ""}{fmtKRW(item.plAmt)}원
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}

          {/* ── 업데이트 시간 ── */}
          <Text style={[styles.updatedAt, { color: c.textTertiary }]}>
            실시간 잔고 · 당겨서 새로고침
          </Text>
          <View style={{ height: 100 }} />
        </ScrollView>
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

  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  noticeTitle:{ fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  noticeTxt:  { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  keyRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, width: "100%",
  },
  keyTxt:     { fontSize: 13, fontFamily: "Inter_500Medium" },
  noticeNote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  loadingTxt: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errTxt:     { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn:   { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  retryBtnTxt:{ color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },

  // 요약 카드
  summaryCard:  { margin: 16, borderRadius: 20, padding: 20, gap: 16 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryAmt:   { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  summaryRow:   { flexDirection: "row", alignItems: "center" },
  summaryItem:  { flex: 1, alignItems: "center", gap: 4 },
  summaryDivider:{ width: StyleSheet.hairlineWidth, height: 36, backgroundColor: "#E5E7EB" },
  summaryItemLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  summaryItemVal:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  summaryRate:      { fontSize: 18, fontFamily: "Inter_700Bold" },
  gaugeTrack:  { height: 6, borderRadius: 3, backgroundColor: "#E5E7EB", overflow: "hidden" },
  gaugeFill:   { height: "100%", borderRadius: 3 },
  gaugeLabels: { flexDirection: "row", justifyContent: "space-between" },
  gaugeLabelTxt:{ fontSize: 10, fontFamily: "Inter_400Regular" },

  // 종목 카드
  card:       { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16 },
  cardTitle:  { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  emptyTxt:   { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 20 },

  holdingRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingVertical: 14, paddingLeft: 10, gap: 10,
  },
  holdingLeft:    { flex: 1, gap: 4 },
  holdingNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  holdingName:    { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  holdingDetail:  { fontSize: 11, fontFamily: "Inter_400Regular" },
  weightRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  weightTrack:    { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", overflow: "hidden" },
  weightFill:     { height: "100%", borderRadius: 2 },
  weightTxt:      { fontSize: 10, fontFamily: "Inter_500Medium", width: 32, textAlign: "right" },

  holdingRight:   { alignItems: "flex-end", gap: 2, minWidth: 90 },
  holdingPrice:   { fontSize: 14, fontFamily: "Inter_700Bold" },
  holdingEval:    { fontSize: 12, fontFamily: "Inter_400Regular" },
  holdingPL:      { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  plBadge:    { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  plBadgeTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },

  updatedAt:  { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
});
