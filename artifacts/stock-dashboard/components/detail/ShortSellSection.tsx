import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { API_BASE } from "@/utils/apiBase";

interface ShortData {
  shortRatio:            number | null;
  shortPercentOfFloat:   number | null;
  sharesShort:           number | null;
  sharesShortPriorMonth: number | null;
}

interface Props {
  ticker: string;
  market: string;
}

// 공매도 위험 지수 (0–100)
function calcShortScore(d: ShortData): number {
  let score = 0;
  const pof = d.shortPercentOfFloat ?? 0;
  const sr  = d.shortRatio          ?? 0;
  // shortPercentOfFloat 가중 (최대 70점)
  score += Math.min(70, pof * 100 * 2.33);
  // shortRatio 가중 (최대 20점)
  score += Math.min(20, sr * 2);
  // 공매도 증가 추세 (최대 10점)
  if (d.sharesShort != null && d.sharesShortPriorMonth != null && d.sharesShortPriorMonth > 0) {
    const growthPct = ((d.sharesShort - d.sharesShortPriorMonth) / d.sharesShortPriorMonth) * 100;
    if (growthPct > 20) score += 10;
    else if (growthPct > 10) score += 5;
    else if (growthPct < -10) score -= 5;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskLevel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "위험",   color: "#F04452" };
  if (score >= 50) return { label: "경계",   color: "#FF6B00" };
  if (score >= 30) return { label: "주의",   color: "#F59E0B" };
  if (score >= 10) return { label: "보통",   color: "#2DB55D" };
  return              { label: "안전",   color: "#0064FF" };
}

function fmtShares(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function Gauge({ score }: { score: number }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const { color } = riskLevel(score);
  const pct = score / 100;
  return (
    <View style={styles.gaugeWrap}>
      <View style={[styles.gaugeTrack, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        <View style={[styles.gaugeFill, { width: `${score}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.gaugeScore, { color }]}>{score}</Text>
    </View>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.statRow, { borderBottomColor: c.separator }]}>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
      <View style={styles.statRight}>
        <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
        {sub ? <Text style={[styles.statSub, { color: c.textTertiary }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export default function ShortSellSection({ ticker, market }: Props) {
  const isDark  = useColorScheme() === "dark";
  const c       = isDark ? Colors.dark : Colors.light;
  const isKorean = market === "KOSPI" || market === "KOSDAQ";

  const [data, setData]       = useState<ShortData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (isKorean) return;
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/stocks/detail?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}`)
      .then((r) => r.json())
      .then((d) => {
        setData({
          shortRatio:            d.shortRatio            ?? null,
          shortPercentOfFloat:   d.shortPercentOfFloat   ?? null,
          sharesShort:           d.sharesShort           ?? null,
          sharesShortPriorMonth: d.sharesShortPriorMonth ?? null,
        });
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [ticker, market]);

  if (isKorean) {
    return (
      <View style={[styles.noDataCard, { backgroundColor: c.card }]}>
        <Ionicons name="information-circle-outline" size={32} color={c.textTertiary} />
        <Text style={[styles.noDataTitle, { color: c.text }]}>국내주식 공매도 데이터 미제공</Text>
        <Text style={[styles.noDataDesc, { color: c.textSecondary }]}>
          한국거래소(KRX) 공매도 잔고 데이터는 현재 통합되지 않았습니다.{"\n"}
          KRX 공매도 통계 홈페이지에서 직접 확인하세요.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.tint} />
        <Text style={[styles.loadingText, { color: c.textSecondary }]}>공매도 데이터 로딩 중...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.noDataCard, { backgroundColor: c.card }]}>
        <Ionicons name="warning-outline" size={32} color="#F59E0B" />
        <Text style={[styles.noDataTitle, { color: c.text }]}>데이터를 가져올 수 없습니다</Text>
      </View>
    );
  }

  const noData = data.shortPercentOfFloat == null && data.shortRatio == null;
  if (noData) {
    return (
      <View style={[styles.noDataCard, { backgroundColor: c.card }]}>
        <Ionicons name="information-circle-outline" size={32} color={c.textTertiary} />
        <Text style={[styles.noDataTitle, { color: c.text }]}>공매도 데이터 없음</Text>
        <Text style={[styles.noDataDesc, { color: c.textSecondary }]}>
          이 종목의 공매도 정보를 제공하지 않습니다.{"\n"}
          소형주·신규 상장주는 데이터가 없을 수 있습니다.
        </Text>
      </View>
    );
  }

  const score    = calcShortScore(data);
  const risk     = riskLevel(score);
  const pofLabel = fmtPct(data.shortPercentOfFloat);
  const srLabel  = data.shortRatio != null ? `${data.shortRatio.toFixed(1)}일` : "—";
  const ssLabel  = fmtShares(data.sharesShort);
  const prevLabel= fmtShares(data.sharesShortPriorMonth);

  let trendLabel = "데이터 없음";
  let trendColor = c.textSecondary;
  if (data.sharesShort != null && data.sharesShortPriorMonth != null && data.sharesShortPriorMonth > 0) {
    const g = ((data.sharesShort - data.sharesShortPriorMonth) / data.sharesShortPriorMonth) * 100;
    if (g > 0) {
      trendLabel = `전월 대비 +${g.toFixed(1)}% 증가 ↑`;
      trendColor = "#F04452";
    } else {
      trendLabel = `전월 대비 ${g.toFixed(1)}% 감소 ↓`;
      trendColor = "#2DB55D";
    }
  }

  return (
    <View style={styles.container}>
      {/* 위험 지수 카드 */}
      <View style={[styles.scoreCard, { backgroundColor: c.card }]}>
        <View style={styles.scoreHeader}>
          <Text style={[styles.scoreTitle, { color: c.text }]}>공매도 위험 지수</Text>
          <View style={[styles.riskBadge, { backgroundColor: risk.color + "22" }]}>
            <Text style={[styles.riskLabel, { color: risk.color }]}>{risk.label}</Text>
          </View>
        </View>
        <Gauge score={score} />
        <View style={styles.scaleRow}>
          {(["안전", "보통", "주의", "경계", "위험"] as const).map((l, i) => (
            <Text key={l} style={[styles.scaleItem, {
              color: i * 25 <= score && score < (i + 1) * 25
                ? riskLevel(i * 20).color
                : c.textTertiary,
              fontFamily: i * 20 <= score && score <= i * 25 + 25
                ? "Inter_600SemiBold" : "Inter_400Regular",
            }]}>{l}</Text>
          ))}
        </View>
      </View>

      {/* 상세 수치 */}
      <View style={[styles.detailCard, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>상세 수치</Text>
        <StatRow label="공매도 비율 (Float)"  value={pofLabel}  sub="유동주식 대비 공매도 잔고 비율" />
        <StatRow label="Short Ratio"          value={srLabel}   sub="현재 공매도 청산 소요 거래일" />
        <StatRow label="공매도 잔고"           value={ssLabel}   sub="현재 공매도 잔량 (주)" />
        <StatRow label="전월 공매도 잔고"      value={prevLabel} sub="" />
        <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>추세</Text>
          <Text style={[styles.statValue, { color: trendColor }]}>{trendLabel}</Text>
        </View>
      </View>

      {/* 해석 가이드 */}
      <View style={[styles.guideCard, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>해석 가이드</Text>
        {[
          { range: "Float > 30%",   icon: "🔴", msg: "세력 공매도 압박 강함. 추세 반전 신호 확인 전 진입 자제." },
          { range: "Float 15–30%",  icon: "🟠", msg: "공매도 경계. 숏 스퀴즈 가능성도 공존." },
          { range: "Float 5–15%",   icon: "🟡", msg: "보통 수준. 실적·뉴스 촉매에 따라 방향 결정." },
          { range: "Float < 5%",    icon: "🟢", msg: "공매도 압박 낮음. 상승 모멘텀 우호적 환경." },
          { range: "Ratio > 10일",  icon: "⚡", msg: "숏 스퀴즈 폭발 잠재력. 호재 시 급등 주의/기회." },
        ].map((g) => (
          <View key={g.range} style={styles.guideRow}>
            <Text style={styles.guideEmoji}>{g.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.guideRange, { color: c.text }]}>{g.range}</Text>
              <Text style={[styles.guideMsg, { color: c.textSecondary }]}>{g.msg}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { paddingBottom: 20 },
  center:       { alignItems: "center", paddingVertical: 60, gap: 12 },
  loadingText:  { fontSize: 13 },

  noDataCard: {
    margin: 16, borderRadius: 16, padding: 32,
    alignItems: "center", gap: 12,
  },
  noDataTitle:  { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  noDataDesc:   { fontSize: 13, textAlign: "center", lineHeight: 20 },

  scoreCard: {
    margin: 16, borderRadius: 16, padding: 20, gap: 12,
  },
  scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreTitle:  { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  riskBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  riskLabel:   { fontSize: 13, fontFamily: "Inter_700Bold" },

  gaugeWrap:  { flexDirection: "row", alignItems: "center", gap: 10 },
  gaugeTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  gaugeFill:  { height: 8, borderRadius: 4 },
  gaugeScore: { fontSize: 22, fontFamily: "Inter_700Bold", minWidth: 36, textAlign: "right" },

  scaleRow:   { flexDirection: "row", justifyContent: "space-between" },
  scaleItem:  { fontSize: 10 },

  detailCard: { marginHorizontal: 16, borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5, textTransform: "uppercase",
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
  },
  statRow:  {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { fontSize: 14, flex: 1 },
  statRight: { alignItems: "flex-end", gap: 2, maxWidth: "55%" },
  statValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  statSub:   { fontSize: 11, textAlign: "right" },

  guideCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, gap: 12 },
  guideRow:  { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  guideEmoji:{ fontSize: 16, marginTop: 1 },
  guideRange:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },
  guideMsg:  { fontSize: 12, lineHeight: 18, marginTop: 2 },
});
