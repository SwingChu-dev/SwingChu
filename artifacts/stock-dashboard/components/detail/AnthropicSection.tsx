import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getAnthropicLink, AnthropicLevel, AnthropicRelation } from "@/constants/anthropicData";

const LEVEL_COLOR: Record<AnthropicLevel, string> = {
  높음: "#A855F7",   // AI 액센트 보라
  중간: "#F59E0B",
  낮음: "#3B82F6",
  없음: "#6B7280",
};

const LEVEL_BG: Record<AnthropicLevel, string> = {
  높음: "#A855F718",
  중간: "#F59E0B18",
  낮음: "#3B82F618",
  없음: "#6B728018",
};

const RELATION_LABEL: Record<AnthropicRelation, string> = {
  INVESTOR:        "투자자",
  MAJOR_CUSTOMER:  "핵심 고객",
  COMPUTE_PARTNER: "컴퓨트·전력 파트너",
  COMPETITOR:      "경쟁사",
  INDIRECT:        "간접 수혜",
  NONE:            "노출 없음",
};

const RELATION_ICON: Record<AnthropicRelation, "rocket" | "person" | "flash" | "swap-horizontal" | "git-network" | "remove-circle"> = {
  INVESTOR:        "rocket",
  MAJOR_CUSTOMER:  "person",
  COMPUTE_PARTNER: "flash",
  COMPETITOR:      "swap-horizontal",
  INDIRECT:        "git-network",
  NONE:            "remove-circle",
};

interface Props {
  stockId: string;
}

export default function AnthropicSection({ stockId }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const data = getAnthropicLink(stockId);

  const color = LEVEL_COLOR[data.level];
  const bg    = LEVEL_BG[data.level];
  const icon  = RELATION_ICON[data.type];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* 관계 레벨 헤더 */}
      <View style={[styles.levelCard, { backgroundColor: bg, borderColor: color + "40" }]}>
        <Ionicons name={icon} size={26} color={color} />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.levelRow}>
            <Text style={[styles.levelLabel, { color: c.textSecondary }]}>
              Anthropic 관계 · {RELATION_LABEL[data.type]}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: color }]}>
              <Text style={styles.levelBadgeText}>{data.level}</Text>
            </View>
          </View>
          <Text style={[styles.description, { color: c.text }]}>{data.description}</Text>
        </View>
      </View>

      {/* 노출도 게이지 */}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>노출 강도</Text>
        <View style={styles.gauge}>
          {(["없음", "낮음", "중간", "높음"] as AnthropicLevel[]).map((lvl) => {
            const active = lvl === data.level;
            return (
              <View key={lvl} style={styles.gaugeItem}>
                <View
                  style={[
                    styles.gaugeBar,
                    { backgroundColor: active ? LEVEL_COLOR[lvl] : isDark ? "#333" : "#E5E7EB" },
                  ]}
                />
                <Text
                  style={[
                    styles.gaugeLabel,
                    { color: active ? LEVEL_COLOR[lvl] : c.textTertiary },
                    active && { fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {lvl}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 세부 내용 */}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>세부 내용</Text>
        {data.details.map((d, i) => (
          <View key={i} style={styles.detailRow}>
            <View style={[styles.bullet, { backgroundColor: color }]} />
            <Text style={[styles.detailText, { color: c.text }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* 스윙 트레이딩 관점 */}
      <View style={[styles.swingCard, { backgroundColor: color + "12", borderColor: color + "30" }]}>
        <View style={styles.swingHeader}>
          <Ionicons name="trending-up" size={15} color={color} />
          <Text style={[styles.swingTitle, { color }]}>스윙 트레이딩 관점</Text>
        </View>
        <Text style={[styles.swingText, { color: c.text }]}>{data.swingNote}</Text>
      </View>

      <Text style={[styles.disclaimer, { color: c.textTertiary }]}>
        * 공개 자료 기반 큐레이션 (2026-05). 투자 판단의 유일한 근거로 삼지 마세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  levelCard:  {
    borderRadius: 14,
    borderWidth:  1,
    padding:      16,
    flexDirection:"row",
    alignItems:   "flex-start",
    gap:          12,
  },
  levelRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  levelLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  levelBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  description:{ fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },

  card:       { borderRadius: 14, padding: 16, gap: 10 },
  sectionTitle:{ fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase" },

  gauge:      { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  gaugeItem:  { flex: 1, alignItems: "center", gap: 6 },
  gaugeBar:   { width: "100%", height: 6, borderRadius: 3 },
  gaugeLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

  detailRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet:     { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  detailText: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },

  swingCard:  { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  swingHeader:{ flexDirection: "row", alignItems: "center", gap: 6 },
  swingTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  swingText:  { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },

  disclaimer: { fontSize: 10, textAlign: "center", lineHeight: 16 },
});
