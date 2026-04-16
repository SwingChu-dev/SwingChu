import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { API_BASE } from "@/utils/apiBase";

interface OverheatData {
  rsi14:          number;
  ma20:           number | null;
  ma60:           number | null;
  currentPrice:   number;
  ma20Disparity:  number | null;
  ma60Disparity:  number | null;
  high52wKRW:     number;
  low52wKRW:      number;
  position52w:    number | null;
  trailingPer:    number | null;
  forwardPer:     number | null;
  analystUpside:  number | null;
  targetMeanKRW:  number | null;
  revenueGrowth:  number | null;
  epsGrowth:      number | null;
  overheatScore:  number;
  signals:        { type: "positive" | "negative" | "neutral"; text: string }[];
}

interface Props {
  ticker: string;
  market: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Verdict 텍스트
// ──────────────────────────────────────────────────────────────────────────────
function getVerdict(score: number): { title: string; sub: string; color: string; icon: string } {
  if (score >= 80) return {
    title: "극과열 — 신규 진입 자제",
    sub:   "추세가 강하지만 단기 급조정 가능성. 기존 보유는 분할 수익 실현 고려.",
    color: "#F04452",
    icon:  "flame",
  };
  if (score >= 60) return {
    title: "과열 — 추격 매수 주의",
    sub:   "단기 과매수 신호. 조정 시 분할 매수가 유리. 손절선 확인 필수.",
    color: "#FF6B00",
    icon:  "warning",
  };
  if (score >= 40) return {
    title: "주의 — 모멘텀 확인 필요",
    sub:   "상승 추세지만 과열 신호 혼재. 실적·뉴스 촉매 확인 후 대응.",
    color: "#F59E0B",
    icon:  "analytics",
  };
  if (score >= 20) return {
    title: "적정 — 건강한 상승 구간",
    sub:   "밸류에이션·기술적 지표 정상권. 추세 유지 시 추가 상승 여력 존재.",
    color: "#2DB55D",
    icon:  "trending-up",
  };
  return {
    title: "저평가 — 매수 기회 구간",
    sub:   "과매도 또는 저평가 신호. 강한 반등 잠재력. 손절 수준 설정 후 접근.",
    color: "#0064FF",
    icon:  "rocket",
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// 세그먼트 게이지 (0-100 구간별 색상)
// ──────────────────────────────────────────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const isDark = useColorScheme() === "dark";
  const SEGMENTS = [
    { label: "저평가",   color: "#0064FF" },
    { label: "적정",     color: "#2DB55D" },
    { label: "주의",     color: "#F59E0B" },
    { label: "과열",     color: "#FF6B00" },
    { label: "극과열",   color: "#F04452" },
  ];
  const activeIdx = Math.min(4, Math.floor(score / 20));
  return (
    <View style={sg.wrap}>
      <View style={sg.barRow}>
        {SEGMENTS.map((s, i) => (
          <View
            key={s.label}
            style={[
              sg.seg,
              {
                backgroundColor: i === activeIdx ? s.color : (isDark ? "#3A3A3C" : "#E5E5EA"),
                opacity: i === activeIdx ? 1 : 0.35,
              },
            ]}
          />
        ))}
      </View>
      <View style={sg.labelRow}>
        {SEGMENTS.map((s, i) => (
          <Text key={s.label} style={[sg.label, {
            color: i === activeIdx ? s.color : (isDark ? "#636366" : "#AEAEB2"),
            fontFamily: i === activeIdx ? "Inter_700Bold" : "Inter_400Regular",
          }]}>{s.label}</Text>
        ))}
      </View>
    </View>
  );
}
const sg = StyleSheet.create({
  wrap:     { gap: 6 },
  barRow:   { flexDirection: "row", gap: 4 },
  seg:      { flex: 1, height: 10, borderRadius: 5 },
  labelRow: { flexDirection: "row" },
  label:    { flex: 1, textAlign: "center", fontSize: 10 },
});

// ──────────────────────────────────────────────────────────────────────────────
// RSI 미니 게이지 (30~80 가시화)
// ──────────────────────────────────────────────────────────────────────────────
function RsiBar({ value }: { value: number }) {
  const isDark = useColorScheme() === "dark";
  const pct = Math.max(0, Math.min(100, ((value - 0) / 100) * 100));
  let color = "#2DB55D";
  if (value >= 80)       color = "#F04452";
  else if (value >= 70)  color = "#FF6B00";
  else if (value >= 60)  color = "#F59E0B";
  else if (value < 30)   color = "#0064FF";

  return (
    <View style={rb.row}>
      <Text style={[rb.label, { color: isDark ? "#636366" : "#AEAEB2" }]}>0</Text>
      <View style={[rb.track, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        {/* 과매도/과매수 구분선 */}
        <View style={[rb.zone, { left: "30%", backgroundColor: "#0064FF33" }]} />
        <View style={[rb.zone, { left: "70%", backgroundColor: "#F0445233" }]} />
        <View style={[rb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
        {/* 마커 */}
        <View style={[rb.marker, { left: "30%" }]} />
        <View style={[rb.marker, { left: "70%" }]} />
      </View>
      <Text style={[rb.label, { color: isDark ? "#636366" : "#AEAEB2" }]}>100</Text>
      <Text style={[rb.val, { color }]}>{value}</Text>
    </View>
  );
}
const rb = StyleSheet.create({
  row:    { flexDirection: "row", alignItems: "center", gap: 8 },
  label:  { fontSize: 10, minWidth: 18 },
  track:  { flex: 1, height: 8, borderRadius: 4, overflow: "hidden", position: "relative" },
  fill:   { position: "absolute", left: 0, top: 0, height: 8, borderRadius: 4 },
  zone:   { position: "absolute", top: 0, width: "30%", height: 8 },
  marker: { position: "absolute", top: -2, width: 1, height: 12, backgroundColor: "#FFFFFF66" },
  val:    { fontSize: 18, fontFamily: "Inter_700Bold", minWidth: 40, textAlign: "right" },
});

// ──────────────────────────────────────────────────────────────────────────────
// 이격도 바
// ──────────────────────────────────────────────────────────────────────────────
function DisparityBar({ label, value }: { label: string; value: number | null }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  if (value == null) return (
    <View style={db.row}>
      <Text style={[db.label, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[db.val, { color: c.textTertiary }]}>—</Text>
    </View>
  );
  // ±40% 를 최대치로 가시화
  const MAX = 40;
  const absPct = Math.min(Math.abs(value) / MAX, 1);
  let color = "#2DB55D";
  if (value >= 20)       color = "#F04452";
  else if (value >= 10)  color = "#FF6B00";
  else if (value >= 5)   color = "#F59E0B";
  else if (value < -5)   color = "#0064FF";

  return (
    <View style={db.wrap}>
      <View style={db.row}>
        <Text style={[db.label, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[db.val, { color }]}>{value >= 0 ? `+${value}%` : `${value}%`}</Text>
      </View>
      <View style={[db.track, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        <View style={[db.fill, { width: `${absPct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}
const db = StyleSheet.create({
  wrap:   { gap: 4 },
  row:    { flexDirection: "row", justifyContent: "space-between" },
  label:  { fontSize: 14 },
  val:    { fontSize: 14, fontFamily: "Inter_700Bold" },
  track:  { height: 6, borderRadius: 3, overflow: "hidden" },
  fill:   { height: 6, borderRadius: 3 },
});

// ──────────────────────────────────────────────────────────────────────────────
// 52주 위치 바 (슬라이더 스타일)
// ──────────────────────────────────────────────────────────────────────────────
function Position52wBar({ pct, highKRW, lowKRW }: { pct: number; highKRW: number; lowKRW: number }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const color = pct >= 90 ? "#F04452" : pct >= 70 ? "#FF6B00" : pct <= 25 ? "#0064FF" : "#2DB55D";
  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(0)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : String(n);
  return (
    <View style={pw.wrap}>
      <View style={[pw.track, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        <View style={[pw.fill, { width: `${pct}%` as any }]} />
        <View style={[pw.dot, { left: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <View style={pw.rangeRow}>
        <Text style={[pw.rangeText, { color: c.textTertiary }]}>52주 저점 {fmt(lowKRW)}₩</Text>
        <Text style={[pw.center, { color }]}>{pct.toFixed(0)}%</Text>
        <Text style={[pw.rangeText, { color: c.textTertiary }]}>고점 {fmt(highKRW)}₩</Text>
      </View>
    </View>
  );
}
const pw = StyleSheet.create({
  wrap:     { gap: 8 },
  track:    { height: 8, borderRadius: 4, overflow: "visible", position: "relative" },
  fill:     { position: "absolute", left: 0, top: 0, height: 8, borderRadius: 4, backgroundColor: "#E5E5EA" },
  dot:      { position: "absolute", top: -4, width: 16, height: 16, borderRadius: 8, marginLeft: -8, borderWidth: 3, borderColor: "#FFF" },
  rangeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rangeText:{ fontSize: 10 },
  center:   { fontSize: 14, fontFamily: "Inter_700Bold" },
});

// ──────────────────────────────────────────────────────────────────────────────
// 카드 Wrapper
// ──────────────────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.card, { backgroundColor: c.card }, style]}>
      {children}
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return <Text style={[styles.sTitle, { color: c.textTertiary }]}>{label}</Text>;
}

function ValRow({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.valRow, { borderBottomColor: c.separator }]}>
      <Text style={[styles.valLabel, { color: c.textSecondary }]}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.valValue, { color: color ?? c.text }]}>{value}</Text>
        {sub ? <Text style={[styles.valSub, { color: c.textTertiary }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────
export default function OverheatSection({ ticker, market }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [data, setData]       = useState<OverheatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/stocks/overheating?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [ticker, market]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.tint} />
        <Text style={[styles.hint, { color: c.textSecondary }]}>90일 데이터 분석 중...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={32} color="#F59E0B" />
        <Text style={[styles.hint, { color: c.textSecondary }]}>데이터를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const verdict = getVerdict(data.overheatScore);

  // P/E 방향 색
  const perColor = (data.forwardPer != null && data.trailingPer != null)
    ? (data.forwardPer < data.trailingPer ? "#2DB55D" : "#F04452")
    : c.text;

  const upsideColor = data.analystUpside == null ? c.text
    : data.analystUpside > 10 ? "#2DB55D"
    : data.analystUpside > 0  ? c.text
    : "#F04452";

  return (
    <View style={styles.container}>

      {/* ── ① 종합 과열 지수 ── */}
      <Card>
        <View style={styles.verdictRow}>
          <View style={[styles.iconBadge, { backgroundColor: verdict.color + "22" }]}>
            <Ionicons name={verdict.icon as any} size={22} color={verdict.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.verdictTitle, { color: verdict.color }]}>{verdict.title}</Text>
            <Text style={[styles.verdictSub, { color: c.textSecondary }]}>{verdict.sub}</Text>
          </View>
        </View>
        <View style={styles.scoreBig}>
          <Text style={[styles.scoreNum, { color: verdict.color }]}>{data.overheatScore}</Text>
          <Text style={[styles.scoreDenom, { color: c.textTertiary }]}>/ 100</Text>
        </View>
        <ScoreGauge score={data.overheatScore} />
      </Card>

      {/* ── ② 기술적 지표 ── */}
      <Card>
        <SectionTitle label="기술적 과열 지표" />

        <View style={styles.innerBlock}>
          <Text style={[styles.subLabel, { color: c.textSecondary }]}>RSI-14 (상대강도지수)</Text>
          <RsiBar value={data.rsi14} />
          <View style={styles.rsiHints}>
            <Text style={[styles.hintText, { color: "#0064FF" }]}>과매도 ←</Text>
            <Text style={[styles.hintText, { color: c.textTertiary }]}>적정</Text>
            <Text style={[styles.hintText, { color: "#F04452" }]}>→ 과매수</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: c.separator }]} />

        <View style={styles.innerBlock}>
          <Text style={[styles.subLabel, { color: c.textSecondary }]}>이동평균 이격도</Text>
          <Text style={[styles.hint, { color: c.textTertiary, marginBottom: 10 }]}>
            현재가와 이동평균선의 거리 · +15% 이상이면 단기 과열
          </Text>
          <DisparityBar label="20일 이동평균선" value={data.ma20Disparity} />
          <View style={{ height: 14 }} />
          <DisparityBar label="60일 이동평균선" value={data.ma60Disparity} />
        </View>

        <View style={[styles.divider, { backgroundColor: c.separator }]} />

        {data.position52w != null && (
          <View style={styles.innerBlock}>
            <Text style={[styles.subLabel, { color: c.textSecondary }]}>52주 가격 위치</Text>
            <Text style={[styles.hint, { color: c.textTertiary, marginBottom: 12 }]}>
              1년 고점-저점 사이에서 현재가의 위치
            </Text>
            <Position52wBar
              pct={data.position52w}
              highKRW={data.high52wKRW}
              lowKRW={data.low52wKRW}
            />
          </View>
        )}
      </Card>

      {/* ── ③ 밸류에이션 체크 ── */}
      <Card>
        <SectionTitle label="밸류에이션 체크" />

        {(data.forwardPer != null || data.trailingPer != null) && (
          <ValRow
            label="Forward P/E"
            value={data.forwardPer != null ? data.forwardPer.toFixed(1) + "배" : "—"}
            color={perColor}
            sub={
              data.trailingPer != null
                ? (data.forwardPer != null && data.forwardPer < data.trailingPer
                    ? `▼ Trailing(${data.trailingPer.toFixed(1)}) 대비 낮아짐 — 이익 성장 중`
                    : `▲ Trailing(${(data.trailingPer ?? 0).toFixed(1)}) 대비 높아짐 — 이익 둔화 주의`)
                : undefined
            }
          />
        )}

        {data.analystUpside != null && (
          <ValRow
            label="애널리스트 목표가"
            value={`${data.analystUpside > 0 ? "+" : ""}${data.analystUpside.toFixed(1)}%`}
            color={upsideColor}
            sub={data.targetMeanKRW != null
              ? `목표가 ${data.targetMeanKRW.toLocaleString()}₩`
              : undefined}
          />
        )}

        {data.revenueGrowth != null && (
          <ValRow
            label="매출 성장률 (YoY)"
            value={`${data.revenueGrowth > 0 ? "+" : ""}${data.revenueGrowth.toFixed(1)}%`}
            color={data.revenueGrowth >= 20 ? "#2DB55D" : data.revenueGrowth < 0 ? "#F04452" : c.text}
          />
        )}

        {data.epsGrowth != null && (
          <ValRow
            label="EPS 성장률 (YoY)"
            value={`${data.epsGrowth > 0 ? "+" : ""}${data.epsGrowth.toFixed(1)}%`}
            color={data.epsGrowth >= 20 ? "#2DB55D" : data.epsGrowth < 0 ? "#F04452" : c.text}
          />
        )}

        {/* Forward P/E 해석 박스 */}
        <View style={[styles.interpretBox, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}>
          <Text style={[styles.interpretTitle, { color: c.text }]}>P/E 방향이 핵심</Text>
          <Text style={[styles.interpretBody, { color: c.textSecondary }]}>
            주가가 올라도 이익이 더 빨리 오르면 Forward P/E가 낮아집니다.
            이 경우 '실적 기반 우상향'으로 건강한 상승입니다.{"\n"}
            반대로 주가는 오르는데 이익 전망이 하향되면 거품 신호입니다.
          </Text>
        </View>
      </Card>

      {/* ── ④ 시그널 리스트 ── */}
      {data.signals.length > 0 && (
        <Card>
          <SectionTitle label="주요 진단 포인트" />
          {data.signals.map((s, i) => (
            <View
              key={i}
              style={[
                styles.signalRow,
                i < data.signals.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
              ]}
            >
              <View style={[styles.signalDot, {
                backgroundColor:
                  s.type === "positive" ? "#2DB55D" :
                  s.type === "negative" ? "#F04452" : "#F59E0B",
              }]} />
              <Text style={[styles.signalText, { color: c.text }]}>{s.text}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* ── ⑤ 체크리스트 (매주 확인 사항) ── */}
      <Card>
        <SectionTitle label="매주 체크할 3가지" />
        {[
          { icon: "📊", title: "이익 전망 수정 (Earnings Revision)",    body: "애널리스트들이 EPS 추정치를 올리는지 내리는지 체크. 하향 조정이 시작되면 경보." },
          { icon: "📉", title: "고객사 재고 수준 (Inventory Levels)",   body: "반도체·성장주는 고객 재고 '정상화'라는 단어가 뉴스에 나오면 주문 둔화 신호." },
          { icon: "💰", title: "금리 방향 (10년물 미국채)",              body: "기술·성장주는 금리에 민감. 10년물이 급등하면 아무리 좋은 종목도 매물이 나옴." },
        ].map((item) => (
          <View key={item.title} style={styles.checkItem}>
            <Text style={styles.checkIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkTitle, { color: c.text }]}>{item.title}</Text>
              <Text style={[styles.checkBody, { color: c.textSecondary }]}>{item.body}</Text>
            </View>
          </View>
        ))}
      </Card>

    </View>
  );
}

const styles = StyleSheet.create({
  container:  { paddingBottom: 24 },
  center:     { alignItems: "center", paddingVertical: 60, gap: 12 },
  hint:       { fontSize: 12, textAlign: "center" },

  card: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16, gap: 0,
  },

  sTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6, textTransform: "uppercase",
    marginBottom: 14,
  },

  verdictRow:   { flexDirection: "row", gap: 12, marginBottom: 16, alignItems: "flex-start" },
  iconBadge:    { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  verdictTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  verdictSub:   { fontSize: 12, lineHeight: 18 },
  scoreBig:     { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 14 },
  scoreNum:     { fontSize: 40, fontFamily: "Inter_700Bold" },
  scoreDenom:   { fontSize: 18 },

  innerBlock:   { paddingVertical: 4 },
  subLabel:     { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  divider:      { height: StyleSheet.hairlineWidth, marginVertical: 14 },

  rsiHints:     { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  hintText:     { fontSize: 10 },

  valRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  valLabel:  { fontSize: 14, flex: 1 },
  valValue:  { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "right" },
  valSub:    { fontSize: 11, textAlign: "right", marginTop: 2 },

  interpretBox: { borderRadius: 10, padding: 12, marginTop: 12 },
  interpretTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  interpretBody:  { fontSize: 12, lineHeight: 19 },

  signalRow:   { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, gap: 10 },
  signalDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  signalText:  { fontSize: 13, flex: 1, lineHeight: 20 },

  checkItem:  { flexDirection: "row", gap: 12, paddingVertical: 12, alignItems: "flex-start" },
  checkIcon:  { fontSize: 20, marginTop: 1 },
  checkTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  checkBody:  { fontSize: 12, lineHeight: 18 },
});
