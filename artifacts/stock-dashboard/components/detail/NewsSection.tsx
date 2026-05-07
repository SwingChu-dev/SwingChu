import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

import { API_BASE } from "@/utils/apiBase";

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: number | null;
  sentiment: "호재" | "악재" | "중립";
}

const SENTIMENT_CONFIG = {
  호재: { color: "#F04452", bg: "rgba(240,68,82,0.12)", icon: "trending-up" as const },
  악재: { color: "#1B63E8", bg: "rgba(27,99,232,0.12)", icon: "trending-down" as const },
  중립: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: "remove-outline" as const },
};

const TOP_N = 3;

function timeAgo(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  if (d < 7) return `${d}일 전`;
  return `${Math.floor(d / 7)}주 전`;
}

/** 시장에 맞는 외부 뉴스 페이지 URL — 자세한 뉴스는 외부에 위임. */
function externalNewsUrl(ticker: string, market: string): { url: string; label: string } {
  const t = ticker.toUpperCase();
  if (market === "KOSPI" || market === "KOSDAQ") {
    return {
      url:   `https://m.stock.naver.com/domestic/stock/${t}/news`,
      label: "네이버 증권에서 더 보기",
    };
  }
  // NASDAQ·NYSE 등 미국주식
  return {
    url:   `https://finance.yahoo.com/quote/${t}/news`,
    label: "Yahoo Finance에서 더 보기",
  };
}

interface Props {
  ticker: string;
  market: string;
  name: string;
}

export default function NewsSection({ ticker, market, name }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    globalThis
      .fetch(`${API_BASE}/stocks/news?ticker=${encodeURIComponent(ticker)}&market=${market}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((d) => {
        setNews(d.news ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [ticker, market]);

  const sentimentCounts = news.reduce(
    (acc, n) => { acc[n.sentiment]++; return acc; },
    { 호재: 0, 악재: 0, 중립: 0 } as Record<string, number>,
  );

  const overallSentiment =
    sentimentCounts.호재 > sentimentCounts.악재
      ? "호재 우세"
      : sentimentCounts.악재 > sentimentCounts.호재
      ? "악재 우세"
      : "중립";

  const overallColor =
    sentimentCounts.호재 > sentimentCounts.악재
      ? "#F04452"
      : sentimentCounts.악재 > sentimentCounts.호재
      ? "#1B63E8"
      : "#F59E0B";

  const ext = externalNewsUrl(ticker, market);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.tint} />
        <Text style={[styles.loadingText, { color: c.textSecondary }]}>
          {name} 뉴스 불러오는 중...
        </Text>
      </View>
    );
  }

  if (error || news.length === 0) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.center}>
          <Ionicons name="newspaper-outline" size={36} color={c.textSecondary} />
          <Text style={[styles.errorText, { color: c.textSecondary }]}>
            {error ? "뉴스를 불러올 수 없습니다." : "관련 뉴스가 없습니다."}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.externalBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
          onPress={() => Linking.openURL(ext.url)}
          activeOpacity={0.75}
        >
          <Ionicons name="open-outline" size={15} color={c.tint} />
          <Text style={[styles.externalBtnText, { color: c.tint }]}>{ext.label}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const top = news.slice(0, TOP_N);
  const more = news.length - top.length;

  return (
    <View style={styles.wrapper}>
      {/* 감성 요약 — 핵심만 */}
      <View style={[styles.summaryCard, { backgroundColor: isDark ? "#141B2D" : "#F0F4FF" }]}>
        <View style={styles.summaryHeader}>
          <Ionicons name="analytics-outline" size={18} color="#0064FF" />
          <Text style={[styles.summaryTitle, { color: c.text }]}>AI 뉴스 요약</Text>
          <View style={[styles.overallBadge, { backgroundColor: overallColor + "22" }]}>
            <Text style={[styles.overallText, { color: overallColor }]}>{overallSentiment}</Text>
          </View>
        </View>
        <View style={styles.sentimentRow}>
          {(["호재", "중립", "악재"] as const).map((s) => {
            const cfg = SENTIMENT_CONFIG[s];
            return (
              <View key={s} style={[styles.sentimentBox, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                <Text style={[styles.sentimentCount, { color: cfg.color }]}>
                  {sentimentCounts[s]}
                </Text>
                <Text style={[styles.sentimentLabel, { color: cfg.color }]}>{s}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 핵심 헤드라인 — 최근 3건만 */}
      {top.map((item, i) => {
        const cfg = SENTIMENT_CONFIG[item.sentiment];
        return (
          <TouchableOpacity
            key={i}
            style={[styles.newsCard, { backgroundColor: c.card }]}
            onPress={() => item.link && Linking.openURL(item.link)}
            activeOpacity={0.75}
          >
            <View style={styles.newsTop}>
              <View style={[styles.sentimentBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                <Text style={[styles.badgeText, { color: cfg.color }]}>{item.sentiment}</Text>
              </View>
              <Text style={[styles.publisher, { color: c.textSecondary }]} numberOfLines={1}>
                {item.publisher}
              </Text>
              <Text style={[styles.timeAgo, { color: c.textTertiary }]}>
                {timeAgo(item.publishedAt)}
              </Text>
            </View>
            <Text style={[styles.newsTitle, { color: c.text }]} numberOfLines={2}>
              {item.title}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* 외부 링크 — 자세히는 외부에서 */}
      <TouchableOpacity
        style={[styles.externalBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        onPress={() => Linking.openURL(ext.url)}
        activeOpacity={0.75}
      >
        <Ionicons name="open-outline" size={15} color={c.tint} />
        <Text style={[styles.externalBtnText, { color: c.tint }]}>
          {more > 0 ? `+${more}건 — ${ext.label}` : ext.label}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.note, { color: c.textTertiary }]}>
        개별 뉴스 분석은 깊이 있는 투자 판단의 단일 근거가 될 수 없습니다.
        헤드라인 흐름·감성 추이만 참고로 활용하세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:         { padding: 16, gap: 10 },
  center:          { paddingVertical: 32, alignItems: "center", gap: 10 },
  loadingText:     { fontSize: 14 },
  errorText:       { fontSize: 14 },

  summaryCard:     { borderRadius: 14, padding: 16, gap: 12 },
  summaryHeader:   { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryTitle:    { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  overallBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  overallText:     { fontSize: 12, fontFamily: "Inter_700Bold" },

  sentimentRow:    { flexDirection: "row", gap: 8 },
  sentimentBox:    { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", gap: 2 },
  sentimentCount:  { fontSize: 20, fontFamily: "Inter_700Bold" },
  sentimentLabel:  { fontSize: 11, fontFamily: "Inter_500Medium" },

  newsCard:        { borderRadius: 14, padding: 14, gap: 8 },
  newsTop:         { flexDirection: "row", alignItems: "center", gap: 6 },
  sentimentBadge:  { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:       { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  publisher:       { fontSize: 12, flex: 1 },
  timeAgo:         { fontSize: 11 },
  newsTitle:       { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },

  externalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  externalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  note: { fontSize: 11, lineHeight: 16, paddingHorizontal: 4, marginTop: 4 },
});
