import React, { useState } from "react";
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export interface TechnicalSummary {
  rsi14:        number | null;
  rsiSignal:    "과매도" | "적정" | "과매수" | null;
  ma20:         number | null;
  ma60:         number | null;
  ma20Dev:      number | null;
  ma60Dev:      number | null;
  maAlignment:  "정배열" | "역배열" | "혼재" | null;
  volumeSpike:  number | null;
}

interface Props {
  data: TechnicalSummary;
}

function DevBar({ pct, color }: { pct: number; color: string }) {
  const clamp = Math.max(-50, Math.min(50, pct));
  const isPos = clamp >= 0;
  return (
    <View style={bar.track}>
      <View style={bar.center} />
      <View
        style={[
          bar.fill,
          isPos
            ? { left: "50%", width: `${clamp}%`, backgroundColor: color }
            : { right: "50%", width: `${-clamp}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

export default function TechnicalSection({ data }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [open, setOpen] = useState(true);

  const { rsi14, rsiSignal, ma20Dev, ma60Dev, maAlignment, volumeSpike } = data;

  const rsiColor =
    rsiSignal === "과매수" ? "#F04452" :
    rsiSignal === "과매도" ? "#1B63E8" : "#F59E0B";

  const alignColor =
    maAlignment === "정배열" ? "#2DB55D" :
    maAlignment === "역배열" ? "#F04452" : "#F59E0B";

  const volColor =
    volumeSpike == null ? c.textTertiary :
    volumeSpike >= 3    ? "#F04452" :
    volumeSpike >= 1.8  ? "#FF6B00" : c.textTertiary;

  const devColor = (v: number | null) =>
    v == null ? c.textTertiary : v > 0 ? "#F04452" : "#1B63E8";

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse" size={15} color={c.tint} />
          <Text style={[styles.title, { color: c.text }]}>기술적 지표</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={c.textTertiary} />
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>

          {/* ── RSI14 게이지 ─────────────────────────── */}
          {rsi14 != null && (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={[styles.label, { color: c.textSecondary }]}>RSI 14</Text>
                <Text style={[styles.hint, { color: c.textTertiary }]}>상대강도지수</Text>
              </View>
              <View style={styles.rowRight}>
                <View style={rsi.track}>
                  {/* 과매도 영역 (0-30) */}
                  <View style={[rsi.zone, { left: 0, width: "30%", backgroundColor: "#1B63E818" }]} />
                  {/* 과매수 영역 (70-100) */}
                  <View style={[rsi.zone, { right: 0, width: "30%", backgroundColor: "#F0445218" }]} />
                  {/* 마커 */}
                  <View style={[rsi.marker, { left: `${rsi14}%` as any, backgroundColor: rsiColor }]} />
                </View>
                <View style={styles.rsiLabels}>
                  <Text style={[styles.hint, { color: "#1B63E8" }]}>과매도 30</Text>
                  <Text style={[styles.valueText, { color: rsiColor }]}>{rsi14}</Text>
                  <Text style={[styles.hint, { color: "#F04452" }]}>70 과매수</Text>
                </View>
                {rsiSignal && rsiSignal !== "적정" && (
                  <View style={[styles.signalBadge, { backgroundColor: rsiColor + "18" }]}>
                    <Text style={[styles.signalText, { color: rsiColor }]}>
                      {rsiSignal === "과매도" ? "⚡ 반등 대기" : "⚠ 과열 주의"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: c.separator }]} />

          {/* ── MA20 괴리율 ──────────────────────────── */}
          {ma20Dev != null && (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={[styles.label, { color: c.textSecondary }]}>MA20 괴리율</Text>
                <Text style={[styles.hint, { color: c.textTertiary }]}>20일 이동평균 대비</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.valueText, { color: devColor(ma20Dev) }]}>
                  {ma20Dev >= 0 ? "+" : ""}{ma20Dev}%
                </Text>
                <DevBar pct={ma20Dev} color={devColor(ma20Dev)} />
                <Text style={[styles.hint, { color: c.textTertiary }]}>
                  {ma20Dev > 10 ? "단기 과열" : ma20Dev < -10 ? "단기 낙폭 과대" : "정상 범위"}
                </Text>
              </View>
            </View>
          )}

          {ma60Dev != null && (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={[styles.label, { color: c.textSecondary }]}>MA60 괴리율</Text>
                <Text style={[styles.hint, { color: c.textTertiary }]}>60일 이동평균 대비</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.valueText, { color: devColor(ma60Dev) }]}>
                  {ma60Dev >= 0 ? "+" : ""}{ma60Dev}%
                </Text>
                <DevBar pct={ma60Dev} color={devColor(ma60Dev)} />
                <Text style={[styles.hint, { color: c.textTertiary }]}>
                  {ma60Dev > 20 ? "중기 과열" : ma60Dev < -20 ? "중기 낙폭 과대" : "정상 범위"}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: c.separator }]} />

          {/* ── MA 배열 + 거래량 배율 ────────────────── */}
          <View style={styles.chipRow}>
            {maAlignment && (
              <View style={[styles.chip, { backgroundColor: alignColor + "18" }]}>
                <Ionicons
                  name={maAlignment === "정배열" ? "trending-up" : maAlignment === "역배열" ? "trending-down" : "remove"}
                  size={11}
                  color={alignColor}
                />
                <Text style={[styles.chipText, { color: alignColor }]}>
                  MA {maAlignment}
                </Text>
              </View>
            )}
            {volumeSpike != null && (
              <View style={[styles.chip, {
                backgroundColor: volumeSpike >= 1.8 ? volColor + "18" : c.backgroundTertiary,
              }]}>
                <Ionicons name="bar-chart" size={11} color={volColor} />
                <Text style={[styles.chipText, { color: volColor }]}>
                  거래량 {volumeSpike.toFixed(1)}배
                  {volumeSpike >= 3 ? " 🔥" : volumeSpike >= 1.8 ? " ↑" : ""}
                </Text>
              </View>
            )}
          </View>

          {/* ── 해석 요약 ───────────────────────────── */}
          {(rsi14 != null || maAlignment != null || volumeSpike != null) && (
            <View style={[styles.interpretation, { backgroundColor: c.backgroundSecondary }]}>
              <Text style={[styles.interpretText, { color: c.textSecondary }]}>
                {[
                  rsiSignal === "과매도" && "RSI 과매도 구간 — 반등 탄력 기대.",
                  rsiSignal === "과매수" && "RSI 과매수 — 단기 차익실현 압력 주의.",
                  ma20Dev != null && ma20Dev < -10 && "MA20 대비 낙폭 과대 — 기술적 반등 가능.",
                  ma20Dev != null && ma20Dev > 15  && "MA20 대비 급등 — 단기 조정 가능.",
                  volumeSpike != null && volumeSpike >= 3 && "거래량 폭증 — 세력 개입 또는 뉴스 모멘텀.",
                  volumeSpike != null && volumeSpike >= 1.8 && volumeSpike < 3 && "거래량 증가 — 추세 전환 신호 확인 중.",
                  maAlignment === "정배열" && "MA 정배열 — 상승 추세 유지.",
                  maAlignment === "역배열" && "MA 역배열 — 하락 추세 주의.",
                ].filter(Boolean).join("  ") || "기술 지표 이상 없음."}
              </Text>
            </View>
          )}

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { borderRadius: 16, marginHorizontal: 16, marginBottom: 12, overflow: "hidden" },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  body:    { paddingBottom: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginVertical: 4 },
  row:     { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  rowLeft: { flex: 1, gap: 2 },
  rowRight:{ flex: 1.4, gap: 6 },
  label:   { fontSize: 13, fontFamily: "Inter_500Medium" },
  hint:    { fontSize: 10, fontFamily: "Inter_400Regular" },
  valueText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  rsiLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  signalBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  signalText:  { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8, paddingTop: 6 },
  chip:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  chipText:{ fontSize: 11, fontFamily: "Inter_500Medium" },
  interpretation: { marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 10 },
  interpretText:  { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});

const rsi = StyleSheet.create({
  track:  { height: 8, borderRadius: 4, backgroundColor: "#88888820", overflow: "hidden", position: "relative" },
  zone:   { position: "absolute", top: 0, bottom: 0 },
  marker: { position: "absolute", top: -3, width: 14, height: 14, borderRadius: 7, marginLeft: -7, borderWidth: 2, borderColor: "#fff" },
});

const bar = StyleSheet.create({
  track:  { height: 6, borderRadius: 3, backgroundColor: "#88888820", overflow: "hidden", position: "relative", flexDirection: "row" },
  center: { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: "#88888860" },
  fill:   { position: "absolute", top: 0, bottom: 0, borderRadius: 3 },
});
