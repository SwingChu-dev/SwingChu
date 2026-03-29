import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Svg, { Polyline, Line } from "react-native-svg";
import Colors from "@/constants/colors";
import { API_BASE } from "@/utils/apiBase";

// ── 감시 종목 설정 ────────────────────────────────────────────────────────
const RADAR_TICKERS = [
  { ticker: "EONR",  market: "NASDAQ", name: "이온R",       group: "my",    desc: "에너지저장" },
  { ticker: "NVDA",  market: "NASDAQ", name: "엔비디아",     group: "semi",  desc: "AI반도체" },
  { ticker: "SOXX",  market: "NASDAQ", name: "반도체 ETF",   group: "semi",  desc: "반도체" },
  { ticker: "XLE",   market: "NYSE",   name: "에너지 ETF",   group: "energy",desc: "에너지" },
  { ticker: "URA",   market: "NYSE",   name: "원자력 ETF",   group: "energy",desc: "원자력" },
  { ticker: "XEL",   market: "NASDAQ", name: "엑셀에너지",   group: "energy",desc: "전력유틸리티" },
  { ticker: "BWXT",  market: "NYSE",   name: "BWX테크",     group: "energy",desc: "원자력기술" },
  { ticker: "GEV",   market: "NYSE",   name: "GE버노바",    group: "energy",desc: "에너지전환" },
];

const GROUP_COLOR: Record<string, string> = {
  my:     "#8B5CF6",
  semi:   "#0064FF",
  energy: "#FF6B00",
};

const REFRESH_SEC = 15;
const MAX_HISTORY = 20;

// ── 미니 스파크라인 ────────────────────────────────────────────────────────
const SPARK_W = 64, SPARK_H = 28;

function Sparkline({ history }: { history: number[] }) {
  if (history.length < 2) {
    return (
      <View style={{ width: SPARK_W, height: SPARK_H, justifyContent: "center" }}>
        <View style={{ height: 1, backgroundColor: "#94A3B8", opacity: 0.4 }} />
      </View>
    );
  }
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || (min * 0.001) || 1;
  const step = SPARK_W / (history.length - 1);
  const pts = history
    .map((v, i) => `${(i * step).toFixed(1)},${(SPARK_H - 2 - ((v - min) / range) * (SPARK_H - 4)).toFixed(1)}`)
    .join(" ");
  const isUp = history[history.length - 1] >= history[0];
  const color = isUp ? "#F04452" : "#1B63E8";
  return (
    <Svg width={SPARK_W} height={SPARK_H}>
      <Line x1="0" y1={SPARK_H / 2} x2={SPARK_W} y2={SPARK_H / 2}
        stroke="#94A3B8" strokeWidth="0.5" strokeDasharray="2,2" opacity={0.4} />
      <Polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 카운트다운 바 ──────────────────────────────────────────────────────────
function CountdownBar({ seconds, total, isDark }: { seconds: number; total: number; isDark: boolean }) {
  const pct = (seconds / total) * 100;
  const color = seconds <= 3 ? "#F04452" : "#0064FF";
  return (
    <View style={styles.cdWrap}>
      <View style={[styles.cdTrack, { backgroundColor: isDark ? "#1E293B" : "#E5E7EB" }]}>
        <View style={[styles.cdFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.cdTxt, { color }]}>{seconds}s</Text>
    </View>
  );
}

// ── 디커플링 분석 ──────────────────────────────────────────────────────────
function analyzeDivergence(
  latest: Record<string, number>,
  prev:   Record<string, number>
): { level: "warn" | "ok" | "neutral"; msg: string } {
  const chg = (t: string) => {
    const p = prev[t], n = latest[t];
    if (!p || !n) return 0;
    return (n - p) / p;
  };
  const xle  = chg("XLE");
  const soxx = chg("SOXX");
  const ura  = chg("URA");
  const nvda = chg("NVDA");
  const eonr = chg("EONR");

  if (xle > 0.003 && soxx < -0.003)
    return { level: "warn", msg: "⚠️ 에너지↑ 반도체↓ 디커플링 — 기술주 자금 이탈 신호" };
  if (ura > 0.003 && soxx < -0.003)
    return { level: "warn", msg: "⚠️ 원자력↑ 반도체↓ — AI 인프라 수혜주 선별 필요" };
  if (soxx > 0.003 && xle < -0.003)
    return { level: "ok", msg: "✅ 반도체 강세, 에너지 약세 — 기술주 모멘텀 유효" };
  if (eonr > 0.005 && xle < 0)
    return { level: "ok", msg: "✅ EONR 독립 강세 — 고유 재료 주도" };
  return { level: "neutral", msg: "— 섹터 간 흐름 정상 (동행 중)" };
}

// ── Trump 리스크 타입 ──────────────────────────────────────────────────────
interface TrumpHeadline { title: string; source: string; pubDate: string; }
interface TrumpRisk {
  score: number;
  maxScore: number;
  level: "calm" | "low" | "medium" | "high" | "extreme";
  label: string;
  headlines: TrumpHeadline[];
  fetchedAt: string;
  headlineCount: number;
}

const TRUMP_LEVEL_COLOR: Record<string, string> = {
  calm:    "#2DB55D",
  low:     "#22C55E",
  medium:  "#F59E0B",
  high:    "#F04452",
  extreme: "#7C3AED",
};
const TRUMP_LEVEL_KR: Record<string, string> = {
  calm:    "안전",
  low:     "주의",
  medium:  "경계",
  high:    "위험",
  extreme: "극위험",
};

// ── Trump 게이지 바 ───────────────────────────────────────────────────────
function TrumpGauge({ score, max, level }: { score: number; max: number; level: string }) {
  const pct = Math.round((score / max) * 100);
  const col = TRUMP_LEVEL_COLOR[level] ?? "#94A3B8";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <View style={[styles.gaugeTrack]}>
        <View style={[styles.gaugeFill, { width: `${pct}%` as any, backgroundColor: col }]} />
      </View>
      <View style={[styles.levelBadge, { backgroundColor: col + "20" }]}>
        <Text style={[styles.levelTxt, { color: col }]}>{TRUMP_LEVEL_KR[level]} {score.toFixed(0)}</Text>
      </View>
    </View>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────────────────
interface PriceData {
  price:         number;
  change:        number;
  changePercent: number;
  ok:            boolean;
}

export default function RealtimeRadarScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [prices,     setPrices]     = useState<Record<string, PriceData>>({});
  const [history,    setHistory]    = useState<Record<string, number[]>>({});
  const [countdown,  setCountdown]  = useState(REFRESH_SEC);
  const [loading,    setLoading]    = useState(false);
  const [lastTime,   setLastTime]   = useState<string>("");
  const [kisActive,  setKisActive]  = useState(false);
  const [trump,      setTrump]      = useState<TrumpRisk | null>(null);
  const [trumpLoad,  setTrumpLoad]  = useState(false);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const items = RADAR_TICKERS.map(t => `${t.ticker}:${t.market}`).join(",");
      const res   = await fetch(`${API_BASE}/stocks/quotes?items=${items}`);
      const json: any[] = await res.json();

      const next: Record<string, PriceData> = {};
      let usedKis = false;
      for (const q of json) {
        if (q.ok) {
          next[q.ticker] = { price: q.price, change: q.change, changePercent: q.changePercent, ok: true };
          if (q._source === "KIS") usedKis = true;
        }
      }
      setHistory(h => {
        const updated = { ...h };
        for (const [t, d] of Object.entries(next)) {
          if (!d.ok) continue;
          const arr = [...(updated[t] ?? []), d.price];
          updated[t] = arr.slice(-MAX_HISTORY);
        }
        return updated;
      });
      setPrices(prev => ({ ...prev, ...next }));
      setKisActive(usedKis);
      setLastTime(new Date().toLocaleTimeString("ko-KR"));
      setCountdown(REFRESH_SEC);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchTrumpRisk = useCallback(async () => {
    setTrumpLoad(true);
    try {
      const res = await fetch(`${API_BASE}/stocks/trump-risk`);
      const json: TrumpRisk = await res.json();
      setTrump(json);
    } catch {}
    finally { setTrumpLoad(false); }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchTrumpRisk();

    // 15초 자동 갱신
    fetchRef.current = setInterval(fetchPrices, REFRESH_SEC * 1000);
    // 5분마다 Trump 리스크 갱신
    const trumpTimer = setInterval(fetchTrumpRisk, 5 * 60 * 1000);
    // 1초 카운트다운
    timerRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);

    return () => {
      clearInterval(fetchRef.current!);
      clearInterval(timerRef.current!);
      clearInterval(trumpTimer);
    };
  }, [fetchPrices, fetchTrumpRisk]);

  // 첫 번째 / 이전 가격 (히스토리 첫값과 현재값으로 디커플링 분석)
  const firstPrices: Record<string, number> = {};
  for (const [t, arr] of Object.entries(history)) firstPrices[t] = arr[0] ?? 0;
  const latestPrices: Record<string, number> = {};
  for (const [t, d] of Object.entries(prices)) latestPrices[t] = d.price;

  const divergence = Object.keys(prices).length >= 3
    ? analyzeDivergence(latestPrices, firstPrices)
    : null;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {/* ── 헤더 ── */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: c.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.tint} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.text }]}>실시간 레이더</Text>
          <View style={[styles.sourceBadge, { backgroundColor: kisActive ? "#2DB55D20" : "#0064FF15" }]}>
            <View style={[styles.sourceDot, { backgroundColor: kisActive ? "#2DB55D" : "#94A3B8" }]} />
            <Text style={[styles.sourceTxt, { color: kisActive ? "#2DB55D" : "#94A3B8" }]}>
              {kisActive ? "KIS 실시간" : "Yahoo 15분"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={fetchPrices} style={styles.refreshBtn}>
          {loading
            ? <ActivityIndicator size="small" color={c.tint} />
            : <Ionicons name="refresh-outline" size={20} color={c.tint} />}
        </TouchableOpacity>
      </View>

      {/* ── 카운트다운 ── */}
      <View style={[styles.cdRow, { paddingHorizontal: 16 }]}>
        <Text style={[styles.cdLabel, { color: c.textTertiary }]}>
          {lastTime ? `갱신: ${lastTime}` : "첫 데이터 수집 중..."}
        </Text>
        <CountdownBar seconds={countdown} total={REFRESH_SEC} isDark={isDark} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 종목 섹션별 ── */}
        {["my", "semi", "energy"].map(group => {
          const groupTickers = RADAR_TICKERS.filter(t => t.group === group);
          const groupLabel: Record<string, string> = {
            my:     "내 종목",
            semi:   "AI/반도체",
            energy: "에너지/원자력",
          };
          return (
            <View key={group} style={[styles.card, { backgroundColor: c.card }]}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: GROUP_COLOR[group] }]} />
                <Text style={[styles.groupLabel, { color: c.textSecondary }]}>{groupLabel[group]}</Text>
              </View>

              {groupTickers.map((info, idx) => {
                const d = prices[info.ticker];
                const hist = history[info.ticker] ?? [];
                const isUp = (d?.changePercent ?? 0) >= 0;
                const color = isUp ? "#F04452" : "#1B63E8";
                const noData = !d?.ok;

                return (
                  <View
                    key={info.ticker}
                    style={[
                      styles.tickerRow,
                      idx < groupTickers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
                    ]}
                  >
                    {/* 이름 */}
                    <View style={styles.tickerLeft}>
                      <Text style={[styles.tickerSymbol, { color: c.text }]}>{info.ticker}</Text>
                      <Text style={[styles.tickerName, { color: c.textTertiary }]}>{info.desc}</Text>
                    </View>

                    {/* 스파크라인 */}
                    <View style={styles.sparkWrap}>
                      <Sparkline history={hist} />
                    </View>

                    {/* 가격/변동 */}
                    <View style={styles.tickerRight}>
                      {noData ? (
                        <Text style={[styles.noData, { color: c.textTertiary }]}>—</Text>
                      ) : (
                        <>
                          <Text style={[styles.tickerPrice, { color: c.text }]}>
                            ${d.price.toFixed(d.price >= 100 ? 2 : 3)}
                          </Text>
                          <View style={[styles.changeBadge, { backgroundColor: color + "18" }]}>
                            <Text style={[styles.changeTxt, { color }]}>
                              {isUp ? "▲" : "▼"} {Math.abs(d.changePercent).toFixed(2)}%
                            </Text>
                          </View>
                          <Text style={[styles.changeAbs, { color }]}>
                            {d.change >= 0 ? "+" : ""}{d.change.toFixed(d.price >= 100 ? 2 : 3)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* ── 디커플링 분석 ── */}
        {divergence && (
          <View style={[
            styles.card,
            styles.divergenceCard,
            { backgroundColor: divergence.level === "warn" ? "#F0445210" : divergence.level === "ok" ? "#2DB55D10" : (isDark ? "#1E293B" : "#F8FAFC") }
          ]}>
            <View style={styles.groupHeader}>
              <Ionicons
                name="analytics-outline"
                size={14}
                color={divergence.level === "warn" ? "#F04452" : divergence.level === "ok" ? "#2DB55D" : c.textSecondary}
              />
              <Text style={[styles.groupLabel, {
                color: divergence.level === "warn" ? "#F04452" : divergence.level === "ok" ? "#2DB55D" : c.textSecondary
              }]}>섹터 디커플링 분석</Text>
            </View>
            <Text style={[styles.divergenceTxt, {
              color: divergence.level === "warn" ? "#F04452" : divergence.level === "ok" ? "#2DB55D" : c.textSecondary
            }]}>
              {divergence.msg}
            </Text>
            <Text style={[styles.divergenceNote, { color: c.textTertiary }]}>
              기준: 세션 시작 이후 누적 변동 비교
            </Text>
          </View>
        )}

        {/* ── 트럼프 타코수치 ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={[styles.groupHeader, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 16 }}>🦅</Text>
            <Text style={[styles.groupLabel, { color: c.textSecondary }]}>트럼프 타코수치 (관세·무역 리스크)</Text>
            <TouchableOpacity onPress={fetchTrumpRisk} style={{ marginLeft: "auto" }}>
              {trumpLoad
                ? <ActivityIndicator size="small" color={c.tint} />
                : <Ionicons name="refresh-outline" size={14} color={c.textTertiary} />}
            </TouchableOpacity>
          </View>

          {trump ? (
            <>
              <TrumpGauge score={trump.score} max={trump.maxScore} level={trump.level} />
              <Text style={[styles.trumpLabel, { color: TRUMP_LEVEL_COLOR[trump.level] ?? c.textSecondary }]}>
                {trump.label}
              </Text>
              <Text style={[styles.trumpSub, { color: c.textTertiary }]}>
                최근 뉴스 {trump.headlineCount}건 분석 · 5분 갱신
              </Text>

              {trump.headlines.length > 0 && (
                <View style={[styles.headlineWrap, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" }]}>
                  {trump.headlines.slice(0, 4).map((h, i) => (
                    <View key={i} style={[styles.headlineRow, i < Math.min(trump.headlines.length, 4) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? "#1E293B" : "#E2E8F0" }]}>
                      <Text style={[styles.headlineTxt, { color: c.text }]} numberOfLines={2}>{h.title}</Text>
                      {h.source ? <Text style={[styles.headlineSrc, { color: c.textTertiary }]}>{h.source}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : trumpLoad ? (
            <View style={{ height: 60, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator color={c.tint} />
            </View>
          ) : (
            <Text style={[styles.trumpSub, { color: c.textTertiary }]}>뉴스 데이터 로드 실패. 새로고침 해주세요.</Text>
          )}

          <Text style={[styles.trumpNote, { color: c.textTertiary }]}>
            * Google News RSS 기반 · SNS(X/Twitter) 연동은 유료 API 필요
          </Text>
        </View>

        {/* ── 안내 ── */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.groupLabel, { color: c.textSecondary, marginBottom: 8 }]}>모니터링 기준</Text>
          {[
            "에너지(XLE/URA)↑ + 반도체(SOXX)↓ → 기술주 자금 이탈 경보",
            "반도체(SOXX)↑ + 에너지(XLE)↓ → 기술주 모멘텀 유효",
            "EONR 독립 강세 → 고유 재료 주도 (섹터 무관)",
          ].map((txt, i) => (
            <View key={i} style={styles.guideRow}>
              <Text style={[styles.guideDot, { color: c.tint }]}>•</Text>
              <Text style={[styles.guideTxt, { color: c.textTertiary }]}>{txt}</Text>
            </View>
          ))}
          {!kisActive && (
            <View style={[styles.kisHint, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
              <Ionicons name="information-circle-outline" size={14} color="#0064FF" />
              <Text style={[styles.kisHintTxt, { color: "#0064FF" }]}>
                Secrets에 APP_KEY/APP_SECRET 설정 시 실시간 데이터로 전환됩니다
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn:    { width: 40, height: 40, justifyContent: "center" },
  refreshBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-end" },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle:{ fontSize: 18, fontFamily: "Inter_700Bold" },
  sourceBadge:{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  sourceDot:  { width: 6, height: 6, borderRadius: 3 },
  sourceTxt:  { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  cdRow:  { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  cdLabel:{ fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  cdWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  cdTrack:{ width: 80, height: 4, borderRadius: 2, overflow: "hidden" },
  cdFill: { height: "100%", borderRadius: 2 },
  cdTxt:  { fontSize: 11, fontFamily: "Inter_700Bold", width: 20, textAlign: "right" },

  card:    { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14 },
  divergenceCard: { gap: 6 },

  groupHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  groupDot:    { width: 8, height: 8, borderRadius: 4 },
  groupLabel:  { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },

  tickerRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 8 },
  tickerLeft: { width: 64 },
  tickerSymbol:{ fontSize: 14, fontFamily: "Inter_700Bold" },
  tickerName: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },

  sparkWrap:  { flex: 1, alignItems: "center" },

  tickerRight:{ width: 90, alignItems: "flex-end", gap: 2 },
  tickerPrice:{ fontSize: 15, fontFamily: "Inter_700Bold" },
  changeBadge:{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  changeTxt:  { fontSize: 11, fontFamily: "Inter_700Bold" },
  changeAbs:  { fontSize: 10, fontFamily: "Inter_400Regular" },
  noData:     { fontSize: 14, fontFamily: "Inter_400Regular" },

  divergenceTxt:  { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  divergenceNote: { fontSize: 11, fontFamily: "Inter_400Regular" },

  guideRow:   { flexDirection: "row", gap: 6, marginBottom: 4 },
  guideDot:   { fontSize: 14, lineHeight: 18 },
  guideTxt:   { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  kisHint: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    borderRadius: 10, padding: 10, marginTop: 8,
  },
  kisHintTxt: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  gaugeTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#E2E8F0", overflow: "hidden" },
  gaugeFill:  { height: "100%", borderRadius: 4 },
  levelBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  levelTxt:   { fontSize: 12, fontFamily: "Inter_700Bold" },

  trumpLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  trumpSub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8 },
  trumpNote:  { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 10, opacity: 0.6 },

  headlineWrap:{ borderRadius: 10, padding: 10, marginTop: 8, gap: 0 },
  headlineRow: { paddingVertical: 8 },
  headlineTxt: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  headlineSrc: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2, opacity: 0.6 },
});
