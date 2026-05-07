import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { API_BASE } from "@/utils/apiBase";
import { detectPatterns, type OHLCBar, type DetectedPattern, type PatternKind } from "@/services/patternDetection";
import { analyzePattern } from "@/services/stockPattern";
import { useAiQuota } from "@/hooks/useAiQuota";

interface Props {
  ticker: string;
  market: string;
  name?:  string;
}

const KIND_ICON: Record<PatternKind, "swap-horizontal" | "trending-down" | "trending-up" | "arrow-up-circle" | "arrow-down-circle" | "ellipse-outline" | "shapes"> = {
  박스권:           "shapes",
  눌림목:           "arrow-down-circle",
  상승추세:         "trending-up",
  하락추세:         "trending-down",
  추세전환_강세:    "arrow-up-circle",
  추세전환_약세:    "arrow-down-circle",
  혼조:             "ellipse-outline",
};

const KIND_COLOR_KEY: Record<PatternKind, "positive" | "negative" | "warning" | "muted"> = {
  박스권:           "warning",
  눌림목:           "warning",
  상승추세:         "positive",
  하락추세:         "negative",
  추세전환_강세:    "positive",
  추세전환_약세:    "negative",
  혼조:             "muted",
};

export default function PatternCard({ ticker, market, name }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const quota = useAiQuota("pattern");

  const [bars, setBars]         = useState<OHLCBar[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [aiText, setAiText]     = useState<string | null>(null);
  const [aiLoading, setAiLoad]  = useState(false);
  const [aiError, setAiError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/stocks/history?ticker=${encodeURIComponent(ticker)}&market=${encodeURIComponent(market)}&period=6mo`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const rows: OHLCBar[] = Array.isArray(data?.data) ? data.data : [];
        setBars(rows);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker, market]);

  const patterns: DetectedPattern[] = bars ? detectPatterns(bars) : [];
  const top = patterns[0];

  const onAskAi = async () => {
    if (!bars || patterns.length === 0) return;
    const allowed = await quota.consume();
    if (!allowed) {
      setAiError(`오늘 ${quota.label} ${quota.limit}회 한도에 도달했습니다.`);
      return;
    }
    setAiLoad(true);
    setAiError(null);
    try {
      const closes = bars.map((b) => b.close);
      const lastClose = closes[closes.length - 1];
      const sma = (n: number) =>
        closes.length >= n ? closes.slice(-n).reduce((a, b) => a + b, 0) / n : undefined;
      const recent20High = bars.length >= 20 ? Math.max(...bars.slice(-20).map((b) => b.high)) : undefined;
      const recent20Low  = bars.length >= 20 ? Math.min(...bars.slice(-20).map((b) => b.low))  : undefined;

      const analysis = await analyzePattern({
        ticker, market, name,
        patterns,
        lastClose,
        ma5:  sma(5),
        ma20: sma(20),
        ma60: sma(60),
        recent20High,
        recent20Low,
      });
      setAiText(analysis);
    } catch (e: any) {
      setAiError(e?.message ?? "AI 분석 실패");
    } finally {
      setAiLoad(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <ActivityIndicator size="small" color={c.aiAccent} />
      </View>
    );
  }
  if (!bars || bars.length < 60) {
    return null; // 봉 부족 시 카드 자체 안 노출
  }

  const accent = c.aiAccent;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: accent + "40" }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={14} color={accent} />
        <Text style={[styles.headerLabel, { color: accent }]}>차트 패턴</Text>
        <Text style={[styles.headerHint, { color: c.textTertiary }]}>규칙 기반 + AI</Text>
      </View>

      {patterns.map((p, i) => {
        const kindColor =
          KIND_COLOR_KEY[p.kind] === "positive" ? "#F04452" :
          KIND_COLOR_KEY[p.kind] === "negative" ? "#1B63E8" :
          KIND_COLOR_KEY[p.kind] === "warning"  ? "#F59E0B" :
                                                  c.textSecondary;
        const isFirst = i === 0;
        return (
          <View
            key={`${p.kind}-${i}`}
            style={[
              styles.row,
              !isFirst && { borderTopColor: c.separator, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
            ]}
          >
            <Ionicons
              name={KIND_ICON[p.kind]}
              size={18}
              color={kindColor}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.kindRow}>
                <Text style={[styles.kindText, { color: c.text }]}>{p.kind.replace("_", " ")}</Text>
                <View style={[styles.confChip, { backgroundColor: kindColor + "22" }]}>
                  <Text style={[styles.confText, { color: kindColor }]}>{p.confidence}</Text>
                </View>
              </View>
              <Text style={[styles.detailText, { color: c.textSecondary }]}>{p.detail}</Text>
              <Text style={[styles.evidenceText, { color: c.textTertiary }]}>📊 {p.evidence}</Text>
            </View>
          </View>
        );
      })}

      {aiText && (
        <View style={[styles.aiBlock, { backgroundColor: c.aiGlow, borderColor: accent + "55" }]}>
          <View style={styles.aiHeader}>
            <Ionicons name="sparkles" size={12} color={accent} />
            <Text style={[styles.aiLabel, { color: accent }]}>AI 자세히</Text>
          </View>
          <Text style={[styles.aiText, { color: c.text }]}>{aiText}</Text>
        </View>
      )}

      {aiError && (
        <Text style={[styles.errorText, { color: "#F04452" }]}>{aiError}</Text>
      )}

      {!aiText && top && (
        <TouchableOpacity
          style={[styles.aiBtn, { backgroundColor: accent + "18", borderColor: accent + "55" }]}
          onPress={onAskAi}
          disabled={aiLoading}
          activeOpacity={0.75}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color={accent} />
              <Text style={[styles.aiBtnText, { color: accent }]}>
                AI 자세히 ({quota.remaining}/{quota.limit})
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  headerHint:  { fontSize: 10, fontFamily: "Inter_400Regular", marginLeft: "auto" },

  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  kindRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  kindText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  confChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  confText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  detailText:   { fontSize: 12, lineHeight: 17 },
  evidenceText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  aiBlock: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6, marginTop: 4 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  aiLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  aiText: { fontSize: 13, lineHeight: 19 },

  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  aiBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  errorText: { fontSize: 11, marginTop: 4 },
});
