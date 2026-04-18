import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { HealthCheck, Issue } from "@/types/portfolio";

const SEVERITY_COLOR: Record<Issue["severity"], string> = {
  CRITICAL: "#F04452",
  WARN:     "#F59E0B",
  INFO:     "#3478F6",
};

const SEVERITY_ICON: Record<Issue["severity"], React.ComponentProps<typeof Ionicons>["name"]> = {
  CRITICAL: "alert-circle",
  WARN:     "warning",
  INFO:     "information-circle",
};

function scoreColor(score: number): string {
  if (score >= 80) return "#22C55E";
  if (score >= 60) return "#F59E0B";
  return "#F04452";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "매우 양호";
  if (score >= 75) return "양호";
  if (score >= 60) return "주의";
  if (score >= 40) return "위험";
  return "긴급 점검";
}

interface Props {
  health: HealthCheck;
}

export default function HealthScoreCard({ health }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const color = scoreColor(health.healthScore);

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.scoreRow}>
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreLabel, { color: c.textSecondary }]}>포트폴리오 헬스</Text>
          <Text style={[styles.scoreValue, { color }]}>{health.healthScore}</Text>
          <Text style={[styles.scoreHint, { color }]}>{scoreLabel(health.healthScore)}</Text>
        </View>
        <View style={styles.summaryCol}>
          {health.recommendations.slice(0, 2).map((r, i) => (
            <Text key={i} style={[styles.recText, { color: c.text }]}>· {r}</Text>
          ))}
        </View>
      </View>

      {health.issues.length > 0 && (
        <View style={styles.issues}>
          <Text style={[styles.issuesTitle, { color: c.textSecondary }]}>
            이슈 {health.issues.length}건
          </Text>
          {health.issues.slice(0, 5).map((issue, i) => (
            <View key={i} style={styles.issueRow}>
              <Ionicons
                name={SEVERITY_ICON[issue.severity]}
                size={14}
                color={SEVERITY_COLOR[issue.severity]}
              />
              <Text style={[styles.issueText, { color: c.text }]} numberOfLines={2}>
                {issue.message}
                {issue.suggestedAction ? ` → ${issue.suggestedAction}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:         { borderRadius: 14, padding: 16, gap: 14 },
  scoreRow:     { flexDirection: "row", gap: 16, alignItems: "center" },
  scoreCol:     { alignItems: "center", minWidth: 92 },
  scoreLabel:   { fontSize: 11, fontFamily: "Inter_500Medium" },
  scoreValue:   { fontSize: 36, fontFamily: "Inter_700Bold", lineHeight: 42 },
  scoreHint:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  summaryCol:   { flex: 1, gap: 4 },
  recText:      { fontSize: 12, lineHeight: 17 },
  issues:       { gap: 6 },
  issuesTitle:  { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3, textTransform: "uppercase" },
  issueRow:     { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  issueText:    { fontSize: 12, lineHeight: 16, flex: 1 },
});
